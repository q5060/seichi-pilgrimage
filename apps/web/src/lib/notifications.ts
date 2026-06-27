import { db, notifications, animeFollows, regionFollows } from "@seichi/db";
import { eq, and } from "drizzle-orm";

export async function notifyAnimeFollowers(params: {
  anilistIds: number[];
  title: string;
  body: string;
  link: string;
}) {
  if (params.anilistIds.length === 0) return;

  for (const anilistId of params.anilistIds) {
    const followers = await db
      .select({ userId: animeFollows.userId })
      .from(animeFollows)
      .where(eq(animeFollows.animeId, anilistId));

    for (const { userId } of followers) {
      await db.insert(notifications).values({
        userId,
        type: "anime_spot",
        title: params.title,
        body: params.body,
        link: params.link,
      });
    }
  }
}

export async function notifyRegionFollowers(params: {
  prefecture: string;
  title: string;
  body: string;
  link: string;
}) {
  const followers = await db
    .select({ userId: regionFollows.userId })
    .from(regionFollows)
    .where(eq(regionFollows.region, params.prefecture));

  for (const { userId } of followers) {
    await db.insert(notifications).values({
      userId,
      type: "region_spot",
      title: params.title,
      body: params.body,
      link: params.link,
    });
  }
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  await db.insert(notifications).values(params);
}
