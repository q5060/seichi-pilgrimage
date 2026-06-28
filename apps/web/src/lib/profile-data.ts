import { db, visits, spots, travelogues } from "@seichi/db";
import { eq, count } from "drizzle-orm";
import { cacheFetch } from "@/lib/cache";
import { getUserAchievements } from "@/lib/achievements";

const PROFILE_SUMMARY_TTL_MS = 60 * 1000;

export interface ProfileSummary {
  visitCount: number;
  travelogueCount: number;
  prefectureList: { prefecture: string }[];
  achievements: Awaited<ReturnType<typeof getUserAchievements>>;
}

async function fetchProfileSummary(userId: string): Promise<ProfileSummary> {
  const [visitStatRows, travelogueStatRows, prefectureList, achievements] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(visits)
        .where(eq(visits.userId, userId)),
      db
        .select({ count: count() })
        .from(travelogues)
        .where(eq(travelogues.userId, userId)),
      db
        .select({ prefecture: spots.prefecture })
        .from(visits)
        .innerJoin(spots, eq(visits.spotId, spots.id))
        .where(eq(visits.userId, userId))
        .groupBy(spots.prefecture),
      getUserAchievements(userId),
    ]);

  return {
    visitCount: visitStatRows[0]?.count ?? 0,
    travelogueCount: travelogueStatRows[0]?.count ?? 0,
    prefectureList,
    achievements,
  };
}

export function getProfileSummary(userId: string) {
  return cacheFetch(
    `profile:summary:${userId}`,
    () => fetchProfileSummary(userId),
    PROFILE_SUMMARY_TTL_MS
  );
}
