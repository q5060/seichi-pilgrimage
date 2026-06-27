import { db, photos } from "@seichi/db";
import type { TravelogueBlock } from "@seichi/db";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

export function getTravelogueCoverUrl(
  blocks: TravelogueBlock[] | null | undefined
): string | null {
  if (!blocks?.length) return null;

  for (const block of blocks) {
    const data = block.data as Record<string, unknown>;

    switch (block.type) {
      case "photo_gallery": {
        const urls = (data.urls as string[]) ?? [];
        if (urls[0]) return urls[0];
        break;
      }
      case "comparison":
        if (data.photoUrl) return data.photoUrl as string;
        if (data.screenshotUrl) return data.screenshotUrl as string;
        break;
      case "paragraph":
        if (data.html) {
          const match = (data.html as string).match(/<img[^>]+src="([^"]+)"/);
          if (match?.[1]) return match[1];
        }
        break;
    }
  }

  return null;
}

export async function getSpotCoverPhotoUrls(
  spotIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (spotIds.length === 0) return map;

  const rows = await db
    .selectDistinctOn([photos.spotId], {
      spotId: photos.spotId,
      thumbnailUrl: photos.thumbnailUrl,
      url: photos.url,
    })
    .from(photos)
    .where(
      and(
        inArray(photos.spotId, spotIds),
        eq(photos.privacy, "public"),
        isNotNull(photos.spotId)
      )
    )
    .orderBy(photos.spotId, desc(photos.createdAt));

  for (const row of rows) {
    if (row.spotId) {
      map.set(row.spotId, row.thumbnailUrl ?? row.url ?? null);
    }
  }

  return map;
}

export async function enrichSpotsWithThumbnails<T extends { id: string }>(
  items: T[]
): Promise<(T & { thumbnailUrl: string | null })[]> {
  const covers = await getSpotCoverPhotoUrls(items.map((i) => i.id));
  return items.map((item) => ({
    ...item,
    thumbnailUrl: covers.get(item.id) ?? null,
  }));
}

export function enrichTraveloguesWithCover<T extends { content?: unknown }>(
  items: T[]
): (T & { coverUrl: string | null })[] {
  return items.map((item) => ({
    ...item,
    coverUrl: getTravelogueCoverUrl(item.content as TravelogueBlock[]),
  }));
}
