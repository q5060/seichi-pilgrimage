import { db, userFollows } from "@seichi/db";
import { eq, and, or, inArray, SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

export async function getFollowingIds(viewerId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: userFollows.followingId })
    .from(userFollows)
    .where(eq(userFollows.followerId, viewerId));
  return new Set(rows.map((r) => r.id));
}

export function canViewContent(
  privacy: string,
  ownerId: string,
  viewerId: string | undefined,
  followingIds: Set<string>
): boolean {
  if (privacy === "public") return true;
  if (!viewerId) return false;
  if (viewerId === ownerId) return true;
  if (privacy === "followers") return followingIds.has(ownerId);
  return false;
}

export function buildPrivacyFilter(
  privacyCol: AnyColumn,
  ownerCol: AnyColumn,
  viewerId: string | undefined,
  followingIds: string[]
): SQL {
  if (!viewerId) {
    return eq(privacyCol, "public");
  }
  const conditions: SQL[] = [
    eq(privacyCol, "public"),
    eq(ownerCol, viewerId),
  ];
  if (followingIds.length > 0) {
    conditions.push(
      and(eq(privacyCol, "followers"), inArray(ownerCol, followingIds))!
    );
  }
  return or(...conditions)!;
}

export function sanitizeSpotForList<T extends {
  latitude: number;
  longitude: number;
  fuzzyLatitude?: number | null;
  fuzzyLongitude?: number | null;
  isSensitive: boolean;
}>(spot: T): T {
  if (!spot.isSensitive) return spot;
  return {
    ...spot,
    latitude: spot.fuzzyLatitude ?? spot.latitude,
    longitude: spot.fuzzyLongitude ?? spot.longitude,
  };
}
