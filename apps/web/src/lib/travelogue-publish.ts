import { db, activities, visits } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { TravelogueBlock } from "@seichi/db";
import { grantAchievement } from "@/lib/achievements";
import { updateAnimeProgressForUser } from "@/lib/pilgrimage-progress";
import { triggerTravelogueIndexing } from "@/lib/indexing";
import { createNotification } from "@/lib/notifications";
import { notifyFollowersOfActivity } from "@/lib/notifications-extended";
import { awardContribution } from "@/lib/contribution";

export async function handleTraveloguePublish(params: {
  userId: string;
  travelogueId: string;
  slug: string;
  title: string;
  content: TravelogueBlock[];
  syncVisits?: boolean;
}) {
  await grantAchievement(params.userId, "first_travelogue");
  await awardContribution(params.userId, "travelogue_published");

  await db.insert(activities).values({
    userId: params.userId,
    type: "travelogue",
    targetId: params.travelogueId,
    metadata: { slug: params.slug },
  });

  triggerTravelogueIndexing(params.travelogueId);

  await notifyFollowersOfActivity({
    actorId: params.userId,
    type: "travelogue",
    title: "追蹤對象發布了遊記",
    body: params.title,
    link: `/travelogue/${params.slug}`,
  });

  if (params.syncVisits) {
    const spotIds = new Set<string>();
    for (const block of params.content) {
      if (block.type === "spot_card") {
        const spotId = (block.data as { spotId?: string }).spotId;
        if (spotId) spotIds.add(spotId);
      }
    }

    if (spotIds.size > 0) {
      const userVisits = await db
        .select({ spotId: visits.spotId })
        .from(visits)
        .where(eq(visits.userId, params.userId));

      const visitedSet = new Set(userVisits.map((v) => v.spotId));

      for (const spotId of spotIds) {
        if (visitedSet.has(spotId)) continue;

        await db.insert(visits).values({
          userId: params.userId,
          spotId,
          visitedAt: new Date(),
          privacy: "public",
          notes: `透過遊記「${params.title}」同步打卡`,
        });
        await updateAnimeProgressForUser(params.userId, spotId);
      }
    }
  }

  await createNotification({
    userId: params.userId,
    type: "travelogue_published",
    title: "遊記已發布",
    body: params.title,
    link: `/travelogue/${params.slug}`,
  });
}
