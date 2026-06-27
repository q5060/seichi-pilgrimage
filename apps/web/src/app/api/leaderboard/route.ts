import { NextRequest, NextResponse } from "next/server";
import { db, users, visits, spots } from "@seichi/db";
import { eq, desc, sql, count } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "contribution";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 100);

  if (type === "contribution") {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        score: users.contributionScore,
      })
      .from(users)
      .where(eq(users.showOnLeaderboard, true))
      .orderBy(desc(users.contributionScore))
      .limit(limit);

    return NextResponse.json({
      type,
      items: rows.map((row, i) => ({ rank: i + 1, ...row })),
    });
  }

  if (type === "visits") {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        score: count(visits.id),
      })
      .from(visits)
      .innerJoin(users, eq(visits.userId, users.id))
      .where(eq(users.showOnLeaderboard, true))
      .groupBy(users.id, users.name, users.username, users.image)
      .orderBy(desc(count(visits.id)))
      .limit(limit);

    return NextResponse.json({
      type,
      items: rows.map((row, i) => ({
        rank: i + 1,
        ...row,
        score: Number(row.score),
      })),
    });
  }

  if (type === "prefectures") {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        image: users.image,
        score: sql<number>`count(distinct ${spots.prefecture})`,
      })
      .from(visits)
      .innerJoin(users, eq(visits.userId, users.id))
      .innerJoin(spots, eq(visits.spotId, spots.id))
      .where(eq(users.showOnLeaderboard, true))
      .groupBy(users.id, users.name, users.username, users.image)
      .orderBy(desc(sql`count(distinct ${spots.prefecture})`))
      .limit(limit);

    return NextResponse.json({
      type,
      items: rows.map((row, i) => ({
        rank: i + 1,
        ...row,
        score: Number(row.score),
      })),
    });
  }

  return NextResponse.json({ error: "未知排行榜類型" }, { status: 400 });
}
