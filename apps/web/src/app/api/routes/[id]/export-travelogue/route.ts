import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { db, routes, routeStops, spots, travelogues } from "@seichi/db";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { canEditRoute } from "@/lib/collaboration";
import type { TravelogueBlock } from "@seichi/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const { id } = await params;
  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) {
    return NextResponse.json({ error: "找不到路線" }, { status: 404 });
  }

  const canAccess =
    route.userId === session.user.id ||
    (await canEditRoute(id, session.user.id));

  if (!canAccess) {
    return NextResponse.json({ error: "無權限" }, { status: 403 });
  }

  const stops = await db
    .select({ stop: routeStops, spot: spots })
    .from(routeStops)
    .innerJoin(spots, eq(routeStops.spotId, spots.id))
    .where(eq(routeStops.routeId, id))
    .orderBy(asc(routeStops.sortOrder));

  const blocks: TravelogueBlock[] = [];

  for (let i = 0; i < stops.length; i++) {
    const { spot } = stops[i];

    if (i > 0) {
      const prev = stops[i - 1].spot;
      const transport =
        spot.nearestStation && spot.walkMinutes != null
          ? `${spot.nearestStation} 步行 ${spot.walkMinutes} 分`
          : spot.nearestStation ?? "";

      blocks.push({
        id: uuidv4(),
        type: "route_segment",
        data: {
          from: prev.nameZh,
          to: spot.nameZh,
          transport,
          minutes: spot.walkMinutes != null ? String(spot.walkMinutes) : "",
        },
      });
    }

    blocks.push({
      id: uuidv4(),
      type: "spot_card",
      data: {
        spotId: spot.id,
        name: spot.nameZh,
        prefecture: spot.prefecture,
      },
    });
  }

  const slug = `${slugify(route.title)}-route-${Date.now().toString(36)}`;

  const [travelogue] = await db
    .insert(travelogues)
    .values({
      userId: session.user.id,
      title: `${route.title}（路線匯出）`,
      slug,
      excerpt: route.description ?? `由路線「${route.title}」匯出`,
      content: blocks,
      isPublished: false,
      privacy: "public",
    })
    .returning();

  return NextResponse.json({ slug: travelogue.slug }, { status: 201 });
}
