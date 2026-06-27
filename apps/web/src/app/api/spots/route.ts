import { NextRequest, NextResponse } from "next/server";
import { db, spots, spotAnimeLinks } from "@seichi/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { enqueueModeration } from "@/lib/moderation";
import { sanitizeSpotForList } from "@/lib/privacy";
import { moderationStatusForUser } from "@/lib/trust";
import {
  notifyAnimeFollowers,
  notifyRegionFollowers,
} from "@/lib/notifications";
import { triggerSpotIndexing } from "@/lib/indexing";
import { awardContribution } from "@/lib/contribution";
import { enrichSpotsWithThumbnails } from "@/lib/thumbnails";
import { slugify } from "@/lib/utils";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const prefecture = searchParams.get("prefecture");
  const anilistId = searchParams.get("anilistId");
  const cursor = Number(searchParams.get("cursor") ?? 0);
  const limit = Math.min(
    Number(searchParams.get("limit") ?? DEFAULT_LIMIT),
    MAX_LIMIT
  );

  if (anilistId) {
    const results = await db
      .select({ spot: spots })
      .from(spotAnimeLinks)
      .innerJoin(spots, eq(spotAnimeLinks.spotId, spots.id))
      .where(
        and(
          eq(spotAnimeLinks.anilistId, Number(anilistId)),
          eq(spots.moderationStatus, "approved")
        )
      )
      .offset(cursor)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const items = await enrichSpotsWithThumbnails(
      results.slice(0, limit).map((r) => sanitizeSpotForList(r.spot))
    );
    return NextResponse.json({
      items: items.map((spot) => ({
        ...spot,
        coverPhotoUrl: spot.thumbnailUrl,
      })),
      nextCursor: hasMore ? cursor + limit : null,
    });
  }

  const conditions = [eq(spots.moderationStatus, "approved")];
  if (prefecture) conditions.push(eq(spots.prefecture, prefecture));

  const results = await db
    .select()
    .from(spots)
    .where(and(...conditions))
    .offset(cursor)
    .limit(limit + 1);

  const hasMore = results.length > limit;
  const page = await enrichSpotsWithThumbnails(
    results.slice(0, limit).map(sanitizeSpotForList)
  );

  return NextResponse.json({
    items: page.map((spot) => ({
      ...spot,
      coverPhotoUrl: spot.thumbnailUrl,
    })),
    nextCursor: hasMore ? cursor + limit : null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const modStatus = await moderationStatusForUser(session.user.id);
  const slug = body.slug || slugify(body.nameZh);

  const [spot] = await db
    .insert(spots)
    .values({
      nameZh: body.nameZh,
      nameJa: body.nameJa,
      slug,
      latitude: body.latitude,
      longitude: body.longitude,
      prefecture: body.prefecture,
      address: body.address,
      googleMapsUrl: body.googleMapsUrl,
      accessType: body.accessType ?? "uncertain",
      transportNotes: body.transportNotes,
      nearestStation: body.nearestStation,
      walkMinutes: body.walkMinutes,
      suggestedStayMinutes: body.suggestedStayMinutes,
      etiquetteNotes: body.etiquetteNotes,
      photoTips: body.photoTips,
      bestSeason: body.bestSeason,
      bestTimeOfDay: body.bestTimeOfDay,
      createdById: session.user.id,
      moderationStatus: modStatus,
    })
    .returning();

  const anilistIds: number[] = body.anilistIds ?? [];
  if (anilistIds.length) {
    for (const aid of anilistIds) {
      await db.insert(spotAnimeLinks).values({
        spotId: spot.id,
        anilistId: aid,
        episode: body.episode,
        proposedById: session.user.id,
        moderationStatus: modStatus,
      });
    }
  }

  if (modStatus === "pending") {
    await enqueueModeration({
      targetType: "spot",
      targetId: spot.id,
      submittedById: session.user.id,
      payload: { spot, anilistIds },
    });
  } else {
    triggerSpotIndexing(spot.id);
    await awardContribution(session.user.id, "spot_created");
    await notifyAnimeFollowers({
      anilistIds,
      title: "追蹤作品有新聖地",
      body: `${spot.nameZh} 已新增`,
      link: `/spots/${spot.id}`,
    });
    await notifyRegionFollowers({
      prefecture: spot.prefecture,
      title: "追蹤地區有新聖地",
      body: `${spot.nameZh}（${spot.prefecture}）`,
      link: `/spots/${spot.id}`,
    });
  }

  return NextResponse.json(
    {
      ...spot,
      autoApproved: modStatus === "approved",
      message:
        modStatus === "approved"
          ? "聖地已發布（信任分數自動核准）"
          : "聖地已提交，等待審核",
    },
    { status: 201 }
  );
}
