import { db, moderationQueue } from "@seichi/db";

export async function enqueueModeration(params: {
  targetType: string;
  targetId: string;
  submittedById?: string;
  payload?: Record<string, unknown>;
}) {
  const [item] = await db
    .insert(moderationQueue)
    .values({
      targetType: params.targetType,
      targetId: params.targetId,
      submittedById: params.submittedById,
      payload: params.payload,
      status: "pending",
    })
    .returning();
  return item;
}
