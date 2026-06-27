import { db, photos, activities } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { SavedImage } from "@/lib/storage";
import { grantAchievement } from "@/lib/achievements";
import { awardContribution } from "@/lib/contribution";
import { notifyFollowersOfActivity } from "@/lib/notifications-extended";

export async function registerPhoto(params: {
  userId: string;
  saved: SavedImage;
  spotId?: string | null;
  visitId?: string | null;
  travelogueId?: string | null;
  caption?: string | null;
  isComparison?: boolean;
  comparisonScreenshotUrl?: string | null;
  altText?: string | null;
  privacy?: "public" | "followers" | "private";
}) {
  const privacy = params.privacy ?? "public";
  const isComparison = params.isComparison ?? false;

  const [photo] = await db
    .insert(photos)
    .values({
      userId: params.userId,
      spotId: params.spotId ?? null,
      visitId: params.visitId ?? null,
      travelogueId: params.travelogueId ?? null,
      url: params.saved.url,
      thumbnailUrl: params.saved.thumbnailUrl,
      width: params.saved.width,
      height: params.saved.height,
      caption: params.caption ?? null,
      tag: isComparison ? "comparison" : "scenery",
      isComparison,
      comparisonScreenshotUrl: params.comparisonScreenshotUrl ?? null,
      altText: params.altText ?? null,
      privacy,
    })
    .returning();

  await db.insert(activities).values({
    userId: params.userId,
    type: "photo",
    targetId: photo.id,
    metadata: { spotId: photo.spotId },
  });

  await awardContribution(params.userId, "photo_upload");

  if (privacy === "public") {
    await notifyFollowersOfActivity({
      actorId: params.userId,
      type: "photo",
      title: "追蹤對象上傳了照片",
      body: photo.caption ?? (photo.spotId ? "聖地照片" : "巡禮照片"),
      link: photo.spotId
        ? `/spots/${photo.spotId}`
        : `/users/${params.userId}`,
    });
  }

  if (isComparison) {
    const comparisonPhotos = await db
      .select()
      .from(photos)
      .where(eq(photos.userId, params.userId));
    const compCount = comparisonPhotos.filter((p) => p.isComparison).length;
    if (compCount >= 5) await grantAchievement(params.userId, "photo_comparison");
  }

  return photo;
}
