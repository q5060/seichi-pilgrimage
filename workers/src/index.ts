import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { db, anime, spots, spotAnimeLinks, travelogues, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { AnimeTitles } from "@seichi/shared";
import MeiliSearch from "meilisearch";
import {
  spotToIndexDoc,
  travelogueToIndexDoc,
  animeToIndexDoc,
  userToIndexDoc,
} from "./indexing-builders";

const FEATURED = [21617, 142770, 140960, 106286, 1887];

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const syncQueue = new Queue("anilist-sync", { connection });
const indexQueue = new Queue("search-index", { connection });

const meili = process.env.MEILISEARCH_URL
  ? new MeiliSearch({
      host: process.env.MEILISEARCH_URL,
      apiKey: process.env.MEILISEARCH_API_KEY,
    })
  : null;

async function fetchPopularAnimeIds(): Promise<number[]> {
  const ids = new Set<number>();
  for (let page = 1; page <= 3; page++) {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($page:Int,$perPage:Int){Page(page:$page,perPage:$perPage){media(type:ANIME,sort:POPULARITY_DESC){id}}}`,
        variables: { page, perPage: 20 },
      }),
    });
    const json = await res.json();
    const media = json.data?.Page?.media ?? [];
    for (const m of media) ids.add(m.id);
  }
  return [...ids];
}

function mediaToRow(media: {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: { large?: string };
  episodes?: number;
  seasonYear?: number;
  averageScore?: number;
  description?: string;
  genres?: string[];
}) {
  return {
    anilistId: media.id,
    titles: media.title,
    coverImage: media.coverImage?.large,
    episodes: media.episodes,
    seasonYear: media.seasonYear,
    averageScore: media.averageScore,
    description: media.description?.replace(/<[^>]*>/g, ""),
    genres: media.genres ?? [],
    syncedAt: new Date(),
  };
}

// AniList sync worker
new Worker(
  "anilist-sync",
  async (job) => {
    if (job.name === "daily-sync") {
      const syncIds = new Set(FEATURED);
      const popularIds = await fetchPopularAnimeIds();
      for (const id of popularIds) syncIds.add(id);

      for (const id of syncIds) {
        await syncQueue.add("sync", { anilistId: id });
      }
      return;
    }

    const { anilistId } = job.data as { anilistId: number };
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($id:Int){Media(id:$id,type:ANIME){id title{romaji english native} coverImage{large} episodes seasonYear averageScore description genres}}`,
        variables: { id: anilistId },
      }),
    });
    const json = await res.json();
    const media = json.data?.Media;
    if (!media) return;

    const row = mediaToRow(media);

    await db
      .insert(anime)
      .values(row)
      .onConflictDoUpdate({
        target: anime.anilistId,
        set: {
          titles: row.titles,
          coverImage: row.coverImage,
          episodes: row.episodes,
          seasonYear: row.seasonYear,
          averageScore: row.averageScore,
          description: row.description,
          genres: row.genres,
          syncedAt: new Date(),
        },
      });

    console.log(`Synced anime ${anilistId}`);
  },
  { connection }
);

// Search index worker
new Worker(
  "search-index",
  async (job) => {
    if (!meili) return;

    const { type } = job.data as { type: string };

    if (type === "spots" || type === "all") {
      const allSpots = await db.select().from(spots);
      const docs = await Promise.all(
        allSpots.map(async (spot) => {
          const links = await db
            .select({ titles: anime.titles })
            .from(spotAnimeLinks)
            .innerJoin(anime, eq(spotAnimeLinks.anilistId, anime.anilistId))
            .where(eq(spotAnimeLinks.spotId, spot.id));

          const animeTitles = links
            .map((l) => l.titles as AnimeTitles)
            .flatMap((t) => [t.romaji, t.english, t.native, t.chinese])
            .filter((t): t is string => Boolean(t));

          return spotToIndexDoc(spot, animeTitles);
        })
      );
      await meili.index("spots").addDocuments(docs);
      console.log(`Indexed ${docs.length} spots`);
    }

    if (type === "travelogues" || type === "all") {
      const all = await db.select().from(travelogues).where(eq(travelogues.isPublished, true));
      await meili.index("travelogues").addDocuments(
        all.map((t) => travelogueToIndexDoc(t))
      );
      console.log(`Indexed ${all.length} travelogues`);
    }

    if (type === "anime" || type === "all") {
      const allAnime = await db.select().from(anime);
      await meili.index("anime").addDocuments(allAnime.map((a) => animeToIndexDoc(a)));
      console.log(`Indexed ${allAnime.length} anime`);
    }

    if (type === "users" || type === "all") {
      const allUsers = await db.select().from(users);
      await meili.index("users").addDocuments(allUsers.map((u) => userToIndexDoc(u)));
      console.log(`Indexed ${allUsers.length} users`);
    }
  },
  { connection }
);

// Schedule daily sync for featured anime (repeatable)
async function scheduleDaily() {
  await syncQueue.add(
    "daily-sync",
    {},
    {
      repeat: { pattern: "0 3 * * *" },
      jobId: "daily-anilist-sync",
    }
  );

  await indexQueue.add(
    "daily-reindex",
    { type: "all" },
    {
      repeat: { pattern: "0 4 * * *" },
      jobId: "daily-search-reindex",
    }
  );

  for (const id of FEATURED) {
    await syncQueue.add("sync", { anilistId: id });
  }
  await indexQueue.add("reindex", { type: "spots" });
  await indexQueue.add("reindex", { type: "travelogues" });
  await indexQueue.add("reindex", { type: "anime" });
  await indexQueue.add("reindex", { type: "users" });
  console.log("Scheduled daily sync jobs");
}

scheduleDaily().catch(console.error);

console.log("Seichi worker started");
