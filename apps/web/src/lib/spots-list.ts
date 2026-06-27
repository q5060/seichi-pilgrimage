import { db, spots } from "@seichi/db";
import { and, eq } from "drizzle-orm";
import { cacheFetch } from "@/lib/cache";
import { sanitizeSpotForList } from "@/lib/privacy";
import { enrichSpotsWithThumbnails } from "@/lib/thumbnails";

import { SPOTS_LIST_PAGE_SIZE } from "@/lib/spots-list-constants";

const CACHE_TTL_MS = 60 * 1000;

export interface SpotListItem {
  id: string;
  nameZh: string;
  nameJa: string | null;
  prefecture: string;
  latitude: number;
  longitude: number;
  coverPhotoUrl: string | null;
}

export async function fetchSpotsListPage(
  prefecture?: string | null,
  cursor = 0,
  limit = SPOTS_LIST_PAGE_SIZE
): Promise<{ items: SpotListItem[]; nextCursor: number | null }> {
  const cacheKey = `spots-list:${prefecture ?? "all"}:${cursor}:${limit}`;

  return cacheFetch(
    cacheKey,
    async () => {
      const conditions = [eq(spots.moderationStatus, "approved")];
      if (prefecture) conditions.push(eq(spots.prefecture, prefecture));

      const results = await db
        .select()
        .from(spots)
        .where(and(...conditions))
        .offset(cursor)
        .limit(limit + 1);

      const hasMore = results.length > limit;
      const page = await enrichSpotsWithThumbnails(
        results.slice(0, limit).map(sanitizeSpotForList)
      );

      return {
        items: page.map((spot) => ({
          id: spot.id,
          nameZh: spot.nameZh,
          nameJa: spot.nameJa,
          prefecture: spot.prefecture,
          latitude: spot.latitude,
          longitude: spot.longitude,
          coverPhotoUrl: spot.thumbnailUrl ?? null,
        })),
        nextCursor: hasMore ? cursor + limit : null,
      };
    },
    CACHE_TTL_MS
  );
}
