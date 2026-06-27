import { NextRequest, NextResponse } from "next/server";
import {
  db,
  userFollows,
  likes,
  bookmarks,
  comments,
  activities,
  animeFollows,
  regionFollows,
  visits,
  travelogues,
  photos,
  users,
  spots,
  locationReports,
  routes,
  lists,
} from "@seichi/db";
import { eq, desc, and, inArray, count, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import type { ActivityType, ReactionTarget } from "@seichi/shared";

type FeedPreview = {
  title: string;
  thumbnail?: string | null;
  link: string;
  subtitle?: string;
};

async function resolveTargetPreviews(
  items: { type: ActivityType; targetId: string; metadata?: Record<string, unknown> | null }[]
): Promise<Map<string, FeedPreview>> {
  const previews = new Map<string, FeedPreview>();
  const key = (type: string, id: string) => `${type}:${id}`;

  const byType = new Map<string, string[]>();
  for (const item of items) {
    const ids = byType.get(item.type) ?? [];
    ids.push(item.targetId);
    byType.set(item.type, ids);
  }

  const visitIds = byType.get("visit") ?? [];
  if (visitIds.length) {
    const rows = await db
      .select({ visit: visits, spot: spots })
      .from(visits)
      .innerJoin(spots, eq(visits.spotId, spots.id))
      .where(inArray(visits.id, visitIds));
    for (const { visit, spot } of rows) {
      previews.set(key("visit", visit.id), {
        title: spot.nameZh,
        link: `/spots/${spot.id}`,
        subtitle: spot.prefecture,
      });
    }
  }

  const travelogueIds = byType.get("travelogue") ?? [];
  if (travelogueIds.length) {
    const rows = await db
      .select()
      .from(travelogues)
      .where(inArray(travelogues.id, travelogueIds));
    for (const t of rows) {
      previews.set(key("travelogue", t.id), {
        title: t.title,
        thumbnail: t.coverImageUrl,
        link: `/travelogue/${t.slug}`,
      });
    }
  }

  const photoIds = byType.get("photo") ?? [];
  if (photoIds.length) {
    const rows = await db.select().from(photos).where(inArray(photos.id, photoIds));
    for (const p of rows) {
      previews.set(key("photo", p.id), {
        title: p.caption ?? "照片",
        thumbnail: p.thumbnailUrl ?? p.url,
        link: p.spotId ? `/spots/${p.spotId}` : `/users/${p.userId}`,
      });
    }
  }

  const reportIds = byType.get("location_report") ?? [];
  if (reportIds.length) {
    const rows = await db
      .select({ report: locationReports, spot: spots })
      .from(locationReports)
      .innerJoin(spots, eq(locationReports.spotId, spots.id))
      .where(inArray(locationReports.id, reportIds));
    for (const { report, spot } of rows) {
      previews.set(key("location_report", report.id), {
        title: spot.nameZh,
        link: `/spots/${spot.id}`,
        subtitle: "現況回報",
      });
    }
  }

  const followIds = byType.get("follow") ?? [];
  if (followIds.length) {
    const rows = await db.select().from(users).where(inArray(users.id, followIds));
    for (const u of rows) {
      previews.set(key("follow", u.id), {
        title: u.name ?? "使用者",
        thumbnail: u.image,
        link: `/users/${u.id}`,
      });
    }
  }

  const routeIds = byType.get("route") ?? [];
  if (routeIds.length) {
    const rows = await db.select().from(routes).where(inArray(routes.id, routeIds));
    for (const r of rows) {
      previews.set(key("route", r.id), {
        title: r.title,
        link: `/routes/${r.id}`,
      });
    }
  }

  const listIds = byType.get("list") ?? [];
  if (listIds.length) {
    const rows = await db.select().from(lists).where(inArray(lists.id, listIds));
    for (const l of rows) {
      previews.set(key("list", l.id), {
        title: l.title,
        link: `/users/${l.userId}`,
        subtitle: "清單",
      });
    }
  }

  return previews;
}

async function getTargetOwner(
  targetType: ReactionTarget,
  targetId: string
): Promise<string | null> {
  switch (targetType) {
    case "travelogue": {
      const [t] = await db
        .select({ userId: travelogues.userId })
        .from(travelogues)
        .where(eq(travelogues.id, targetId))
        .limit(1);
      return t?.userId ?? null;
    }
    case "photo": {
      const [p] = await db
        .select({ userId: photos.userId })
        .from(photos)
        .where(eq(photos.id, targetId))
        .limit(1);
      return p?.userId ?? null;
    }
    case "visit": {
      const [v] = await db
        .select({ userId: visits.userId })
        .from(visits)
        .where(eq(visits.id, targetId))
        .limit(1);
      return v?.userId ?? null;
    }
    case "spot": {
      const [s] = await db
        .select({ createdById: spots.createdById })
        .from(spots)
        .where(eq(spots.id, targetId))
        .limit(1);
      return s?.createdById ?? null;
    }
    case "comment": {
      const [c] = await db
        .select({ userId: comments.userId })
        .from(comments)
        .where(eq(comments.id, targetId))
        .limit(1);
      return c?.userId ?? null;
    }
    default:
      return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const type = req.nextUrl.searchParams.get("type");

  if (type === "feed") {
    const userId = session?.user?.id;
    const cursor = req.nextUrl.searchParams.get("cursor");
    const activityType = req.nextUrl.searchParams.get("activityType");
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);
    let feedRows;

    const cursorCondition = cursor
      ? lt(activities.createdAt, new Date(cursor))
      : undefined;

    const typeCondition =
      activityType && activityType !== "all"
        ? eq(activities.type, activityType as ActivityType)
        : undefined;

    if (userId) {
      const following = await db
        .select({ id: userFollows.followingId })
        .from(userFollows)
        .where(eq(userFollows.followerId, userId));

      const followingIds = following.map((f) => f.id);
      if (followingIds.length > 0) {
        const conditions = [inArray(activities.userId, followingIds)];
        if (cursorCondition) conditions.push(cursorCondition);
        if (typeCondition) conditions.push(typeCondition);

        feedRows = await db
          .select({
            id: activities.id,
            type: activities.type,
            targetId: activities.targetId,
            metadata: activities.metadata,
            createdAt: activities.createdAt,
            userId: activities.userId,
            userName: users.name,
            userImage: users.image,
          })
          .from(activities)
          .innerJoin(users, eq(activities.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(activities.createdAt))
          .limit(limit + 1);
      }
    }

    if (!feedRows) {
      let globalQuery = db
        .select({
          id: activities.id,
          type: activities.type,
          targetId: activities.targetId,
          metadata: activities.metadata,
          createdAt: activities.createdAt,
          userId: activities.userId,
          userName: users.name,
          userImage: users.image,
        })
        .from(activities)
        .innerJoin(users, eq(activities.userId, users.id))
        .$dynamic();

      if (cursorCondition) {
        globalQuery = globalQuery.where(
          typeCondition ? and(cursorCondition, typeCondition) : cursorCondition
        );
      } else if (typeCondition) {
        globalQuery = globalQuery.where(typeCondition);
      }

      feedRows = await globalQuery
        .orderBy(desc(activities.createdAt))
        .limit(limit + 1);
    }

    const hasMore = feedRows.length > limit;
    const page = hasMore ? feedRows.slice(0, limit) : feedRows;

    const previews = await resolveTargetPreviews(page);

    const enriched = page.map((a) => ({
      id: a.id,
      type: a.type,
      targetId: a.targetId,
      metadata: a.metadata,
      createdAt: a.createdAt,
      user: { id: a.userId, name: a.userName, image: a.userImage },
      preview: previews.get(`${a.type}:${a.targetId}`) ?? null,
    }));

    const last = page[page.length - 1];
    return NextResponse.json({
      items: enriched,
      nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
    });
  }

  if (type === "comments") {
    const targetType = req.nextUrl.searchParams.get("targetType") as ReactionTarget;
    const targetId = req.nextUrl.searchParams.get("targetId");
    if (!targetType || !targetId) {
      return NextResponse.json({ error: "需要 targetType 與 targetId" }, { status: 400 });
    }

    const rows = await db
      .select({
        id: comments.id,
        body: comments.body,
        parentId: comments.parentId,
        createdAt: comments.createdAt,
        userId: comments.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(comments)
      .innerJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.targetType, targetType), eq(comments.targetId, targetId)))
      .orderBy(desc(comments.createdAt));

    const topLevel = rows.filter((r) => !r.parentId);
    const replies = rows.filter((r) => r.parentId);
    const nested = topLevel.map((c) => ({
      id: c.id,
      body: c.body,
      parentId: c.parentId,
      createdAt: c.createdAt,
      user: { id: c.userId, name: c.userName, image: c.userImage },
      replies: replies
        .filter((r) => r.parentId === c.id)
        .map((r) => ({
          id: r.id,
          body: r.body,
          parentId: r.parentId,
          createdAt: r.createdAt,
          user: { id: r.userId, name: r.userName, image: r.userImage },
        })),
    }));

    return NextResponse.json(nested);
  }

  if (type === "reactions") {
    const targetType = req.nextUrl.searchParams.get("targetType") as ReactionTarget;
    const targetId = req.nextUrl.searchParams.get("targetId");
    if (!targetType || !targetId) {
      return NextResponse.json({ error: "需要 targetType 與 targetId" }, { status: 400 });
    }

    const [likeResult] = await db
      .select({ count: count() })
      .from(likes)
      .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

    let liked = false;
    let bookmarked = false;
    if (session?.user?.id) {
      const [likeRow] = await db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, session.user.id),
            eq(likes.targetType, targetType),
            eq(likes.targetId, targetId)
          )
        )
        .limit(1);
      liked = !!likeRow;

      const [bookmarkRow] = await db
        .select()
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, session.user.id),
            eq(bookmarks.targetType, targetType),
            eq(bookmarks.targetId, targetId)
          )
        )
        .limit(1);
      bookmarked = !!bookmarkRow;
    }

    return NextResponse.json({
      likeCount: likeResult?.count ?? 0,
      liked,
      bookmarked,
    });
  }

  if (type === "follow_status") {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "需要 userId" }, { status: 400 });
    }

    let following = false;
    if (session?.user?.id && session.user.id !== userId) {
      const [row] = await db
        .select()
        .from(userFollows)
        .where(
          and(
            eq(userFollows.followerId, session.user.id),
            eq(userFollows.followingId, userId)
          )
        )
        .limit(1);
      following = !!row;
    }

    const [followerStat] = await db
      .select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));

    const [followingStat] = await db
      .select({ count: count() })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    return NextResponse.json({
      following,
      followerCount: followerStat?.count ?? 0,
      followingCount: followingStat?.count ?? 0,
    });
  }

  if (type === "follows") {
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }
    const [animeList, regions] = await Promise.all([
      db
        .select()
        .from(animeFollows)
        .where(eq(animeFollows.userId, session.user.id)),
      db
        .select()
        .from(regionFollows)
        .where(eq(regionFollows.userId, session.user.id)),
    ]);
    return NextResponse.json({ anime: animeList, regions });
  }

  return NextResponse.json({ error: "未知類型" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const actorName = session.user.name ?? "某位巡禮者";

  switch (body.action) {
    case "follow": {
      await db
        .insert(userFollows)
        .values({
          followerId: session.user.id,
          followingId: body.userId,
        })
        .onConflictDoNothing();
      await db.insert(activities).values({
        userId: session.user.id,
        type: "follow",
        targetId: body.userId,
      });

      if (body.userId !== session.user.id) {
        await createNotification({
          userId: body.userId,
          type: "follow",
          title: `${actorName} 開始追蹤你`,
          link: `/users/${session.user.id}`,
        });
      }
      return NextResponse.json({ success: true });
    }
    case "unfollow": {
      await db
        .delete(userFollows)
        .where(
          and(
            eq(userFollows.followerId, session.user.id),
            eq(userFollows.followingId, body.userId)
          )
        );
      return NextResponse.json({ success: true });
    }
    case "follow_anime": {
      await db
        .insert(animeFollows)
        .values({
          userId: session.user.id,
          animeId: body.animeId,
        })
        .onConflictDoNothing();
      return NextResponse.json({
        success: true,
        message: "已訂閱此作品更新通知",
      });
    }
    case "unfollow_anime": {
      await db
        .delete(animeFollows)
        .where(
          and(
            eq(animeFollows.userId, session.user.id),
            eq(animeFollows.animeId, body.animeId)
          )
        );
      return NextResponse.json({ success: true });
    }
    case "follow_region": {
      await db
        .insert(regionFollows)
        .values({
          userId: session.user.id,
          region: body.region,
        })
        .onConflictDoNothing();
      return NextResponse.json({
        success: true,
        message: "已訂閱此地區更新通知",
      });
    }
    case "unfollow_region": {
      await db
        .delete(regionFollows)
        .where(
          and(
            eq(regionFollows.userId, session.user.id),
            eq(regionFollows.region, body.region)
          )
        );
      return NextResponse.json({ success: true });
    }
    case "like": {
      const targetType = body.targetType as ReactionTarget;
      const targetId = body.targetId as string;

      if (body.unlike) {
        await db
          .delete(likes)
          .where(
            and(
              eq(likes.userId, session.user.id),
              eq(likes.targetType, targetType),
              eq(likes.targetId, targetId)
            )
          );
        return NextResponse.json({ success: true, liked: false });
      }

      await db
        .insert(likes)
        .values({
          userId: session.user.id,
          targetType,
          targetId,
        })
        .onConflictDoNothing();

      const ownerId = await getTargetOwner(targetType, targetId);
      if (ownerId && ownerId !== session.user.id) {
        await createNotification({
          userId: ownerId,
          type: "like",
          title: `${actorName} 按讚了你的內容`,
          link: body.link,
        });
      }

      const [likeResult] = await db
        .select({ count: count() })
        .from(likes)
        .where(and(eq(likes.targetType, targetType), eq(likes.targetId, targetId)));

      return NextResponse.json({ success: true, liked: true, likeCount: likeResult?.count ?? 0 });
    }
    case "bookmark": {
      if (body.remove) {
        await db
          .delete(bookmarks)
          .where(
            and(
              eq(bookmarks.userId, session.user.id),
              eq(bookmarks.targetType, body.targetType),
              eq(bookmarks.targetId, body.targetId)
            )
          );
        return NextResponse.json({ success: true, bookmarked: false });
      }

      await db
        .insert(bookmarks)
        .values({
          userId: session.user.id,
          targetType: body.targetType,
          targetId: body.targetId,
        })
        .onConflictDoNothing();
      return NextResponse.json({ success: true, bookmarked: true });
    }
    case "comment": {
      const targetType = body.targetType as ReactionTarget;
      const targetId = body.targetId as string;

      const [comment] = await db
        .insert(comments)
        .values({
          userId: session.user.id,
          targetType,
          targetId,
          parentId: body.parentId,
          body: body.body,
        })
        .returning();

      if (body.parentId) {
        const parentOwner = await getTargetOwner("comment", body.parentId);
        if (parentOwner && parentOwner !== session.user.id) {
          await createNotification({
            userId: parentOwner,
            type: "comment",
            title: `${actorName} 回覆了你的留言`,
            body: body.body.slice(0, 100),
            link: body.link,
          });
        }
      } else {
        const ownerId = await getTargetOwner(targetType, targetId);
        if (ownerId && ownerId !== session.user.id) {
          await createNotification({
            userId: ownerId,
            type: "comment",
            title: `${actorName} 留言了`,
            body: body.body.slice(0, 100),
            link: body.link,
          });
        }
      }

      return NextResponse.json(comment);
    }
    default:
      return NextResponse.json({ error: "未知操作" }, { status: 400 });
  }
}
