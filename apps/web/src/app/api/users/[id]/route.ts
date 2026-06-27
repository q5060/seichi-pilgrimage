import { NextRequest, NextResponse } from "next/server";
import { db, users, visits, spots, travelogues, photos, userAchievements, userAnimeStatus, anime } from "@seichi/db";
import { eq, count, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getUserAchievements, computeWrappedStats } from "@/lib/achievements";
import { triggerUserIndexing } from "@/lib/indexing";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  let userId = id;
  if (id === "me") {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }
    userId = session.user.id;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return NextResponse.json({ error: "找不到使用者" }, { status: 404 });

  const visitStats = await db
    .select({
      count: count(),
      prefectures: sql<number>`count(distinct ${spots.prefecture})`,
    })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .where(eq(visits.userId, userId));

  const travelogueCount = await db
    .select({ count: count() })
    .from(travelogues)
    .where(eq(travelogues.userId, userId));

  const photoCount = await db
    .select({ count: count() })
    .from(photos)
    .where(eq(photos.userId, userId));

  const achievements = await getUserAchievements(userId);

  const animeStatuses = await db
    .select({ status: userAnimeStatus, anime: anime })
    .from(userAnimeStatus)
    .innerJoin(anime, eq(userAnimeStatus.anilistId, anime.anilistId))
    .where(eq(userAnimeStatus.userId, userId));

  const prefectureList = await db
    .select({ prefecture: spots.prefecture })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .where(eq(visits.userId, userId))
    .groupBy(spots.prefecture);

  const year = req.nextUrl.searchParams.get("wrapped");
  let wrapped = null;
  if (year) {
    wrapped = await computeWrappedStats(userId, Number(year));
  }

  return NextResponse.json({
    user,
    stats: {
      visitCount: visitStats[0]?.count ?? 0,
      prefectureCount: visitStats[0]?.prefectures ?? 0,
      travelogueCount: travelogueCount[0]?.count ?? 0,
      photoCount: photoCount[0]?.count ?? 0,
    },
    achievements,
    animeStatuses,
    visitedPrefectures: prefectureList.map((p) => p.prefecture),
    wrapped,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (body.name !== undefined) updates.name = body.name;
  if (body.username !== undefined) updates.username = body.username;
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.defaultPrivacy !== undefined) updates.defaultPrivacy = body.defaultPrivacy;
  if (body.showOnLeaderboard !== undefined) updates.showOnLeaderboard = body.showOnLeaderboard;
  if (body.image !== undefined) updates.image = body.image;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning();

  triggerUserIndexing(updated.id);

  return NextResponse.json(updated);
}
