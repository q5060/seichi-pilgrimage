import { db, users } from "@seichi/db";
import { eq, sql } from "drizzle-orm";
import { invalidateLeaderboardCache } from "@/lib/leaderboard";

export const CONTRIBUTION_POINTS = {
  spot_created: 10,
  spot_edit: 3,
  spot_link_edit: 2,
  location_report: 1,
  photo_upload: 2,
  travelogue_published: 5,
  anime_meta: 2,
} as const;

export type ContributionAction = keyof typeof CONTRIBUTION_POINTS;

export async function awardContribution(
  userId: string,
  action: ContributionAction
) {
  const points = CONTRIBUTION_POINTS[action];
  await db
    .update(users)
    .set({
      contributionScore: sql`${users.contributionScore} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await invalidateLeaderboardCache();
}
