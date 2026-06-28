import { db, anime, animePilgrimageMeta } from "@seichi/db";
import { desc, eq, gt, sql, and } from "drizzle-orm";
import type { AnimeTitles } from "@seichi/shared";
import {
  fetchSeasonAnime,
  fetchTrendingAnime,
  type MediaSeason,
} from "./anilist";
import { syncAnimeMediaBatch } from "./anime-sync";
import { cacheFetch } from "./cache";
import type { BrowseTab } from "./anime-browse-shared";

export type { BrowseTab } from "./anime-browse-shared";
export {
  ANIME_GENRES,
  BROWSE_TABS,
  SEASON_OPTIONS,
  defaultSeasonForDate,
  parseBrowseTab,
  parseSeason,
  parseYear,
} from "./anime-browse-shared";

export interface BrowseAnimeItem {
  anilistId: number;
  titles: AnimeTitles;
  coverImage: string | null;
  averageScore: number | null;
  spotCount: number;
}

async function enrichWithSpotCounts(
  rows: {
    anilistId: number;
    titles: AnimeTitles;
    coverImage: string | null;
    averageScore: number | null;
  }[]
): Promise<BrowseAnimeItem[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.anilistId);
  const metaRows = await db
    .select({
      anilistId: animePilgrimageMeta.anilistId,
      spotCount: animePilgrimageMeta.spotCount,
    })
    .from(animePilgrimageMeta)
    .where(sql`${animePilgrimageMeta.anilistId} = ANY(${ids})`);

  const spotById = new Map(metaRows.map((m) => [m.anilistId, m.spotCount]));

  return rows.map((r) => ({
    ...r,
    spotCount: spotById.get(r.anilistId) ?? 0,
  }));
}

async function fetchPilgrimageAnime(genre?: string): Promise<BrowseAnimeItem[]> {
  const conditions = [gt(animePilgrimageMeta.spotCount, 0)];
  if (genre) {
    conditions.push(sql`${anime.genres} @> ${JSON.stringify([genre])}::jsonb`);
  }

  const rows = await db
    .select({
      anilistId: anime.anilistId,
      titles: anime.titles,
      coverImage: anime.coverImage,
      averageScore: anime.averageScore,
      spotCount: animePilgrimageMeta.spotCount,
    })
    .from(anime)
    .innerJoin(
      animePilgrimageMeta,
      eq(anime.anilistId, animePilgrimageMeta.anilistId)
    )
    .where(and(...conditions))
    .orderBy(desc(animePilgrimageMeta.popularity))
    .limit(48);

  return rows.map((r) => ({
    anilistId: r.anilistId,
    titles: r.titles,
    coverImage: r.coverImage,
    averageScore: r.averageScore,
    spotCount: r.spotCount,
  }));
}

async function fetchRemoteBrowse(
  tab: "season" | "trending",
  season: MediaSeason,
  year: number,
  genre?: string
): Promise<BrowseAnimeItem[]> {
  const media =
    tab === "season"
      ? await fetchSeasonAnime(season, year, 1, 24, genre)
      : await fetchTrendingAnime(1, 24, genre);

  await syncAnimeMediaBatch(media);

  const rows = media.map((m) => ({
    anilistId: m.id,
    titles: {
      romaji: m.title.romaji,
      english: m.title.english,
      native: m.title.native,
    },
    coverImage: m.coverImage?.large ?? null,
    averageScore: m.averageScore ?? null,
  }));

  return enrichWithSpotCounts(rows);
}

export interface BrowseParams {
  tab: BrowseTab;
  season: MediaSeason;
  year: number;
  genre?: string;
}

export async function getBrowseAnime(params: BrowseParams): Promise<BrowseAnimeItem[]> {
  const { tab, season, year, genre } = params;
  const cacheKey = `anime-browse:${tab}:${season}:${year}:${genre ?? "all"}`;

  return cacheFetch(
    cacheKey,
    async () => {
      if (tab === "pilgrimage") {
        return fetchPilgrimageAnime(genre);
      }
      return fetchRemoteBrowse(tab, season, year, genre);
    },
    3600 * 1000
  );
}
