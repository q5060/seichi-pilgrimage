import { NextRequest, NextResponse } from "next/server";
import { db, spotAnimeLinks, spots } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { SpotAnimeScene } from "@seichi/shared";
import { auth } from "@/lib/auth";
import { enqueueModeration } from "@/lib/moderation";
import { isTrustedContributor } from "@/lib/trust";
import { awardContribution } from "@/lib/contribution";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id: spotId } = await params;
  const [spot] = await db.select().from(spots).where(eq(spots.id, spotId)).limit(1);
  if (!spot) {
    return NextResponse.json({ error: "找不到聖地" }, { status: 404 });
  }

  const body = await req.json();
  const updates = (body.updates ?? [body]) as Array<{
    linkId: string;
    episode?: string;
    sceneDescription?: string;
    sceneTimestamp?: string;
  }>;

  if (!updates.length || !updates[0]?.linkId) {
    return NextResponse.json({ error: "缺少 linkId" }, { status: 400 });
  }

  const trusted = await isTrustedContributor(session.user.id);
  const results = [];

  for (const update of updates) {
    const [link] = await db
      .select()
      .from(spotAnimeLinks)
      .where(eq(spotAnimeLinks.id, update.linkId))
      .limit(1);

    if (!link || link.spotId !== spotId) {
      return NextResponse.json({ error: "找不到作品連結" }, { status: 404 });
    }

    const changes: { episode?: string; scene?: SpotAnimeScene } = {};
    if (update.episode !== undefined) changes.episode = update.episode;
    if (
      update.sceneDescription !== undefined ||
      update.sceneTimestamp !== undefined
    ) {
      const currentScene = (link.scene as SpotAnimeScene | null) ?? {};
      changes.scene = {
        ...currentScene,
        ...(update.sceneDescription !== undefined
          ? { description: update.sceneDescription }
          : {}),
        ...(update.sceneTimestamp !== undefined
          ? { timestamp: update.sceneTimestamp }
          : {}),
        ...(update.episode !== undefined ? { episode: update.episode } : {}),
      };
    }

    if (Object.keys(changes).length === 0) continue;

    if (trusted) {
      await db
        .update(spotAnimeLinks)
        .set(changes)
        .where(eq(spotAnimeLinks.id, update.linkId));

      await awardContribution(session.user.id, "spot_link_edit");
      results.push({ linkId: update.linkId, autoApproved: true });
    } else {
      await enqueueModeration({
        targetType: "spot_link_edit",
        targetId: update.linkId,
        submittedById: session.user.id,
        payload: {
          spotId,
          linkId: update.linkId,
          anilistId: link.anilistId,
          changes,
          summary: `話數/場景：${update.episode ?? changes.scene?.description ?? "更新"}`,
        },
      });
      results.push({ linkId: update.linkId, autoApproved: false });
    }
  }

  if (results.length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const allApproved = results.every((r) => r.autoApproved);
  return NextResponse.json({
    results,
    autoApproved: allApproved,
    message: allApproved
      ? "話數資訊已更新"
      : "話數編輯提案已提交審核",
  });
}
