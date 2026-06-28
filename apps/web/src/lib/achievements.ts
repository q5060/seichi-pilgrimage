import { ACHIEVEMENTS, type AchievementId } from "@seichi/shared";
import {
  db,
  userAchievements,
  visits,
  spots,
  photos,
  travelogues,
  spotAnimeLinks,
  anime,
} from "@seichi/db";
import { eq, and, gte, lt, sql, inArray } from "drizzle-orm";
import { createNotification } from "./notifications";
import { haversineDistance } from "./utils";
import type { AppLocale } from "@/i18n/routing";
import { getAnimeDisplayTitle } from "@/lib/display-names";

export async function grantAchievement(
  userId: string,
  achievementId: AchievementId
): Promise<boolean> {
  const existing = await db
    .select()
    .from(userAchievements)
    .where(
      and(
        eq(userAchievements.userId, userId),
        eq(userAchievements.achievementId, achievementId)
      )
    )
    .limit(1);

  if (existing.length > 0) return false;

  await db.insert(userAchievements).values({ userId, achievementId });

  const achievement = ACHIEVEMENTS[achievementId];
  await createNotification({
    userId,
    type: "achievement",
    title: "獲得新成就",
    body: achievement.name,
    link: `/users/${userId}?tab=overview`,
  });

  return true;
}

export async function getUserAchievements(userId: string) {
  const rows = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  return rows.map((r) => ({
    ...ACHIEVEMENTS[r.achievementId as AchievementId],
    earnedAt: r.earnedAt,
  }));
}

export interface WrappedStats {
  year: number;
  visitCount: number;
  prefectures: string[];
  topAnime: { anilistId: number; title: string; count: number }[];
  travelogueCount: number;
  photoCount: number;
  totalDistanceM: number;
}

export async function computeWrappedStats(
  userId: string,
  year: number,
  locale: AppLocale = "zh-TW"
): Promise<WrappedStats> {
  const start = new Date(`${year}-01-01`);
  const end = new Date(`${year + 1}-01-01`);

  const userVisits = await db
    .select({ visit: visits, spot: spots })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .where(
      and(
        eq(visits.userId, userId),
        gte(visits.visitedAt, start),
        lt(visits.visitedAt, end)
      )
    );

  const prefectureSet = new Set(userVisits.map((v) => v.spot.prefecture));

  const userPhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.userId, userId),
        gte(photos.createdAt, start),
        lt(photos.createdAt, end)
      )
    );

  const userTravelogues = await db
    .select()
    .from(travelogues)
    .where(
      and(
        eq(travelogues.userId, userId),
        eq(travelogues.isPublished, true),
        gte(travelogues.publishedAt, start),
        lt(travelogues.publishedAt, end)
      )
    );

  const spotIds = userVisits.map((v) => v.spot.id);
  const animeCounts: Record<number, number> = {};

  if (spotIds.length > 0) {
    const links = await db
      .select()
      .from(spotAnimeLinks)
      .where(sql`${spotAnimeLinks.spotId} = ANY(ARRAY[${sql.join(
        spotIds.map((id) => sql`${id}::uuid`),
        sql`, `
      )}])`);

    for (const link of links) {
      animeCounts[link.anilistId] = (animeCounts[link.anilistId] ?? 0) + 1;
    }
  }

  const topAnimeIds = Object.entries(animeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const anilistIds = topAnimeIds.map(([id]) => Number(id));
  const animeRows =
    anilistIds.length > 0
      ? await db
          .select()
          .from(anime)
          .where(inArray(anime.anilistId, anilistIds))
      : [];
  const animeById = new Map(animeRows.map((a) => [a.anilistId, a]));

  const topAnime = topAnimeIds.map(([id, visitCount]) => {
    const a = animeById.get(Number(id));
    const titles = a?.titles as {
      chinese?: string;
      native?: string;
      romaji?: string;
      english?: string;
    };
    return {
      anilistId: Number(id),
      title: getAnimeDisplayTitle(titles ?? {}, locale),
      count: visitCount,
    };
  });

  const sortedVisits = [...userVisits].sort(
    (a, b) => a.visit.visitedAt.getTime() - b.visit.visitedAt.getTime()
  );
  let totalDistanceM = 0;
  for (let i = 1; i < sortedVisits.length; i++) {
    const prev = sortedVisits[i - 1].spot;
    const curr = sortedVisits[i].spot;
    totalDistanceM += haversineDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude
    );
  }

  return {
    year,
    visitCount: userVisits.length,
    prefectures: [...prefectureSet],
    topAnime,
    travelogueCount: userTravelogues.length,
    photoCount: userPhotos.length,
    totalDistanceM: Math.round(totalDistanceM),
  };
}

export async function checkVisitAchievements(userId: string, visitCount: number) {
  if (visitCount >= 1) await grantAchievement(userId, "first_visit");
  if (visitCount >= 10) await grantAchievement(userId, "ten_spots");
  if (visitCount >= 50) await grantAchievement(userId, "fifty_spots");
}

export async function checkPrefectureAchievements(
  userId: string,
  prefectureCount: number
) {
  if (prefectureCount >= 5) await grantAchievement(userId, "prefecture_5");
  if (prefectureCount >= 10) await grantAchievement(userId, "prefecture_10");
}
