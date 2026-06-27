import { db, userFollows, notifications } from "@seichi/db";
import { eq } from "drizzle-orm";
import { sendPush } from "@/lib/push";

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
    await db.insert(notifications).values({
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link,
    });
    void sendPush(userId, {
      title: params.title,
      body: params.body,
      url: params.link,
    });
  }
}

export async function notifyModerationResult(params: {
  userId: string;
  approved: boolean;
  targetLabel: string;
  link?: string;
}) {
  await db.insert(notifications).values({
    userId: params.userId,
    type: "moderation",
    title: params.approved ? "審核通過" : "審核未通過",
    body: params.targetLabel,
    link: params.link,
  });
}
