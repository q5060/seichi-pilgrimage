import { db, anime, animePilgrimageMeta } from "@seichi/db";
import { eq, sql } from "drizzle-orm";
import {
  fetchAnimeById,
  searchAnime,
  mediaToDbFormat,
  type AniListMedia,
} from "./anilist";
import { triggerAnimeIndexing } from "./indexing";

export async function syncAnimeById(anilistId: number) {
  const media = await fetchAnimeById(anilistId);
  if (!media) return null;

  const row = mediaToDbFormat(media);
  await db
    .insert(anime)
    .values(row)
    .onConflictDoUpdate({
      target: anime.anilistId,
      set: { ...row, syncedAt: new Date() },
    });

  const existing = await db
    .select()
    .from(animePilgrimageMeta)
    .where(eq(animePilgrimageMeta.anilistId, anilistId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(animePilgrimageMeta).values({ anilistId });
  }

  triggerAnimeIndexing(anilistId);

  return media;
}

export async function searchAndSyncAnime(query: string): Promise<AniListMedia[]> {
  const results = await searchAnime(query);
  const slice = results.slice(0, 10);
  if (slice.length === 0) return results;

  const syncedAt = new Date();
  const rows = slice.map((media) => ({
    ...mediaToDbFormat(media),
    syncedAt,
  }));

  await db
    .insert(anime)
    .values(rows)
    .onConflictDoUpdate({
      target: anime.anilistId,
      set: {
        titles: sql`excluded.titles`,
        coverImage: sql`excluded.cover_image`,
        bannerImage: sql`excluded.banner_image`,
        format: sql`excluded.format`,
        status: sql`excluded.status`,
        episodes: sql`excluded.episodes`,
        season: sql`excluded.season`,
        seasonYear: sql`excluded.season_year`,
        genres: sql`excluded.genres`,
        description: sql`excluded.description`,
        averageScore: sql`excluded.average_score`,
        syncedAt: sql`excluded.synced_at`,
      },
    });

  for (const media of slice) {
    triggerAnimeIndexing(media.id);
  }

  return results;
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

function refreshAnimeInBackground(anilistId: number) {
  syncAnimeById(anilistId).catch((err) =>
    console.error("[anime-sync] background refresh failed:", err)
  );
}

export async function getOrSyncAnime(anilistId: number) {
  const [local] = await db
    .select()
    .from(anime)
    .where(eq(anime.anilistId, anilistId))
    .limit(1);

  if (local) {
    const age = Date.now() - new Date(local.syncedAt).getTime();
    if (age >= STALE_MS) {
      refreshAnimeInBackground(anilistId);
    }
    return local;
  }

  await syncAnimeById(anilistId);
  const [updated] = await db
    .select()
    .from(anime)
    .where(eq(anime.anilistId, anilistId))
    .limit(1);
  return updated ?? null;
}

export async function updatePilgrimageMeta(
  anilistId: number,
  data: Partial<{
    popularity: number;
    suggestedDays: number;
    etiquetteNotes: string;
    customTitle: string;
    spotCount: number;
  }>
) {
  await db
    .insert(animePilgrimageMeta)
    .values({ anilistId, ...data })
    .onConflictDoUpdate({
      target: animePilgrimageMeta.anilistId,
      set: { ...data, updatedAt: new Date() },
    });
}
