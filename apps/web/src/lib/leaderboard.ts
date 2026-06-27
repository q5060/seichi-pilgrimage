import { db, users, visits, spots } from "@seichi/db";
import { eq, desc, sql, count } from "drizzle-orm";
import { cacheFetch, cacheDelete } from "@/lib/cache";

export type LeaderboardType = "contribution" | "visits" | "prefectures";

export interface LeaderboardItem {
  rank: number;
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  score: number;
}

const CACHE_TTL_MS = 60 * 1000;

const LEADERBOARD_CACHE_LIMITS = [50] as const;

export async function invalidateLeaderboardCache() {
  await Promise.all(
    (["contribution", "visits", "prefectures"] as LeaderboardType[]).flatMap(
      (type) =>
        LEADERBOARD_CACHE_LIMITS.map((limit) =>
          cacheDelete(`leaderboard:${type}:${limit}`)
        )
    )
  );
}

export async function getLeaderboard(
  type: LeaderboardType = "contribution",
  limit = 50
): Promise<LeaderboardItem[]> {
  return cacheFetch(
    `leaderboard:${type}:${limit}`,
    async () => {
      if (type === "contribution") {
        const rows = await db
          .select({
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
            score: users.contributionScore,
          })
          .from(users)
          .where(eq(users.showOnLeaderboard, true))
          .orderBy(desc(users.contributionScore))
          .limit(limit);

        return rows.map((row, i) => ({ rank: i + 1, ...row }));
      }

      if (type === "visits") {
        const rows = await db
          .select({
            id: users.id,
            name: users.name,
            username: users.username,
            image: users.image,
            score: count(visits.id),
          })
          .from(visits)
          .innerJoin(users, eq(visits.userId, users.id))
          .where(eq(users.showOnLeaderboard, true))
          .groupBy(users.id, users.name, users.username, users.image)
          .orderBy(desc(count(visits.id)))
          .limit(limit);

        return rows.map((row, i) => ({
          rank: i + 1,
          ...row,
          score: Number(row.score),
        }));
      }

      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          image: users.image,
          score: sql<number>`count(distinct ${spots.prefecture})`,
        })
        .from(visits)
        .innerJoin(users, eq(visits.userId, users.id))
        .innerJoin(spots, eq(visits.spotId, spots.id))
        .where(eq(users.showOnLeaderboard, true))
        .groupBy(users.id, users.name, users.username, users.image)
        .orderBy(desc(sql`count(distinct ${spots.prefecture})`))
        .limit(limit);

      return rows.map((row, i) => ({
        rank: i + 1,
        ...row,
        score: Number(row.score),
      }));
    },
    CACHE_TTL_MS
  );
}
