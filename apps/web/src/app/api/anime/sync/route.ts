import { NextResponse } from "next/server";
import { syncAnimeById } from "@/lib/anime-sync";
import { fetchTrendingAnime } from "@/lib/anilist";
import { db, anime } from "@seichi/db";
import { mediaToDbFormat } from "@/lib/anilist";
import { triggerAnimeIndexing } from "@/lib/indexing";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  if (body.anilistId) {
    const result = await syncAnimeById(body.anilistId);
    return NextResponse.json(result);
  }

  const trending = await fetchTrendingAnime(1, 20);
  for (const media of trending) {
    const row = mediaToDbFormat(media);
    await db.insert(anime).values(row).onConflictDoUpdate({
      target: anime.anilistId,
      set: { ...row, syncedAt: new Date() },
    });
    triggerAnimeIndexing(media.id);
  }

  return NextResponse.json({ synced: trending.length });
}
