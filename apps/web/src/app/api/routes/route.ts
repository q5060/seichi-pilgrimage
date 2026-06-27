import { NextRequest, NextResponse } from "next/server";
import { db, routes, routeStops, spots, activities } from "@seichi/db";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { estimateRouteMetrics } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const userRoutes = await db
    .select()
    .from(routes)
    .where(eq(routes.userId, session.user.id));

  return NextResponse.json(userRoutes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const [route] = await db
    .insert(routes)
    .values({
      userId: session.user.id,
      title: body.title,
      description: body.description,
      isPublic: body.isPublic ?? false,
    })
    .returning();

  if (body.stops?.length) {
    const stopRows = [];
    for (let i = 0; i < body.stops.length; i++) {
      const s = body.stops[i];
      stopRows.push({
        routeId: route.id,
        spotId: s.spotId,
        sortOrder: i,
        stayMinutes: s.stayMinutes ?? 30,
        notes: s.notes,
        arrivalTime: s.arrivalTime,
        dayIndex: s.dayIndex ?? 1,
      });
    }
    await db.insert(routeStops).values(stopRows);

    const spotIds = body.stops.map((s: { spotId: string }) => s.spotId);
    const spotData = await db
      .select()
      .from(spots)
      .where(eq(spots.id, spotIds[0]));

    const allSpots = await Promise.all(
      spotIds.map(async (id: string) => {
        const [sp] = await db.select().from(spots).where(eq(spots.id, id)).limit(1);
        return sp;
      })
    );

    const metrics = estimateRouteMetrics(
      allSpots.filter(Boolean).map((s, i) => ({
        lat: s!.latitude,
        lng: s!.longitude,
        stayMinutes: body.stops[i]?.stayMinutes ?? 30,
      }))
    );

    await db
      .update(routes)
      .set({
        totalDistanceM: metrics.distanceM,
        estimatedMinutes: metrics.minutes,
      })
      .where(eq(routes.id, route.id));
  }

  await db.insert(activities).values({
    userId: session.user.id,
    type: "route",
    targetId: route.id,
    metadata: { title: route.title },
  });

  return NextResponse.json(route, { status: 201 });
}
