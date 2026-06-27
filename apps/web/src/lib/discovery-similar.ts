import { db, spots, spotAnimeLinks } from "@seichi/db";
import { eq, and, ne, inArray, desc } from "drizzle-orm";
import { cacheFetch } from "./cache";
import { sanitizeSpotForList } from "./privacy";
import { enrichSpotsWithThumbnails } from "./thumbnails";

export async function getSimilarSpots(spotId: string, limit = 6) {
  return cacheFetch(`similar-spots:${spotId}`, async () => {
    const [spot] = await db
      .select()
      .from(spots)
      .where(eq(spots.id, spotId))
      .limit(1);

    if (!spot) return [];

    const links = await db
      .select({ anilistId: spotAnimeLinks.anilistId })
      .from(spotAnimeLinks)
      .where(eq(spotAnimeLinks.spotId, spotId));

    const animeIds = links.map((l) => l.anilistId);

    const relatedIds: string[] = [];

    if (animeIds.length > 0) {
      const sameAnime = await db
        .select({ spotId: spotAnimeLinks.spotId })
        .from(spotAnimeLinks)
        .where(
          and(
            inArray(spotAnimeLinks.anilistId, animeIds),
            ne(spotAnimeLinks.spotId, spotId)
          )
        )
        .limit(20);
      relatedIds.push(...sameAnime.map((r) => r.spotId));
    }

    const samePref = await db
      .select({ id: spots.id })
      .from(spots)
      .where(
        and(
          eq(spots.prefecture, spot.prefecture),
          eq(spots.moderationStatus, "approved"),
          ne(spots.id, spotId)
        )
      )
      .orderBy(desc(spots.visitCount))
      .limit(12);

    relatedIds.push(...samePref.map((s) => s.id));

    const unique = [...new Set(relatedIds)].slice(0, limit * 2);

    if (unique.length === 0) return [];

    const candidates = await db
      .select()
      .from(spots)
      .where(
        and(inArray(spots.id, unique), eq(spots.moderationStatus, "approved"))
      );

    const scored = candidates.map((s) => {
      let score = 0;
      if (s.prefecture === spot.prefecture) score += 2;
      score += Math.min(s.visitCount ?? 0, 10) / 10;
      return { spot: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit).map((r) => sanitizeSpotForList(r.spot));
    return enrichSpotsWithThumbnails(top);
  });
}
