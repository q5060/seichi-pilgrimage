import { db, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { ModerationStatus } from "@seichi/shared";

export const TRUST_SCORE_THRESHOLD = 50;

export async function getUserContributionScore(userId: string): Promise<number> {
  const [user] = await db
    .select({ contributionScore: users.contributionScore })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.contributionScore ?? 0;
}

export async function isTrustedContributor(userId: string): Promise<boolean> {
  const score = await getUserContributionScore(userId);
  return score >= TRUST_SCORE_THRESHOLD;
}

export async function moderationStatusForUser(
  userId: string
): Promise<ModerationStatus> {
  return (await isTrustedContributor(userId)) ? "approved" : "pending";
}
