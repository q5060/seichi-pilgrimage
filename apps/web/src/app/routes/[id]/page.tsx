import Link from "next/link";
import { db, routes, routeStops, spots } from "@seichi/db";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { googleMapsDirectionsUrl, googleMapsPinUrl } from "@/lib/utils";
import { CopyRouteButton } from "@/components/routes/copy-route-button";
import { RouteOptimizeButton } from "@/components/routes/route-optimize-button";
import { RouteCollaboratorsSection } from "@/components/routes/route-collaborators-section";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { Calendar, Printer, MapPin } from "lucide-react";
import { ExportTravelogueButton } from "@/components/routes/export-travelogue-button";
import { getSpotDisplayNameForRequest } from "@/lib/display-names-server";
import { canEditRoute } from "@/lib/collaboration";

export const revalidate = 60;

export default async function RoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [route] = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  if (!route) notFound();

  const canAccess =
    route.isPublic ||
    (session?.user?.id &&
      (route.userId === session.user.id ||
        (await canEditRoute(id, session.user.id))));

  if (!canAccess) notFound();

  const stops = await db
    .select({ stop: routeStops, spot: spots })
    .from(routeStops)
    .innerJoin(spots, eq(routeStops.spotId, spots.id))
    .where(eq(routeStops.routeId, id))
    .orderBy(asc(routeStops.sortOrder));

  const mapsUrl = googleMapsDirectionsUrl(
    stops.map((s) => ({ lat: s.spot.latitude, lng: s.spot.longitude }))
  );

  const isOwner = session?.user?.id === route.userId;
  const canCopy = route.isPublic && !isOwner;
  const canEdit = isOwner;

  const stopDisplayNames = await Promise.all(
    stops.map(({ spot }) => getSpotDisplayNameForRequest(spot))
  );

  return (
    <PageShell variant="prose">
      <PageHeader
        title={route.title}
        breadcrumbs={[{ label: "路線", href: "/routes" }, { label: route.title }]}
        action={route.isPublic ? <Badge variant="success">公開</Badge> : undefined}
        description={route.description ?? undefined}
      />

      <div className="mb-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {route.totalDistanceM != null && (
          <span>距離 {(route.totalDistanceM / 1000).toFixed(1)} km</span>
        )}
        {route.estimatedMinutes != null && (
          <span>
            預估 {Math.floor(route.estimatedMinutes / 60)}h{" "}
            {route.estimatedMinutes % 60}m
          </span>
        )}
      </div>

      <ol className="space-y-3">
        {Object.entries(
          stops.reduce<Record<number, typeof stops>>((acc, item) => {
            const day = item.stop.dayIndex ?? 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(item);
            return acc;
          }, {})
        )
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, dayStops]) => (
            <li key={day} className="space-y-3">
              {Number(day) > 1 || stops.some((s) => (s.stop.dayIndex ?? 1) > 1) ? (
                <h3 className="font-display text-sm font-semibold text-primary">
                  第 {day} 天
                </h3>
              ) : null}
              {dayStops.map(({ stop, spot }, i) => {
                const globalIdx = stops.findIndex((s) => s.stop.id === stop.id);
                const displayName = stopDisplayNames[globalIdx] ?? spot.nameZh;
                return (
                <Card key={stop.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/spots/${spot.id}`} className="font-medium hover:text-primary">
                        {displayName}
                      </Link>
                      <p className="text-sm text-muted-foreground">{spot.prefecture}</p>
                      {(spot.nearestStation || spot.walkMinutes != null) && (
                        <p className="text-xs text-muted-foreground">
                          {spot.nearestStation && `最近車站：${spot.nearestStation}`}
                          {spot.nearestStation && spot.walkMinutes != null && " · "}
                          {spot.walkMinutes != null && `步行約 ${spot.walkMinutes} 分`}
                        </p>
                      )}
                      <a
                        href={googleMapsPinUrl(spot.latitude, spot.longitude, displayName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Google 地圖
                      </a>
                    </div>
                    {stop.stayMinutes != null && (
                      <span className="shrink-0 text-sm text-muted-foreground">
                        停留 {stop.stayMinutes} 分
                      </span>
                    )}
                  </CardContent>
                </Card>
              );
              })}
            </li>
          ))}
      </ol>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <MapPin className="mr-2 h-4 w-4" />
            在 Google Maps 開啟
          </a>
        </Button>
        <Button variant="secondary" asChild>
          <a href={`/api/routes/${id}/ical`} download>
            <Calendar className="mr-2 h-4 w-4" />
            匯出 iCal
          </a>
        </Button>
        <Button variant="secondary" asChild>
          <Link href={`/routes/${id}/print`}>
            <Printer className="mr-2 h-4 w-4" />
            列印路線
          </Link>
        </Button>
        {canCopy && <CopyRouteButton routeId={id} />}
        {canEdit && <RouteOptimizeButton routeId={id} />}
        {canEdit && <ExportTravelogueButton routeId={id} />}
      </div>

      {canEdit && <RouteCollaboratorsSection routeId={id} isOwner={isOwner} />}
    </PageShell>
  );
}
