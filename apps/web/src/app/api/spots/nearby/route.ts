import { NextRequest, NextResponse } from "next/server";
import { db, spots } from "@seichi/db";
import { sql, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  const radius = Number(req.nextUrl.searchParams.get("radius") ?? 2000);

  if (!lat || !lng) {
    return NextResponse.json({ error: "需要 lat 和 lng" }, { status: 400 });
  }

  // Haversine approximation in SQL (meters)
  const results = await db
    .select()
    .from(spots)
    .where(
      sql`(
        6371000 * acos(
          cos(radians(${lat})) * cos(radians(${spots.latitude})) *
          cos(radians(${spots.longitude}) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(${spots.latitude}))
        )
      ) < ${radius}
      AND ${spots.moderationStatus} = 'approved'`
    )
    .limit(50);

  return NextResponse.json(results);
}
