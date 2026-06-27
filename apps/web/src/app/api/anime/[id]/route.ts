import { NextRequest, NextResponse } from "next/server";
import { getOrSyncAnime, updatePilgrimageMeta } from "@/lib/anime-sync";
import { db, spots, spotAnimeLinks, animePilgrimageMeta, userAnimeStatus } from "@seichi/db";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { enqueueModeration } from "@/lib/moderation";
import { isTrustedContributor } from "@/lib/trust";
import { awardContribution } from "@/lib/contribution";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const anilistId = Number(id);

  const animeData = await getOrSyncAnime(anilistId);
  if (!animeData) return NextResponse.json({ error: "找不到作品" }, { status: 404 });

  const [meta] = await db
    .select()
    .from(animePilgrimageMeta)
    .where(eq(animePilgrimageMeta.anilistId, anilistId))
    .limit(1);

  const spotLinks = await db
    .select({ link: spotAnimeLinks, spot: spots })
    .from(spotAnimeLinks)
    .innerJoin(spots, eq(spotAnimeLinks.spotId, spots.id))
    .where(eq(spotAnimeLinks.anilistId, anilistId));

  let userStatus = null;
  const session = await auth();
  if (session?.user?.id) {
    const [status] = await db
      .select()
      .from(userAnimeStatus)
      .where(
        and(
          eq(userAnimeStatus.userId, session.user.id),
          eq(userAnimeStatus.anilistId, anilistId)
        )
      )
      .limit(1);
    userStatus = status ?? null;
  }

  return NextResponse.json({ anime: animeData, meta, spots: spotLinks, userStatus });
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
  const anilistId = Number(id);
  const body = await req.json();

  if (body.pilgrimageStatus) {
    const existing = await db
      .select()
      .from(userAnimeStatus)
      .where(
        and(
          eq(userAnimeStatus.userId, session.user.id),
          eq(userAnimeStatus.anilistId, anilistId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userAnimeStatus)
        .set({
          status: body.pilgrimageStatus,
          score: body.score,
          review: body.review,
          updatedAt: new Date(),
        })
        .where(eq(userAnimeStatus.id, existing[0].id));
    } else {
      await db.insert(userAnimeStatus).values({
        userId: session.user.id,
        anilistId,
        status: body.pilgrimageStatus,
        score: body.score,
        review: body.review,
        tags: body.tags,
      });
    }
  }

  if (body.meta) {
    const changes: Record<string, unknown> = {};
    if (body.meta.suggestedDays !== undefined) {
      changes.suggestedDays = body.meta.suggestedDays;
    }
    if (body.meta.etiquetteNotes !== undefined) {
      changes.etiquetteNotes = body.meta.etiquetteNotes;
    }
    if (body.meta.customTitle !== undefined) {
      changes.customTitle = body.meta.customTitle;
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
    }

    const trusted = await isTrustedContributor(session.user.id);

    if (trusted) {
      await updatePilgrimageMeta(anilistId, changes);
      await awardContribution(session.user.id, "anime_meta");
      return NextResponse.json({
        success: true,
        autoApproved: true,
        message: "巡禮資訊已更新",
      });
    }

    await enqueueModeration({
      targetType: "anime_meta",
      targetId: String(anilistId),
      submittedById: session.user.id,
      payload: { anilistId, changes },
    });

    return NextResponse.json({
      success: true,
      autoApproved: false,
      message: "巡禮資訊編輯已提交審核",
    });
  }

  return NextResponse.json({ success: true });
}
