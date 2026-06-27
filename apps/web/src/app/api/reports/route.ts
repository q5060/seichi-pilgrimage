import { NextRequest, NextResponse } from "next/server";
import { db, reports } from "@seichi/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const { targetType, targetId, reason, details } = body;

  if (!targetType || !targetId || !reason) {
    return NextResponse.json({ error: "缺少必要欄位" }, { status: 400 });
  }

  const [report] = await db
    .insert(reports)
    .values({
      reporterId: session.user.id,
      targetType,
      targetId: String(targetId),
      reason,
      details: details ?? null,
      status: "pending",
    })
    .returning();

  return NextResponse.json(
    { report, message: "檢舉已提交，感謝你的回報" },
    { status: 201 }
  );
}
