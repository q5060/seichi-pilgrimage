import { db, notifications, animeFollows, regionFollows } from "@seichi/db";
import { eq } from "drizzle-orm";
import { sendPush } from "@/lib/push";
import {
  getNotificationCopy,
  type NotificationCopyKey,
  type NotificationCopyVars,
} from "@/lib/notification-copy";
import { getUserPreferredLocale } from "@/lib/user-locale";
import type { AppLocale } from "@/i18n/routing";

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
      await createNotification({
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
    await createNotification({
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
  title?: string;
  body?: string;
  link?: string;
  copyKey?: NotificationCopyKey;
  copyVars?: NotificationCopyVars;
  locale?: AppLocale;
}) {
  let title = params.title;
  let body = params.body;

  if (params.copyKey) {
    const locale =
      params.locale ?? (await getUserPreferredLocale(params.userId));
    const copy = getNotificationCopy(params.copyKey, locale, params.copyVars ?? {});
    title = copy.title;
    body = copy.body ?? body;
  }

  if (!title) return;

  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title,
    body,
    link: params.link,
  });

  void sendPush(params.userId, {
    title,
    body,
    url: params.link,
  });
}
