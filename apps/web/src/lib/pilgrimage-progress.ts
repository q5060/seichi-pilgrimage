import { db, visits, spotAnimeLinks, userAnimeStatus } from "@seichi/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { grantAchievement } from "./achievements";

export async function updateAnimeProgressForUser(
  userId: string,
  spotId: string
) {
  const links = await db
    .select({ anilistId: spotAnimeLinks.anilistId })
    .from(spotAnimeLinks)
    .where(eq(spotAnimeLinks.spotId, spotId));

  const anilistIds = [...new Set(links.map((l) => l.anilistId))];
  if (anilistIds.length === 0) return;

  const [visitedRows, totalRows, existingRows] = await Promise.all([
    db
      .select({
        anilistId: spotAnimeLinks.anilistId,
        count: sql<number>`count(distinct ${visits.spotId})`,
      })
      .from(visits)
      .innerJoin(spotAnimeLinks, eq(visits.spotId, spotAnimeLinks.spotId))
      .where(
        and(
          eq(visits.userId, userId),
          inArray(spotAnimeLinks.anilistId, anilistIds)
        )
      )
      .groupBy(spotAnimeLinks.anilistId),
    db
      .select({
        anilistId: spotAnimeLinks.anilistId,
        count: sql<number>`count(distinct ${spotAnimeLinks.spotId})`,
      })
      .from(spotAnimeLinks)
      .where(inArray(spotAnimeLinks.anilistId, anilistIds))
      .groupBy(spotAnimeLinks.anilistId),
    db
      .select()
      .from(userAnimeStatus)
      .where(
        and(
          eq(userAnimeStatus.userId, userId),
          inArray(userAnimeStatus.anilistId, anilistIds)
        )
      ),
  ]);

  const visitedByAnime = new Map(
    visitedRows.map((r) => [r.anilistId, Number(r.count)])
  );
  const totalByAnime = new Map(
    totalRows.map((r) => [r.anilistId, Number(r.count)])
  );
  const existingByAnime = new Map(
    existingRows.map((r) => [r.anilistId, r])
  );

  for (const anilistId of anilistIds) {
    const visitedCount = visitedByAnime.get(anilistId) ?? 0;
    const totalCount = totalByAnime.get(anilistId) ?? 0;
    const existing = existingByAnime.get(anilistId);

    if (existing) {
      await db
        .update(userAnimeStatus)
        .set({
          visitedSpotCount: visitedCount,
          status:
            visitedCount >= totalCount && totalCount > 0
              ? "completed"
              : visitedCount > 0
                ? "in_progress"
                : existing.status,
          updatedAt: new Date(),
        })
        .where(eq(userAnimeStatus.id, existing.id));
    } else if (visitedCount > 0) {
      await db.insert(userAnimeStatus).values({
        userId,
        anilistId,
        visitedSpotCount: visitedCount,
        status:
          visitedCount >= totalCount && totalCount > 0
            ? "completed"
            : "in_progress",
      });
    }

    if (totalCount > 0 && visitedCount >= totalCount) {
      await grantAchievement(userId, "anime_complete");
    }
  }
}
