import { NextRequest, NextResponse } from "next/server";
import { db, visits, spots, activities } from "@seichi/db";
import { eq, desc, and, lt, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import {
  checkVisitAchievements,
  checkPrefectureAchievements,
} from "@/lib/achievements";
import { buildPrivacyFilter, getFollowingIds } from "@/lib/privacy";
import { updateAnimeProgressForUser } from "@/lib/pilgrimage-progress";
import { notifyFollowersOfActivity } from "@/lib/notifications-extended";
import { invalidateLeaderboardCache } from "@/lib/leaderboard";

export async function GET(req: NextRequest) {
  const session = await auth();
  const viewerId = session?.user?.id;
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId && !viewerId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const targetUserId = userId ?? viewerId!;
  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = Math.min(
    Number(req.nextUrl.searchParams.get("limit") ?? 20),
    50
  );
  const followingIds = viewerId ? [...(await getFollowingIds(viewerId))] : [];

  const conditions = [
    eq(visits.userId, targetUserId),
    buildPrivacyFilter(visits.privacy, visits.userId, viewerId, followingIds),
  ];
  if (cursor) conditions.push(lt(visits.visitedAt, new Date(cursor)));

  const results = await db
    .select({ visit: visits, spot: spots })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .where(and(...conditions))
    .orderBy(desc(visits.visitedAt))
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const items = results.slice(0, limit);
  const last = items[items.length - 1];

  return NextResponse.json({
    items,
    nextCursor:
      hasMore && last ? last.visit.visitedAt.toISOString() : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const [visit] = await db
    .insert(visits)
    .values({
      userId: session.user.id,
      spotId: body.spotId,
      visitedAt: new Date(body.visitedAt ?? Date.now()),
      rating: body.rating,
      notes: body.notes,
      companions: body.companions,
      privacy: body.privacy ?? "public",
    })
    .returning();

  await db
    .update(spots)
    .set({ visitCount: sql`${spots.visitCount} + 1` })
    .where(eq(spots.id, body.spotId));

  const [visitCountRow] = await db
    .select({ count: count() })
    .from(visits)
    .where(eq(visits.userId, session.user.id));

  const [prefectureCountRow] = await db
    .select({
      count: sql<number>`count(distinct ${spots.prefecture})`,
    })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .where(eq(visits.userId, session.user.id));

  await checkVisitAchievements(session.user.id, Number(visitCountRow?.count ?? 0));
  await checkPrefectureAchievements(
    session.user.id,
    Number(prefectureCountRow?.count ?? 0)
  );
  await updateAnimeProgressForUser(session.user.id, body.spotId);

  await db.insert(activities).values({
    userId: session.user.id,
    type: "visit",
    targetId: visit.id,
    metadata: { spotId: body.spotId },
  });

  if ((body.privacy ?? "public") === "public") {
    const [spot] = await db
      .select({ nameZh: spots.nameZh })
      .from(spots)
      .where(eq(spots.id, body.spotId))
      .limit(1);

    await notifyFollowersOfActivity({
      actorId: session.user.id,
      type: "visit",
      title: "追蹤對象打卡了",
      body: spot?.nameZh ?? "聖地",
      link: `/visits/${visit.id}`,
    });
  }

  await invalidateLeaderboardCache();

  return NextResponse.json(visit, { status: 201 });
}
