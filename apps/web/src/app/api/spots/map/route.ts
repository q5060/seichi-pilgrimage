import { NextRequest, NextResponse } from "next/server";
import { db, spots, spotAnimeLinks, visits } from "@seichi/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sanitizeSpotForList } from "@/lib/privacy";
import { enrichSpotsWithThumbnails } from "@/lib/thumbnails";
import { cacheFetch } from "@/lib/cache";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;
const MAP_CACHE_TTL_MS = 30 * 1000;

type SpotRow = {
  id: string;
  nameZh: string;
  nameJa: string | null;
  prefecture: string;
  latitude: number;
  longitude: number;
  fuzzyLatitude: number | null;
  fuzzyLongitude: number | null;
  isSensitive: boolean;
};

function buildSpotConditions(
  prefecture: string | null,
  bounds: string | null,
  spotIdsFilter: string[] | null
) {
  const conditions = [eq(spots.moderationStatus, "approved")];

  if (prefecture) {
    conditions.push(eq(spots.prefecture, prefecture));
  }

  if (bounds) {
    const parts = bounds.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      const [swLat, swLng, neLat, neLng] = parts;
      conditions.push(
        gte(spots.latitude, swLat),
        lte(spots.latitude, neLat),
        gte(spots.longitude, swLng),
        lte(spots.longitude, neLng)
      );
    }
  }

  if (spotIdsFilter) {
    conditions.push(inArray(spots.id, spotIdsFilter));
  }

  return conditions;
}

async function fetchMapSpots(
  conditions: ReturnType<typeof buildSpotConditions>,
  limit: number
): Promise<SpotRow[]> {
  return db
    .select({
      id: spots.id,
      nameZh: spots.nameZh,
      nameJa: spots.nameJa,
      prefecture: spots.prefecture,
      latitude: spots.latitude,
      longitude: spots.longitude,
      fuzzyLatitude: spots.fuzzyLatitude,
      fuzzyLongitude: spots.fuzzyLongitude,
      isSensitive: spots.isSensitive,
    })
    .from(spots)
    .where(and(...conditions))
    .limit(limit);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const prefecture = searchParams.get("prefecture");
  const anilistId = searchParams.get("anilistId");
  const visitedOnly = searchParams.get("visited") === "true";
  const bounds = searchParams.get("bounds");
  const limit = Math.min(
    Number(searchParams.get("limit") ?? DEFAULT_LIMIT),
    MAX_LIMIT
  );

  const session = await auth();
  let spotIdsFilter: string[] | null = null;

  if (anilistId) {
    const links = await db
      .select({ spotId: spotAnimeLinks.spotId })
      .from(spotAnimeLinks)
      .where(eq(spotAnimeLinks.anilistId, Number(anilistId)));
    spotIdsFilter = links.map((l) => l.spotId);
    if (spotIdsFilter.length === 0) {
      return NextResponse.json({ markers: [] });
    }
  }

  const baseConditions = buildSpotConditions(prefecture, bounds, spotIdsFilter);

  let visitedSet = new Set<string>();
  if (session?.user?.id) {
    const visitConditions = [
      eq(visits.userId, session.user.id),
      ...baseConditions,
    ];

    const userVisitsInView = await db
      .select({ spotId: visits.spotId })
      .from(visits)
      .innerJoin(spots, eq(visits.spotId, spots.id))
      .where(and(...visitConditions));

    visitedSet = new Set(userVisitsInView.map((v) => v.spotId));

    if (visitedOnly) {
      const ids = [...visitedSet];
      if (ids.length === 0) return NextResponse.json({ markers: [] });
      baseConditions.push(inArray(spots.id, ids));
    }
  } else if (visitedOnly) {
    return NextResponse.json({ markers: [] });
  }

  const cacheKey = `map:${bounds ?? "all"}:${prefecture ?? "all"}:${anilistId ?? "all"}:${limit}:${visitedOnly ? "visited" : "all"}`;
  const results = visitedOnly
    ? await fetchMapSpots(baseConditions, limit)
    : await cacheFetch(
        cacheKey,
        () => fetchMapSpots(baseConditions, limit),
        MAP_CACHE_TTL_MS
      );

  const sanitized = results.map(sanitizeSpotForList);
  const enriched = await enrichSpotsWithThumbnails(sanitized);

  const markers = enriched.map((spot) => ({
    id: spot.id,
    nameZh: spot.nameZh,
    nameJa: spot.nameJa ?? null,
    lat: spot.latitude,
    lng: spot.longitude,
    prefecture: spot.prefecture,
    coverPhotoUrl: spot.thumbnailUrl ?? null,
    visited: visitedSet.has(spot.id),
  }));

  return NextResponse.json({ markers });
}
