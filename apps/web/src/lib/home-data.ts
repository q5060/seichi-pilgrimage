import {
  db,
  spots,
  anime,
  animePilgrimageMeta,
  spotAnimeLinks,
  travelogues,
  visits,
} from "@seichi/db";
import { desc, eq, sql, count } from "drizzle-orm";
import { cacheFetch } from "@/lib/cache";

const HOME_CACHE_TTL_MS = 60 * 1000;

export interface HomePageSnapshot {
  stats: { spotCount: number; visitCount: number }[];
  popularAnime: {
    anime: typeof anime.$inferSelect;
    meta: typeof animePilgrimageMeta.$inferSelect | null;
    spotCount: number;
  }[];
  recentTravelogues: (typeof travelogues.$inferSelect)[];
}

async function fetchHomePageSnapshot(): Promise<HomePageSnapshot> {
  const [stats, popularAnime, recentTravelogues] = await Promise.all([
    db
      .select({
        spotCount: sql<number>`count(distinct ${spots.id})`,
        visitCount: sql<number>`count(distinct ${visits.id})`,
      })
      .from(spots)
      .leftJoin(visits, eq(spots.id, visits.spotId)),
    db
      .select({
        anime: anime,
        meta: animePilgrimageMeta,
        spotCount: count(spotAnimeLinks.id),
      })
      .from(anime)
      .leftJoin(
        animePilgrimageMeta,
        eq(anime.anilistId, animePilgrimageMeta.anilistId)
      )
      .leftJoin(spotAnimeLinks, eq(anime.anilistId, spotAnimeLinks.anilistId))
      .groupBy(anime.anilistId, animePilgrimageMeta.anilistId)
      .orderBy(desc(animePilgrimageMeta.popularity))
      .limit(8),
    db
      .select()
      .from(travelogues)
      .where(eq(travelogues.isPublished, true))
      .orderBy(desc(travelogues.publishedAt))
      .limit(6),
  ]);

  return { stats, popularAnime, recentTravelogues };
}

export function getHomePageSnapshot() {
  return cacheFetch("home:snapshot", fetchHomePageSnapshot, HOME_CACHE_TTL_MS);
}
