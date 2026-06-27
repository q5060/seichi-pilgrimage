import MeiliSearch from "meilisearch";
import type { AppLocale } from "@/i18n/routing";

import { getAnimeSearchAttributes, getSpotSearchAttributes } from "@/lib/display-names";

let client: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch | null {
  const url = process.env.MEILISEARCH_URL;
  if (!url) return null;
  if (!client) {
    client = new MeiliSearch({
      host: url,
      apiKey: process.env.MEILISEARCH_API_KEY,
    });
  }
  return client;
}

export const INDEXES = {
  spots: "spots",
  travelogues: "travelogues",
  anime: "anime",
  users: "users",
} as const;

type IndexName = (typeof INDEXES)[keyof typeof INDEXES];

export async function ensureIndexes() {
  const meili = getMeiliClient();
  if (!meili) return;

  for (const uid of Object.values(INDEXES)) {
    try {
      await meili.createIndex(uid, { primaryKey: "id" });
    } catch {
      // index exists
    }
  }

  await meili.index(INDEXES.spots).updateSearchableAttributes([
    "nameZh",
    "nameJa",
    "prefecture",
    "address",
    "animeTitles",
  ]);
  await meili.index(INDEXES.travelogues).updateSearchableAttributes([
    "title",
    "excerpt",
    "authorName",
  ]);
  await meili.index(INDEXES.anime).updateSearchableAttributes([
    "titleRomaji",
    "titleNative",
    "titleEnglish",
    "titleChinese",
  ]);
  await meili.index(INDEXES.users).updateSearchableAttributes([
    "name",
    "username",
    "bio",
  ]);
}

export async function indexSpot(doc: {
  id: string;
  nameZh: string;
  nameJa?: string | null;
  prefecture: string;
  address?: string | null;
  animeTitles?: string[];
}) {
  const meili = getMeiliClient();
  if (!meili) return;
  await meili.index(INDEXES.spots).addDocuments([doc]);
}

export async function indexTravelogue(doc: {
  id: string;
  title: string;
  excerpt?: string | null;
  slug: string;
  authorName?: string | null;
}) {
  const meili = getMeiliClient();
  if (!meili) return;
  await meili.index(INDEXES.travelogues).addDocuments([doc]);
}

export async function indexAnime(doc: {
  id: string;
  titleRomaji?: string | null;
  titleNative?: string | null;
  titleEnglish?: string | null;
  titleChinese?: string | null;
  seasonYear?: number | null;
}) {
  const meili = getMeiliClient();
  if (!meili) return;
  await meili.index(INDEXES.anime).addDocuments([doc]);
}

export async function indexUser(doc: {
  id: string;
  name?: string | null;
  username?: string | null;
  bio?: string | null;
}) {
  const meili = getMeiliClient();
  if (!meili) return;
  await meili.index(INDEXES.users).addDocuments([doc]);
}

async function deleteFromIndex(index: IndexName, id: string) {
  const meili = getMeiliClient();
  if (!meili) return;
  await meili.index(index).deleteDocument(id);
}

export async function deleteSpotFromIndex(id: string) {
  return deleteFromIndex(INDEXES.spots, id);
}

export async function deleteTravelogueFromIndex(id: string) {
  return deleteFromIndex(INDEXES.travelogues, id);
}

export async function deleteAnimeFromIndex(id: string) {
  return deleteFromIndex(INDEXES.anime, id);
}

export async function deleteUserFromIndex(id: string) {
  return deleteFromIndex(INDEXES.users, id);
}

export async function searchSpots(query: string, limit = 20) {
  const meili = getMeiliClient();
  if (!meili) return { hits: [] as Record<string, unknown>[] };
  return meili.index(INDEXES.spots).search(query, { limit });
}

export async function searchAll(query: string, locale: AppLocale = "zh-TW") {
  const meili = getMeiliClient();
  if (!meili) {
    return { spots: [], travelogues: [], anime: [], users: [] };
  }
  const spotAttrs = getSpotSearchAttributes(locale);
  const animeAttrs = getAnimeSearchAttributes(locale);
  const [spots, travelogues, animeRes, users] = await Promise.all([
    meili.index(INDEXES.spots).search(query, {
      limit: 10,
      attributesToSearchOn: spotAttrs,
    }),
    meili.index(INDEXES.travelogues).search(query, { limit: 10 }),
    meili.index(INDEXES.anime).search(query, {
      limit: 10,
      attributesToSearchOn: animeAttrs,
    }),
    meili.index(INDEXES.users).search(query, { limit: 5 }),
  ]);
  return {
    spots: spots.hits,
    travelogues: travelogues.hits,
    anime: animeRes.hits,
    users: users.hits,
  };
}
