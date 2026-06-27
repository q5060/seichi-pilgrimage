import { db, routes, routeStops, spots } from "@seichi/db";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { googleMapsPinUrl } from "@/lib/utils";
import { PrintRouteButton } from "@/components/routes/print-route-button";
import { canEditRoute } from "@/lib/collaboration";

export const dynamic = "force-dynamic";

export default async function RoutePrintPage({
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

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { padding: 0; max-width: none; }
          .print-card { border: 1px solid #ccc; box-shadow: none; }
        }
      `}</style>
      <div className="print-page mx-auto max-w-3xl px-4 py-8">
        <div className="no-print mb-6 flex flex-wrap items-center gap-3">
          <Link href={`/routes/${id}`} className="text-sm text-primary hover:underline">
            ← 返回路線
          </Link>
          <PrintRouteButton />
        </div>

        <header className="border-b border-border pb-4">
          <p className="text-sm text-muted-foreground">聖地巡禮 · 巡禮路線</p>
          <h1 className="mt-1 text-3xl font-bold">{route.title}</h1>
          {route.description && (
            <p className="mt-2 text-muted-foreground">{route.description}</p>
          )}
          <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
            {route.totalDistanceM != null && (
              <span>距離 {(route.totalDistanceM / 1000).toFixed(1)} km</span>
            )}
            {route.estimatedMinutes != null && (
              <span>
                預估 {Math.floor(route.estimatedMinutes / 60)}h{" "}
                {route.estimatedMinutes % 60}m
              </span>
            )}
            <span>{stops.length} 站</span>
          </div>
        </header>

        <ol className="mt-8 space-y-4">
          {stops.map(({ stop, spot }, i) => (
            <li key={stop.id} className="print-card flex gap-4 rounded-lg border p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{spot.nameZh}</p>
                <p className="text-sm text-muted-foreground">{spot.prefecture}</p>
                {stop.notes && (
                  <p className="mt-1 text-sm">{stop.notes}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {googleMapsPinUrl(spot.latitude, spot.longitude, spot.nameZh)}
                </p>
              </div>
              {stop.stayMinutes != null && (
                <span className="shrink-0 text-sm text-muted-foreground">
                  停留 {stop.stayMinutes} 分
                </span>
              )}
            </li>
          ))}
        </ol>

        <footer className="mt-8 border-t pt-4 text-center text-xs text-muted-foreground">
          由聖地巡禮產生 · seichi.app
        </footer>
      </div>
    </>
  );
}
