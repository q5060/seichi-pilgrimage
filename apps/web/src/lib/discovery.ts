import {
  db,
  spots,
  spotAnimeLinks,
  locationReports,
  users,
  visits,
  animeFollows,
  regionFollows,
} from "@seichi/db";
import { eq, desc, and, gte, sql, inArray } from "drizzle-orm";
import { cacheFetch } from "./cache";

const SEASON_MAP: Record<number, string> = {
  0: "冬",
  1: "冬",
  2: "春",
  3: "春",
  4: "春",
  5: "夏",
  6: "夏",
  7: "夏",
  8: "秋",
  9: "秋",
  10: "秋",
  11: "冬",
};

export function currentSeasonLabel(): string {
  return SEASON_MAP[new Date().getMonth()] ?? "春";
}

export async function getSeasonalPicks() {
  const season = currentSeasonLabel();
  return cacheFetch(`seasonal:${season}`, async () => {
    const results = await db
      .select({
        id: spots.id,
        nameZh: spots.nameZh,
        prefecture: spots.prefecture,
        latitude: spots.latitude,
        longitude: spots.longitude,
        bestSeason: spots.bestSeason,
      })
      .from(spots)
      .where(
        and(
          eq(spots.moderationStatus, "approved"),
          sql`${spots.bestSeason} ILIKE ${"%" + season + "%"} OR ${spots.bestSeason} IS NULL`
        )
      )
      .orderBy(desc(spots.visitCount))
      .limit(9);
    return results;
  });
}

export async function getWeeklyPopular() {
  return cacheFetch("weekly-popular", async () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const results = await db
      .select({
        id: spots.id,
        nameZh: spots.nameZh,
        prefecture: spots.prefecture,
        latitude: spots.latitude,
        longitude: spots.longitude,
        weeklyVisits: sql<number>`count(${visits.id})`.as("weekly_visits"),
      })
      .from(spots)
      .leftJoin(visits, and(eq(visits.spotId, spots.id), gte(visits.visitedAt, weekAgo)))
      .where(eq(spots.moderationStatus, "approved"))
      .groupBy(spots.id)
      .orderBy(desc(sql`count(${visits.id})`), desc(spots.visitCount))
      .limit(9);

    return results;
  });
}

export async function getRecommendationsForUser(userId: string) {
  return cacheFetch(`recommendations:${userId}`, async () => {
    const [animeFollowRows, regionFollowRows, recentVisits] = await Promise.all([
      db
        .select({ animeId: animeFollows.animeId })
        .from(animeFollows)
        .where(eq(animeFollows.userId, userId)),
      db
        .select({ region: regionFollows.region })
        .from(regionFollows)
        .where(eq(regionFollows.userId, userId)),
      db
        .select({ prefecture: spots.prefecture, anilistId: spotAnimeLinks.anilistId })
        .from(visits)
        .innerJoin(spots, eq(visits.spotId, spots.id))
        .leftJoin(spotAnimeLinks, eq(spotAnimeLinks.spotId, spots.id))
        .where(eq(visits.userId, userId))
        .orderBy(desc(visits.visitedAt))
        .limit(12),
    ]);

    const animeIds = [
      ...new Set([
        ...animeFollowRows.map((f) => f.animeId),
        ...recentVisits.map((v) => v.anilistId).filter((id): id is number => id != null),
      ]),
    ];
    const regions = [
      ...new Set([
        ...regionFollowRows.map((f) => f.region),
        ...recentVisits.map((v) => v.prefecture),
      ]),
    ];

    let fromAnime: {
      id: string;
      nameZh: string;
      prefecture: string;
      latitude: number;
      longitude: number;
      anilistId?: number;
      source: "anime";
    }[] = [];

    if (animeIds.length > 0) {
      fromAnime = (
        await db
          .select({
            id: spots.id,
            nameZh: spots.nameZh,
            prefecture: spots.prefecture,
            latitude: spots.latitude,
            longitude: spots.longitude,
            anilistId: spotAnimeLinks.anilistId,
          })
          .from(spotAnimeLinks)
          .innerJoin(spots, eq(spotAnimeLinks.spotId, spots.id))
          .where(
            and(
              inArray(spotAnimeLinks.anilistId, animeIds),
              eq(spots.moderationStatus, "approved")
            )
          )
          .orderBy(desc(spots.visitCount))
          .limit(9)
      ).map((s) => ({ ...s, source: "anime" as const }));
    }

    let fromRegions: {
      id: string;
      nameZh: string;
      prefecture: string;
      latitude: number;
      longitude: number;
      source: "region";
    }[] = [];

    if (regions.length > 0) {
      fromRegions = (
        await db
          .select({
            id: spots.id,
            nameZh: spots.nameZh,
            prefecture: spots.prefecture,
            latitude: spots.latitude,
            longitude: spots.longitude,
          })
          .from(spots)
          .where(
            and(
              inArray(spots.prefecture, regions),
              eq(spots.moderationStatus, "approved")
            )
          )
          .orderBy(desc(spots.visitCount))
          .limit(9)
      ).map((s) => ({ ...s, source: "region" as const }));
    }

    let fromVisits: {
      id: string;
      nameZh: string;
      prefecture: string;
      latitude: number;
      longitude: number;
      source: "visit";
    }[] = [];

    if (recentVisits.length > 0) {
      const recentPrefectures = [...new Set(recentVisits.map((v) => v.prefecture))];
      fromVisits = (
        await db
          .select({
            id: spots.id,
            nameZh: spots.nameZh,
            prefecture: spots.prefecture,
            latitude: spots.latitude,
            longitude: spots.longitude,
          })
          .from(spots)
          .where(
            and(
              inArray(spots.prefecture, recentPrefectures),
              eq(spots.moderationStatus, "approved")
            )
          )
          .orderBy(desc(spots.visitCount))
          .limit(6)
      ).map((s) => ({ ...s, source: "visit" as const }));
    }

    const seen = new Set<string>();
    const combined = [...fromAnime, ...fromRegions, ...fromVisits].filter((spot) => {
      if (seen.has(spot.id)) return false;
      seen.add(spot.id);
      return true;
    });

    return {
      fromAnime,
      fromRegions,
      fromVisits,
      combined: combined.slice(0, 12),
    };
  });
}

export async function getLatestLocationReports() {
  return cacheFetch("latest-location-reports", async () => {
    return db
      .select({
        report: locationReports,
        spot: { id: spots.id, nameZh: spots.nameZh, prefecture: spots.prefecture },
        user: { name: users.name },
      })
      .from(locationReports)
      .innerJoin(spots, eq(locationReports.spotId, spots.id))
      .innerJoin(users, eq(locationReports.userId, users.id))
      .where(eq(locationReports.moderationStatus, "approved"))
      .orderBy(desc(locationReports.createdAt))
      .limit(8);
  });
}
