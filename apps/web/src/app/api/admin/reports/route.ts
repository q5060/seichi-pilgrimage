import { NextRequest, NextResponse } from "next/server";
import {
  db,
  reports,
  users,
  spots,
  travelogues,
  anime,
} from "@seichi/db";
import { eq, desc } from "drizzle-orm";
import type { AnimeTitles } from "@seichi/shared";
import { auth } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

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

async function resolveTargetPreview(targetType: string, targetId: string) {
  switch (targetType) {
    case "spot": {
      const [spot] = await db
        .select()
        .from(spots)
        .where(eq(spots.id, targetId))
        .limit(1);
      return spot ? `${spot.nameZh}（聖地）` : targetId;
    }
    case "travelogue": {
      const [t] = await db
        .select()
        .from(travelogues)
        .where(eq(travelogues.id, targetId))
        .limit(1);
      return t ? `${t.title}（遊記）` : targetId;
    }
    case "anime": {
      const [a] = await db
        .select()
        .from(anime)
        .where(eq(anime.anilistId, Number(targetId)))
        .limit(1);
      const titles = a?.titles as AnimeTitles | undefined;
      return titles?.chinese ?? titles?.native ?? targetId;
    }
    default:
      return `${targetType}:${targetId}`;
  }
}

const REASON_LABELS: Record<string, string> = {
  incorrect_info: "資訊錯誤",
  spam: "垃圾內容",
  harassment: "騷擾或不當內容",
  copyright: "版權問題",
  other: "其他",
};

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const rows = await db
    .select({ report: reports, reporter: users })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(eq(reports.status, "pending"))
    .orderBy(desc(reports.createdAt))
    .limit(50);

  const items = await Promise.all(
    rows.map(async ({ report, reporter }) => ({
      ...report,
      reporterName: reporter.name ?? reporter.username,
      reasonLabel: REASON_LABELS[report.reason] ?? report.reason,
      targetPreview: await resolveTargetPreview(
        report.targetType,
        report.targetId
      ),
    }))
  );

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "無權限" }, { status: 403 });

  const body = await req.json();
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, body.reportId))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "找不到檢舉" }, { status: 404 });
  }

  const status = body.action === "resolve" ? "resolved" : "dismissed";
  await db
    .update(reports)
    .set({ status })
    .where(eq(reports.id, body.reportId));

  const targetPreview = await resolveTargetPreview(
    report.targetType,
    report.targetId
  );

  await createNotification({
    userId: report.reporterId,
    type: "report_resolved",
    title: status === "resolved" ? "檢舉已處理" : "檢舉已關閉",
    body:
      status === "resolved"
        ? `你檢舉的「${targetPreview}」已處理`
        : `你檢舉的「${targetPreview}」經審核後關閉`,
  });

  return NextResponse.json({ success: true });
}
