import {
  db,
  userFollows,
  activities,
  users,
  visits,
  travelogues,
  photos,
  spots,
  locationReports,
  routes,
  lists,
} from "@seichi/db";
import { eq, desc, and, inArray, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { ActivityType } from "@seichi/shared";
import { cacheFetch } from "@/lib/cache";

const FEED_CACHE_TTL_MS = 60 * 1000;

type FeedPreview = {
  title: string;
  thumbnail?: string | null;
  link: string;
  subtitle?: string;
};

export interface FeedActivityItem {
  id: string;
  type: string;
  targetId: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
  preview: FeedPreview | null;
}

async function resolveTargetPreviews(
  items: { type: ActivityType; targetId: string }[]
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

export async function getFeedItems(options?: {
  cursor?: string;
  limit?: number;
}): Promise<{ items: FeedActivityItem[]; nextCursor: string | null }> {
  const session = await auth();
  const userId = session?.user?.id;
  const cursor = options?.cursor;
  const limit = Math.min(options?.limit ?? 20, 50);

  if (!cursor) {
    const cacheKey = `feed:first:${userId ?? "anon"}:${limit}`;
    return cacheFetch(
      cacheKey,
      () => fetchFeedItems({ userId, cursor, limit }),
      FEED_CACHE_TTL_MS
    );
  }

  return fetchFeedItems({ userId, cursor, limit });
}

async function fetchFeedItems({
  userId,
  cursor,
  limit,
}: {
  userId?: string;
  cursor?: string;
  limit: number;
}): Promise<{ items: FeedActivityItem[]; nextCursor: string | null }> {
  let feedRows;

  const cursorCondition = cursor ? lt(activities.createdAt, new Date(cursor)) : undefined;

  if (userId) {
    const following = await db
      .select({ id: userFollows.followingId })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));

    const followingIds = following.map((f) => f.id);
    if (followingIds.length > 0) {
      const conditions = [inArray(activities.userId, followingIds)];
      if (cursorCondition) conditions.push(cursorCondition);

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
      globalQuery = globalQuery.where(cursorCondition);
    }

    feedRows = await globalQuery.orderBy(desc(activities.createdAt)).limit(limit + 1);
  }

  const hasMore = feedRows.length > limit;
  const page = hasMore ? feedRows.slice(0, limit) : feedRows;
  const previews = await resolveTargetPreviews(page);

  const items = page.map((a) => ({
    id: a.id,
    type: a.type,
    targetId: a.targetId,
    createdAt: a.createdAt.toISOString(),
    user: { id: a.userId, name: a.userName, image: a.userImage },
    preview: previews.get(`${a.type}:${a.targetId}`) ?? null,
  }));

  const last = page[page.length - 1];
  return {
    items,
    nextCursor: hasMore && last ? last.createdAt.toISOString() : null,
  };
}
