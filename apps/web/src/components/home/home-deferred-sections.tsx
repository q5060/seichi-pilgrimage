import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import {
  getRecommendationsForUser,
  getLatestLocationReports,
} from "@/lib/discovery";
import { LOCATION_REPORT_LABELS } from "@seichi/shared";
import type { LocationReportType } from "@seichi/shared";
import { formatDate } from "@/lib/utils";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";

const REPORT_BORDER_COLORS: Record<LocationReportType, string> = {
  still_open: "border-l-success",
  closed: "border-l-destructive",
  renovated: "border-l-warning",
  restricted: "border-l-accent",
  other: "border-l-muted-foreground",
};

function DeferredSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}

async function HomeRecommendations() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const recommendations = await getRecommendationsForUser(session.user.id);

  return (
    <section>
      <SectionHeader
        title="為你推薦"
        description="根據你追蹤的作品與地區"
        href="/spots"
        linkLabel="探索更多"
      />
      {recommendations.combined.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recommendations.combined.map((spot) => (
            <Link
              key={spot.id}
              href={`/spots/${spot.id}`}
              className="group block overflow-hidden rounded-xl border border-subtle bg-card shadow-elevated transition-all duration-300 hover:border-primary/25 hover:shadow-glow-sm"
            >
              <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-brand-900/60 via-elevated to-primary/20">
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="mb-2 flex gap-2">
                    <Badge variant="secondary">{spot.prefecture}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {spot.source === "anime"
                        ? "追蹤作品"
                        : spot.source === "visit"
                          ? "最近巡禮"
                          : "追蹤地區"}
                    </Badge>
                  </div>
                  <h3 className="font-display text-lg font-semibold leading-tight group-hover:text-primary">
                    {spot.nameZh}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="尚無個人推薦"
          description="追蹤喜歡的作品或地區，我們會為你推薦相關聖地。"
          actionLabel="搜尋作品"
          actionHref="/search"
        />
      )}
    </section>
  );
}

async function HomeLatestReports() {
  const latestReports = await getLatestLocationReports();

  return (
    <section>
      <SectionHeader title="最新現況回報" href="/feed" linkLabel="查看動態" />
      {latestReports.length > 0 ? (
        <div className="relative space-y-0">
          {latestReports.map(({ report, spot, user }, i) => {
            const reportType = report.reportType as LocationReportType;
            const borderColor =
              REPORT_BORDER_COLORS[reportType] ?? "border-l-muted-foreground";
            return (
              <Link
                key={report.id}
                href={`/spots/${spot.id}`}
                className={`group block border-l-4 ${borderColor} py-4 pl-5 transition-colors hover:bg-elevated ${
                  i < latestReports.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-display font-medium group-hover:text-primary">
                      {spot.nameZh}
                    </span>
                    <p className="mt-1 text-sm text-primary">
                      {LOCATION_REPORT_LABELS[reportType] ?? report.reportType}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {user.name} · {spot.prefecture}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(report.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="尚無現況回報"
          description="到聖地頁面回報現場狀況，幫助其他巡禮者。"
          actionLabel="探索聖地"
          actionHref="/spots"
        />
      )}
    </section>
  );
}

export function HomeDeferredSections() {
  return (
    <>
      <Suspense fallback={<DeferredSkeleton />}>
        <HomeRecommendations />
      </Suspense>
      <Suspense fallback={<DeferredSkeleton />}>
        <HomeLatestReports />
      </Suspense>
    </>
  );
}
