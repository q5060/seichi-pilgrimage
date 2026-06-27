import { db, spots } from "@seichi/db";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PREFECTURES } from "@seichi/shared";
import { LazyCommentThread } from "@/components/social/lazy-comment-thread";
import { ACCESS_TYPE_LABELS, SPOT_STATUS_LABELS } from "@seichi/shared";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RegionFollowButton } from "@/components/follow-button";
import { MapPin } from "lucide-react";
import { cacheFetch } from "@/lib/cache";

export const revalidate = 60;

const REGION_PAGE_SIZE = 24;

export default async function RegionPage({
  params,
}: {
  params: Promise<{ prefecture: string }>;
}) {
  const { prefecture: raw } = await params;
  const prefecture = decodeURIComponent(raw);

  if (!PREFECTURES.includes(prefecture as (typeof PREFECTURES)[number])) {
    notFound();
  }

  const [regionSpots, totalResult] = await Promise.all([
    cacheFetch(
      `region-spots:${prefecture}:${REGION_PAGE_SIZE}`,
      () =>
        db
          .select()
          .from(spots)
          .where(eq(spots.prefecture, prefecture))
          .limit(REGION_PAGE_SIZE),
      60 * 1000
    ),
    cacheFetch(
      `region-spots-count:${prefecture}`,
      async () => {
        const [row] = await db
          .select({ value: count() })
          .from(spots)
          .where(eq(spots.prefecture, prefecture));
        return row?.value ?? 0;
      },
      60 * 1000
    ),
  ]);

  const totalCount = Number(totalResult);
  const hasMore = totalCount > REGION_PAGE_SIZE;
  const spotsQuery = `/spots?prefecture=${encodeURIComponent(prefecture)}`;
  const mapQuery = `/spots/map?prefecture=${encodeURIComponent(prefecture)}`;

  return (
    <PageShell variant="standard">
      <PageHeader
        title={prefecture}
        description="地區聖地與討論"
        breadcrumbs={[{ label: "地區" }, { label: prefecture }]}
        action={<RegionFollowButton region={prefecture} />}
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Button variant="secondary" asChild>
          <Link href={mapQuery}>
            <MapPin className="mr-2 h-4 w-4" />
            地圖探索
          </Link>
        </Button>
      </div>

      <section>
        <h2 className="font-display text-lg font-bold">
          聖地列表{" "}
          <Badge variant="secondary" className="ml-1">
            {totalCount}
          </Badge>
        </h2>
        {regionSpots.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={MapPin}
              title="尚無登錄聖地"
              description="此地區還沒有聖地資料"
            />
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {regionSpots.map((spot) => (
                <Link key={spot.id} href={`/spots/${spot.id}`}>
                  <Card className="p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                    <h3 className="font-semibold">{spot.nameZh}</h3>
                    {spot.nameJa && (
                      <p className="text-sm text-muted-foreground">{spot.nameJa}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {ACCESS_TYPE_LABELS[spot.accessType]}
                      </Badge>
                      <Badge variant="outline">
                        {SPOT_STATUS_LABELS[spot.status]}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 text-center">
                <Button variant="outline" asChild>
                  <Link href={spotsQuery}>載入更多聖地</Link>
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-lg font-bold">地區討論</h2>
        <LazyCommentThread
          targetType="region"
          targetId={prefecture}
          link={`/regions/${encodeURIComponent(prefecture)}`}
        />
      </section>
    </PageShell>
  );
}
