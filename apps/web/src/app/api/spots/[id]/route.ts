import { NextRequest, NextResponse } from "next/server";
import {
  db,
  spots,
  spotAnimeLinks,
  anime,
  locationReports,
  visits,
  photos,
  spotVersions,
  users,
} from "@seichi/db";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { enqueueModeration } from "@/lib/moderation";
import { isTrustedContributor } from "@/lib/trust";
import { triggerSpotIndexing } from "@/lib/indexing";
import { awardContribution } from "@/lib/contribution";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [spot] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  if (!spot) return NextResponse.json({ error: "找不到聖地" }, { status: 404 });

  const links = await db
    .select({ link: spotAnimeLinks, anime: anime })
    .from(spotAnimeLinks)
    .innerJoin(anime, eq(spotAnimeLinks.anilistId, anime.anilistId))
    .where(eq(spotAnimeLinks.spotId, id));

  const reports = await db
    .select()
    .from(locationReports)
    .where(eq(locationReports.spotId, id))
    .orderBy(desc(locationReports.createdAt))
    .limit(10);

  const spotPhotos = await db
    .select()
    .from(photos)
    .where(eq(photos.spotId, id))
    .orderBy(desc(photos.createdAt))
    .limit(20);

  const visitCount = await db
    .select()
    .from(visits)
    .where(eq(visits.spotId, id));

  const versions = await db
    .select({
      version: spotVersions,
      editor: { id: users.id, name: users.name },
    })
    .from(spotVersions)
    .innerJoin(users, eq(spotVersions.editorId, users.id))
    .where(eq(spotVersions.spotId, id))
    .orderBy(desc(spotVersions.createdAt))
    .limit(20);

  return NextResponse.json({
    ...spot,
    animeLinks: links,
    reports,
    photos: spotPhotos,
    visitCount: visitCount.length,
    versions,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const [existing] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "找不到聖地" }, { status: 404 });
  }

  const body = await req.json();
  const trusted = await isTrustedContributor(session.user.id);
  const modStatus = trusted ? "approved" : "pending";

  const proposedChanges: Record<string, unknown> = {};
  const editableFields = [
    "nameZh",
    "nameJa",
    "address",
    "prefecture",
    "latitude",
    "longitude",
    "fuzzyLatitude",
    "fuzzyLongitude",
    "isSensitive",
    "googleMapsUrl",
    "osmUrl",
    "accessType",
    "status",
    "transportNotes",
    "nearestStation",
    "walkMinutes",
    "suggestedStayMinutes",
    "businessHours",
    "photoTips",
    "bestSeason",
    "bestTimeOfDay",
    "focalLengthSuggestion",
    "alignmentDifficulty",
    "etiquetteNotes",
  ] as const;

  for (const field of editableFields) {
    if (body[field] !== undefined) {
      proposedChanges[field] = body[field];
    }
  }

  if (Object.keys(proposedChanges).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const changeSummary =
    body.changeSummary ?? Object.keys(proposedChanges).join("、");

  const [version] = await db
    .insert(spotVersions)
    .values({
      spotId: id,
      editorId: session.user.id,
      snapshot: { before: existing, after: proposedChanges },
      changeSummary,
      moderationStatus: modStatus,
    })
    .returning();

  if (trusted) {
    await db
      .update(spots)
      .set({ ...proposedChanges, updatedAt: new Date() })
      .where(eq(spots.id, id));

    const [updated] = await db
      .select()
      .from(spots)
      .where(eq(spots.id, id))
      .limit(1);

    triggerSpotIndexing(id);
    await awardContribution(session.user.id, "spot_edit");

    return NextResponse.json({
      spot: updated,
      version,
      autoApproved: true,
      message: "編輯已自動核准並套用",
    });
  }

  await enqueueModeration({
    targetType: "spot_edit",
    targetId: version.id,
    submittedById: session.user.id,
    payload: { spotId: id, versionId: version.id, changes: proposedChanges },
  });

  return NextResponse.json({
    version,
    autoApproved: false,
    message: "編輯提案已提交審核",
  });
}
