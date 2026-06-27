import { db, spots, spotAnimeLinks, anime, travelogues, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { AnimeTitles } from "@seichi/shared";
import {
  indexSpot,
  indexTravelogue,
  indexAnime,
  indexUser,
  deleteSpotFromIndex,
  deleteTravelogueFromIndex,
  deleteAnimeFromIndex,
  deleteUserFromIndex,
} from "./search";
import {
  animeTitlesToSearchTerms,
  spotToIndexDoc,
  travelogueToIndexDoc,
  animeToIndexDoc,
  userToIndexDoc,
} from "./indexing-core";

function fireAndForget(task: Promise<void>) {
  task.catch((err) => console.error("[indexing]", err));
}

async function buildSpotDoc(spotId: string) {
  const [spot] = await db.select().from(spots).where(eq(spots.id, spotId)).limit(1);
  if (!spot || spot.moderationStatus !== "approved") return null;

  const links = await db
    .select({ titles: anime.titles })
    .from(spotAnimeLinks)
    .innerJoin(anime, eq(spotAnimeLinks.anilistId, anime.anilistId))
    .where(eq(spotAnimeLinks.spotId, spotId));

  const animeTitles = links
    .map((l) => animeTitlesToSearchTerms(l.titles as AnimeTitles))
    .flat();

  return spotToIndexDoc(spot, animeTitles);
}

async function buildTravelogueDoc(travelogueId: string) {
  const [row] = await db
    .select({ travelogue: travelogues, author: users })
    .from(travelogues)
    .innerJoin(users, eq(travelogues.userId, users.id))
    .where(eq(travelogues.id, travelogueId))
    .limit(1);

  if (!row || !row.travelogue.isPublished || row.travelogue.privacy !== "public") {
    return null;
  }

  return travelogueToIndexDoc(row.travelogue, row.author);
}

async function buildAnimeDoc(anilistId: number) {
  const [row] = await db
    .select()
    .from(anime)
    .where(eq(anime.anilistId, anilistId))
    .limit(1);

  if (!row) return null;

  return animeToIndexDoc(row);
}

async function buildUserDoc(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  return userToIndexDoc(user);
}

export async function reindexSpot(spotId: string) {
  const doc = await buildSpotDoc(spotId);
  if (doc) {
    await indexSpot(doc);
  } else {
    await deleteSpotFromIndex(spotId);
  }
}

export async function reindexTravelogue(travelogueId: string) {
  const doc = await buildTravelogueDoc(travelogueId);
  if (doc) {
    await indexTravelogue(doc);
  } else {
    await deleteTravelogueFromIndex(travelogueId);
  }
}

export async function reindexAnime(anilistId: number) {
  const doc = await buildAnimeDoc(anilistId);
  if (doc) {
    await indexAnime(doc);
  } else {
    await deleteAnimeFromIndex(String(anilistId));
  }
}

export async function reindexUser(userId: string) {
  const doc = await buildUserDoc(userId);
  if (doc) {
    await indexUser(doc);
  } else {
    await deleteUserFromIndex(userId);
  }
}

export function triggerSpotIndexing(spotId: string) {
  fireAndForget(reindexSpot(spotId));
}

export function triggerTravelogueIndexing(travelogueId: string) {
  fireAndForget(reindexTravelogue(travelogueId));
}

export function triggerAnimeIndexing(anilistId: number) {
  fireAndForget(reindexAnime(anilistId));
}

export function triggerUserIndexing(userId: string) {
  fireAndForget(reindexUser(userId));
}
