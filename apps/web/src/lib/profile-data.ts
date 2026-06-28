import { db, visits, spots, travelogues, userAnimeStatus, anime, animePilgrimageMeta } from "@seichi/db";
import { eq, count, and, isNotNull } from "drizzle-orm";
import { cacheFetch } from "@/lib/cache";
import { getUserAchievements } from "@/lib/achievements";
import {
  PILGRIMAGE_STATUSES,
  type PilgrimageStatus,
} from "@seichi/shared";

const PROFILE_SUMMARY_TTL_MS = 60 * 1000;

export interface ProfileSummary {
  visitCount: number;
  travelogueCount: number;
  prefectureList: { prefecture: string }[];
  achievements: Awaited<ReturnType<typeof getUserAchievements>>;
}

export interface ProfileAnimeStats {
  animeTotal: number;
  statusCounts: Record<PilgrimageStatus, number>;
  averageScore: number | null;
  scoredCount: number;
  topGenres: { genre: string; count: number }[];
  suggestedPilgrimageDays: number;
}

async function fetchProfileSummary(userId: string): Promise<ProfileSummary> {
  const [visitStatRows, travelogueStatRows, prefectureList, achievements] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(visits)
        .where(eq(visits.userId, userId)),
      db
        .select({ count: count() })
        .from(travelogues)
        .where(eq(travelogues.userId, userId)),
      db
        .select({ prefecture: spots.prefecture })
        .from(visits)
        .innerJoin(spots, eq(visits.spotId, spots.id))
        .where(eq(visits.userId, userId))
        .groupBy(spots.prefecture),
      getUserAchievements(userId),
    ]);

  return {
    visitCount: visitStatRows[0]?.count ?? 0,
    travelogueCount: travelogueStatRows[0]?.count ?? 0,
    prefectureList,
    achievements,
  };
}

export function getProfileSummary(userId: string) {
  return cacheFetch(
    `profile:summary:${userId}`,
    () => fetchProfileSummary(userId),
    PROFILE_SUMMARY_TTL_MS
  );
}

async function fetchProfileAnimeStats(userId: string): Promise<ProfileAnimeStats> {
  const rows = await db
    .select({
      status: userAnimeStatus.status,
      score: userAnimeStatus.score,
      genres: anime.genres,
    })
    .from(userAnimeStatus)
    .innerJoin(anime, eq(userAnimeStatus.anilistId, anime.anilistId))
    .where(eq(userAnimeStatus.userId, userId));

  const statusCounts = Object.fromEntries(
    PILGRIMAGE_STATUSES.map((s) => [s, 0])
  ) as Record<PilgrimageStatus, number>;

  const genreCounts = new Map<string, number>();
  let scoreSum = 0;
  let scoredCount = 0;

  for (const row of rows) {
    statusCounts[row.status as PilgrimageStatus] =
      (statusCounts[row.status as PilgrimageStatus] ?? 0) + 1;
    if (row.score != null) {
      scoreSum += row.score;
      scoredCount += 1;
    }
    const weight =
      row.status === "completed" || row.status === "in_progress" ? 2 : 1;
    for (const genre of row.genres ?? []) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + weight);
    }
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  const completedDays = await db
    .select({ days: animePilgrimageMeta.suggestedDays })
    .from(userAnimeStatus)
    .innerJoin(
      animePilgrimageMeta,
      eq(userAnimeStatus.anilistId, animePilgrimageMeta.anilistId)
    )
    .where(
      and(
        eq(userAnimeStatus.userId, userId),
        eq(userAnimeStatus.status, "completed"),
        isNotNull(animePilgrimageMeta.suggestedDays)
      )
    );

  const suggestedPilgrimageDays = completedDays.reduce(
    (sum, r) => sum + (r.days ?? 0),
    0
  );

  return {
    animeTotal: rows.length,
    statusCounts,
    averageScore: scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : null,
    scoredCount,
    topGenres,
    suggestedPilgrimageDays,
  };
}

export function getProfileAnimeStats(userId: string) {
  return cacheFetch(
    `profile:anime-stats:${userId}`,
    () => fetchProfileAnimeStats(userId),
    PROFILE_SUMMARY_TTL_MS
  );
}
