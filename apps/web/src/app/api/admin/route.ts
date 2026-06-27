import { NextRequest, NextResponse } from "next/server";
import {
  db,
  moderationQueue,
  spots,
  spotVersions,
  spotAnimeLinks,
  locationReports,
  users,
  activities,
} from "@seichi/db";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { triggerSpotIndexing } from "@/lib/indexing";
import { updatePilgrimageMeta } from "@/lib/anime-sync";
import { awardContribution } from "@/lib/contribution";
import {
  notifyAnimeFollowers,
  notifyRegionFollowers,
} from "@/lib/notifications";
import { notifyModerationResult } from "@/lib/notifications-extended";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user || (user.role !== "admin" && user.role !== "moderator")) return null;
  return session;
}

async function getSpotAnilistIds(spotId: string) {
  const links = await db
    .select({ anilistId: spotAnimeLinks.anilistId })
    .from(spotAnimeLinks)
    .where(eq(spotAnimeLinks.spotId, spotId));
  return links.map((l) => l.anilistId);
}

async function notifyNewSpot(spot: { id: string; nameZh: string; prefecture: string }) {
  const anilistIds = await getSpotAnilistIds(spot.id);
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

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const pending = await db
    .select()
    .from(moderationQueue)
    .where(eq(moderationQueue.status, "pending"))
    .orderBy(desc(moderationQueue.createdAt))
    .limit(50);

  return NextResponse.json(pending);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const body = await req.json();

  const [queueItem] = await db
    .select()
    .from(moderationQueue)
    .where(eq(moderationQueue.id, body.queueId))
    .limit(1);

  if (!queueItem) {
    return NextResponse.json({ error: "找不到審核項目" }, { status: 404 });
  }

  await db
    .update(moderationQueue)
    .set({
      status: body.approved ? "approved" : "rejected",
      reviewerId: session.user!.id,
      reviewNotes: body.notes,
      reviewedAt: new Date(),
    })
    .where(eq(moderationQueue.id, body.queueId));

  const targetType = queueItem.targetType;
  const targetId = queueItem.targetId;
  const payload = queueItem.payload as Record<string, unknown> | null;

  if (body.approved) {
    if (targetType === "spot") {
      const [spot] = await db
        .select()
        .from(spots)
        .where(eq(spots.id, targetId))
        .limit(1);

      if (spot) {
        await db
          .update(spots)
          .set({ moderationStatus: "approved", updatedAt: new Date() })
          .where(eq(spots.id, targetId));

        await db.insert(spotVersions).values({
          spotId: targetId,
          editorId: queueItem.submittedById ?? session.user!.id,
          snapshot: spot as unknown as Record<string, unknown>,
          changeSummary: "審核通過",
          moderationStatus: "approved",
        });

        triggerSpotIndexing(targetId);
        await notifyNewSpot(spot);

        if (queueItem.submittedById) {
          await awardContribution(queueItem.submittedById, "spot_created");
        }
      }
    } else if (targetType === "spot_edit") {
      const spotId = (payload?.spotId as string) ?? targetId;
      if (payload?.changes) {
        const [before] = await db
          .select()
          .from(spots)
          .where(eq(spots.id, spotId))
          .limit(1);

        await db
          .update(spots)
          .set({ ...(payload.changes as object), updatedAt: new Date() })
          .where(eq(spots.id, spotId));

        const [version] = await db.insert(spotVersions).values({
          spotId,
          editorId: queueItem.submittedById ?? session.user!.id,
          snapshot: payload.changes as Record<string, unknown>,
          changeSummary: (payload.summary as string) ?? "編輯提案",
          moderationStatus: "approved",
        }).returning();

        triggerSpotIndexing(spotId);

        await db.insert(activities).values({
          userId: queueItem.submittedById ?? session.user!.id,
          type: "spot_edit",
          targetId: spotId,
          metadata: {
            versionId: version.id,
            changeSummary: (payload.summary as string) ?? "編輯提案",
          },
        });

        if (before && queueItem.submittedById) {
          await notifyModerationResult({
            userId: queueItem.submittedById,
            approved: true,
            targetLabel: `聖地「${before.nameZh}」編輯已通過`,
            link: `/spots/${spotId}`,
          });
          await awardContribution(queueItem.submittedById, "spot_edit");
        }
      }
    } else if (targetType === "spot_link_edit" && payload?.changes) {
      const linkId = (payload.linkId as string) ?? targetId;
      await db
        .update(spotAnimeLinks)
        .set(payload.changes as object)
        .where(eq(spotAnimeLinks.id, linkId));

      if (queueItem.submittedById) {
        await notifyModerationResult({
          userId: queueItem.submittedById,
          approved: true,
          targetLabel: "聖地話數/場景編輯已通過",
          link: payload.spotId
            ? `/spots/${payload.spotId as string}`
            : undefined,
        });
        await awardContribution(queueItem.submittedById, "spot_link_edit");
      }
    } else if (targetType === "anime_meta" && payload?.changes) {
      const anilistId = payload.anilistId as number;
      await updatePilgrimageMeta(anilistId, payload.changes as object);

      if (queueItem.submittedById) {
        await notifyModerationResult({
          userId: queueItem.submittedById,
          approved: true,
          targetLabel: "作品巡禮資訊編輯已通過",
          link: `/anime/${anilistId}`,
        });
        await awardContribution(queueItem.submittedById, "anime_meta");
      }
    } else if (targetType === "location_report" && payload) {
      const spotId = payload.spotId as string;
      const reportType = payload.reportType as string;
      const statusMap: Record<string, string> = {
        still_open: "open",
        closed: "closed",
        renovated: "renovated",
        restricted: "restricted",
      };
      const newStatus = statusMap[reportType];

      if (spotId && newStatus) {
        await db
          .update(spots)
          .set({
            status: newStatus as "open",
            lastConfirmedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(spots.id, spotId));
        triggerSpotIndexing(spotId);
      }

      await db
        .update(locationReports)
        .set({ moderationStatus: "approved" })
        .where(eq(locationReports.id, targetId));

      const [spot] = spotId
        ? await db.select().from(spots).where(eq(spots.id, spotId)).limit(1)
        : [undefined];

      if (queueItem.submittedById) {
        await notifyModerationResult({
          userId: queueItem.submittedById,
          approved: true,
          targetLabel: spot
            ? `聖地「${spot.nameZh}」現況回報已通過`
            : "現況回報已通過",
          link: spot ? `/spots/${spot.id}` : undefined,
        });
        await awardContribution(queueItem.submittedById, "location_report");
      }
    }
  } else {
    if (targetType === "spot") {
      await db
        .update(spots)
        .set({ moderationStatus: "rejected" })
        .where(eq(spots.id, targetId));
      triggerSpotIndexing(targetId);

      const [spot] = await db
        .select()
        .from(spots)
        .where(eq(spots.id, targetId))
        .limit(1);

      if (queueItem.submittedById && spot) {
        await notifyModerationResult({
          userId: queueItem.submittedById,
          approved: false,
          targetLabel: `聖地「${spot.nameZh}」未通過審核`,
        });
      }
    } else if (targetType === "spot_edit" && queueItem.submittedById) {
      const spotId = (payload?.spotId as string) ?? targetId;
      const [spot] = await db
        .select()
        .from(spots)
        .where(eq(spots.id, spotId))
        .limit(1);

      await notifyModerationResult({
        userId: queueItem.submittedById,
        approved: false,
        targetLabel: spot
          ? `聖地「${spot.nameZh}」編輯未通過審核`
          : "聖地編輯未通過審核",
        link: spot ? `/spots/${spotId}` : undefined,
      });
    } else if (targetType === "spot_link_edit" && queueItem.submittedById) {
      await notifyModerationResult({
        userId: queueItem.submittedById,
        approved: false,
        targetLabel: "聖地話數/場景編輯未通過審核",
        link: payload?.spotId
          ? `/spots/${payload.spotId as string}`
          : undefined,
      });
    } else if (targetType === "anime_meta" && queueItem.submittedById) {
      await notifyModerationResult({
        userId: queueItem.submittedById,
        approved: false,
        targetLabel: "作品巡禮資訊編輯未通過審核",
        link: payload?.anilistId
          ? `/anime/${payload.anilistId}`
          : undefined,
      });
    } else if (targetType === "location_report") {
      await db
        .update(locationReports)
        .set({ moderationStatus: "rejected" })
        .where(eq(locationReports.id, targetId));

      if (queueItem.submittedById) {
        const spotId = payload?.spotId as string | undefined;
        await notifyModerationResult({
          userId: queueItem.submittedById,
          approved: false,
          targetLabel: "現況回報未通過審核",
          link: spotId ? `/spots/${spotId}` : undefined,
        });
      }
    }
  }

  if (body.approved && targetType === "spot" && queueItem.submittedById) {
    const [spot] = await db
      .select()
      .from(spots)
      .where(eq(spots.id, targetId))
      .limit(1);

    if (spot) {
      await notifyModerationResult({
        userId: queueItem.submittedById,
        approved: true,
        targetLabel: `聖地「${spot.nameZh}」已通過審核`,
        link: `/spots/${spot.id}`,
      });
    }
  }

  return NextResponse.json({ success: true });
}
