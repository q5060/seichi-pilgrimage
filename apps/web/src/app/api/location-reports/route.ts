import { NextRequest, NextResponse } from "next/server";
import { db, locationReports, spots, users, activities } from "@seichi/db";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { grantAchievement } from "@/lib/achievements";
import { awardContribution } from "@/lib/contribution";
import { enqueueModeration } from "@/lib/moderation";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const needsModeration = body.reportType === "closed";
  const moderationStatus = needsModeration ? "pending" : "approved";

  const [report] = await db
    .insert(locationReports)
    .values({
      spotId: body.spotId,
      userId: session.user.id,
      reportType: body.reportType,
      notes: body.notes,
      visitedAt: body.visitedAt ? new Date(body.visitedAt) : new Date(),
      moderationStatus,
    })
    .returning();

  if (needsModeration) {
    await enqueueModeration({
      targetType: "location_report",
      targetId: report.id,
      submittedById: session.user.id,
      payload: {
        spotId: body.spotId,
        reportType: body.reportType,
        notes: body.notes,
      },
    });

    return NextResponse.json(
      { ...report, message: "關閉回報已提交審核" },
      { status: 201 }
    );
  }

  const statusMap: Record<string, string> = {
    still_open: "open",
    closed: "closed",
    renovated: "renovated",
    restricted: "restricted",
  };
  if (statusMap[body.reportType]) {
    await db
      .update(spots)
      .set({
        status: statusMap[body.reportType] as "open",
        lastConfirmedAt: new Date(),
      })
      .where(eq(spots.id, body.spotId));
  }

  await awardContribution(session.user.id, "location_report");

  const allReports = await db
    .select()
    .from(locationReports)
    .where(eq(locationReports.userId, session.user.id));

  if (allReports.length >= 10) await grantAchievement(session.user.id, "contributor_10");
  if (allReports.length >= 50) await grantAchievement(session.user.id, "contributor_50");

  await db.insert(activities).values({
    userId: session.user.id,
    type: "location_report",
    targetId: report.id,
    metadata: { spotId: body.spotId },
  });

  return NextResponse.json(report, { status: 201 });
}

export async function GET(req: NextRequest) {
  const spotId = req.nextUrl.searchParams.get("spotId");
  if (!spotId) return NextResponse.json({ error: "需要 spotId" }, { status: 400 });

  const reports = await db
    .select({ report: locationReports, user: users })
    .from(locationReports)
    .innerJoin(users, eq(locationReports.userId, users.id))
    .where(eq(locationReports.spotId, spotId))
    .orderBy(desc(locationReports.createdAt))
    .limit(20);

  return NextResponse.json(reports);
}
