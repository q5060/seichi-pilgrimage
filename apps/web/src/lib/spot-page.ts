import {
  db,
  spots,
  spotAnimeLinks,
  anime,
  locationReports,
  spotVersions,
  users,
  photos,
} from "@seichi/db";
import { eq, desc } from "drizzle-orm";
import { cacheFetch } from "@/lib/cache";
import { getSimilarSpots } from "@/lib/discovery-similar";

const CACHE_TTL_MS = 60 * 1000;

export async function getSpotPageData(id: string) {
  return cacheFetch(
    `spot-page:${id}`,
    async () => {
      const [spot] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
      if (!spot) return null;

      const [links, reports, versions, heroPhotos, similarSpots] = await Promise.all([
        db
          .select({ link: spotAnimeLinks, anime: anime })
          .from(spotAnimeLinks)
          .innerJoin(anime, eq(spotAnimeLinks.anilistId, anime.anilistId))
          .where(eq(spotAnimeLinks.spotId, id)),
        db
          .select({ report: locationReports, user: users })
          .from(locationReports)
          .innerJoin(users, eq(locationReports.userId, users.id))
          .where(eq(locationReports.spotId, id))
          .orderBy(desc(locationReports.createdAt))
          .limit(10),
        db
          .select({
            version: spotVersions,
            editor: { id: users.id, name: users.name },
          })
          .from(spotVersions)
          .innerJoin(users, eq(spotVersions.editorId, users.id))
          .where(eq(spotVersions.spotId, id))
          .orderBy(desc(spotVersions.createdAt))
          .limit(20),
        db
          .select()
          .from(photos)
          .where(eq(photos.spotId, id))
          .orderBy(desc(photos.createdAt))
          .limit(1),
        getSimilarSpots(id),
      ]);

      return {
        spot,
        links,
        reports,
        versions,
        heroPhoto: heroPhotos[0] ?? null,
        similarSpots,
      };
    },
    CACHE_TTL_MS
  );
}

export async function getSpotPhotos(spotId: string) {
  return cacheFetch(
    `spot-photos:${spotId}`,
    () =>
      db
        .select({
          id: photos.id,
          url: photos.url,
          thumbnailUrl: photos.thumbnailUrl,
          caption: photos.caption,
          tag: photos.tag,
          isComparison: photos.isComparison,
          comparisonScreenshotUrl: photos.comparisonScreenshotUrl,
        })
        .from(photos)
        .where(eq(photos.spotId, spotId))
        .orderBy(desc(photos.createdAt)),
    CACHE_TTL_MS
  );
}
