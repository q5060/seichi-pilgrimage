import { db, userFollows } from "@seichi/db";
import { eq } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";

export async function notifyFollowersOfActivity(params: {
  actorId: string;
  type: string;
  title: string;
  body: string;
  link: string;
}) {
  const followers = await db
    .select({ userId: userFollows.followerId })
    .from(userFollows)
    .where(eq(userFollows.followingId, params.actorId));

  for (const { userId } of followers) {
    if (userId === params.actorId) continue;
    await createNotification({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    });
  }
}

export async function notifyModerationResult(params: {
  userId: string;
  approved: boolean;
  targetLabel: string;
  link?: string;
}) {
  await createNotification({
    userId: params.userId,
    type: "moderation",
    copyKey: params.approved ? "moderation_approved" : "moderation_rejected",
    copyVars: { targetTitle: params.targetLabel },
    link: params.link,
  });
}
