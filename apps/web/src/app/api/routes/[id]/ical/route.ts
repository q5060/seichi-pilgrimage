import { NextRequest, NextResponse } from "next/server";
import { db, routes, routeStops, spots } from "@seichi/db";
import { eq, asc } from "drizzle-orm";

function formatIcalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function escapeIcal(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) return NextResponse.json({ error: "找不到路線" }, { status: 404 });

  const stops = await db
    .select({ stop: routeStops, spot: spots })
    .from(routeStops)
    .innerJoin(spots, eq(routeStops.spotId, spots.id))
    .where(eq(routeStops.routeId, id))
    .orderBy(asc(routeStops.sortOrder));

  const now = new Date();

  const events = stops.map(({ stop, spot }, i) => {
    const dayOffset = (stop.dayIndex ?? 1) - 1;
    const baseDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 9, 0, 0);

    let start: Date;
    if (stop.arrivalTime) {
      const [h, m] = stop.arrivalTime.split(":").map(Number);
      start = new Date(baseDay.getFullYear(), baseDay.getMonth(), baseDay.getDate(), h, m ?? 0, 0);
    } else {
      start = new Date(baseDay.getTime() + i * 45 * 60 * 1000);
    }

    const stayMinutes = stop.stayMinutes ?? 30;
    const end = new Date(start.getTime() + stayMinutes * 60 * 1000);

    const uid = `${route.id}-${stop.id}@seichi.app`;
    const location = escapeIcal(`${spot.latitude},${spot.longitude}`);

    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatIcalDate(now)}`,
      `DTSTART:${formatIcalDate(start)}`,
      `DTEND:${formatIcalDate(end)}`,
      `SUMMARY:${escapeIcal(`${stop.dayIndex && stop.dayIndex > 1 ? `D${stop.dayIndex} ` : ""}${i + 1}. ${spot.nameZh}`)}`,
      `LOCATION:${location}`,
      stop.notes ? `DESCRIPTION:${escapeIcal(stop.notes)}` : null,
      "END:VEVENT",
    ]
      .filter(Boolean)
      .join("\r\n");
  });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Seichi//Route Planner//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcal(route.title)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${route.title}.ics"`,
    },
  });
}
