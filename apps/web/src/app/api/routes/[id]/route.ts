import { NextRequest, NextResponse } from "next/server";
import { db, routes, routeStops, spots } from "@seichi/db";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { estimateRouteMetrics, googleMapsDirectionsUrl } from "@/lib/utils";
import { canEditRoute } from "@/lib/collaboration";
import { optimizeStopsByDay } from "@/lib/route-optimize";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) return NextResponse.json({ error: "找不到路線" }, { status: 404 });

  const canAccess =
    route.isPublic ||
    (session?.user?.id &&
      (route.userId === session.user.id ||
        (await canEditRoute(id, session.user.id))));

  if (!canAccess) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const stops = await db
    .select({ stop: routeStops, spot: spots })
    .from(routeStops)
    .innerJoin(spots, eq(routeStops.spotId, spots.id))
    .where(eq(routeStops.routeId, id))
    .orderBy(asc(routeStops.sortOrder));

  const mapsUrl = googleMapsDirectionsUrl(
    stops.map((s) => ({ lat: s.spot.latitude, lng: s.spot.longitude }))
  );

  return NextResponse.json({ route, stops, mapsUrl });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const [source] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!source) return NextResponse.json({ error: "找不到路線" }, { status: 404 });

  if (!source.isPublic && source.userId !== session.user.id) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const [newRoute] = await db
    .insert(routes)
    .values({
      userId: session.user.id,
      title: `${source.title}（副本）`,
      description: source.description,
      isPublic: false,
      totalDistanceM: source.totalDistanceM,
      estimatedMinutes: source.estimatedMinutes,
    })
    .returning();

  const sourceStops = await db
    .select()
    .from(routeStops)
    .where(eq(routeStops.routeId, id))
    .orderBy(asc(routeStops.sortOrder));

  if (sourceStops.length > 0) {
    await db.insert(routeStops).values(
      sourceStops.map((s) => ({
        routeId: newRoute.id,
        spotId: s.spotId,
        sortOrder: s.sortOrder,
        stayMinutes: s.stayMinutes,
        notes: s.notes,
        arrivalTime: s.arrivalTime,
      }))
    );
  }

  return NextResponse.json(newRoute, { status: 201 });
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
  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route || !(await canEditRoute(id, session.user.id))) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const body = await req.json();

  if (body.optimize) {
    const currentStops = await db
      .select({ stop: routeStops, spot: spots })
      .from(routeStops)
      .innerJoin(spots, eq(routeStops.spotId, spots.id))
      .where(eq(routeStops.routeId, id))
      .orderBy(asc(routeStops.sortOrder));

    const optimized = optimizeStopsByDay(
      currentStops.map(({ stop, spot }) => ({
        id: stop.id,
        spotId: stop.spotId,
        lat: spot.latitude,
        lng: spot.longitude,
        dayIndex: stop.dayIndex ?? 1,
      }))
    );

    const stopById = new Map(currentStops.map(({ stop }) => [stop.id, stop]));

    await db.delete(routeStops).where(eq(routeStops.routeId, id));

    for (let i = 0; i < optimized.length; i++) {
      const orig = stopById.get(optimized[i].id);
      if (!orig) continue;
      await db.insert(routeStops).values({
        routeId: id,
        spotId: orig.spotId,
        sortOrder: i,
        stayMinutes: orig.stayMinutes,
        notes: orig.notes,
        arrivalTime: orig.arrivalTime,
        dayIndex: orig.dayIndex,
      });
    }

    const metrics = estimateRouteMetrics(
      optimized.map((s) => ({ lat: s.lat, lng: s.lng, stayMinutes: stopById.get(s.id)?.stayMinutes ?? 30 }))
    );

    await db
      .update(routes)
      .set({
        totalDistanceM: metrics.distanceM,
        estimatedMinutes: metrics.minutes,
        updatedAt: new Date(),
      })
      .where(eq(routes.id, id));

    return NextResponse.json({ success: true, optimized: true });
  }

  if (body.stops) {
    await db.delete(routeStops).where(eq(routeStops.routeId, id));

    for (let i = 0; i < body.stops.length; i++) {
      const s = body.stops[i];
      await db.insert(routeStops).values({
        routeId: id,
        spotId: s.spotId,
        sortOrder: i,
        stayMinutes: s.stayMinutes ?? 30,
        notes: s.notes,
      });
    }

    const allSpots = await Promise.all(
      body.stops.map(async (s: { spotId: string; stayMinutes?: number }) => {
        const [sp] = await db.select().from(spots).where(eq(spots.id, s.spotId)).limit(1);
        return sp ? { lat: sp.latitude, lng: sp.longitude, stayMinutes: s.stayMinutes } : null;
      })
    );

    const metrics = estimateRouteMetrics(allSpots.filter(Boolean) as { lat: number; lng: number; stayMinutes?: number }[]);

    await db
      .update(routes)
      .set({
        title: body.title ?? route.title,
        totalDistanceM: metrics.distanceM,
        estimatedMinutes: metrics.minutes,
        updatedAt: new Date(),
      })
      .where(eq(routes.id, id));
  }

  return NextResponse.json({ success: true });
}
