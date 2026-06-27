"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/require-auth-client";
import { useFormatDate } from "@/hooks/use-format-date";
import { Route } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

interface RouteRow {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  totalDistanceM: number | null;
  estimatedMinutes: number | null;
  updatedAt: string;
}

function RoutesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export default function RoutesPage() {
  const formatDate = useFormatDate();
  const { requireAuth, status } = useRequireAuth();
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!requireAuth()) return;

    fetch("/api/routes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRoutes(data);
      })
      .finally(() => setLoading(false));
  }, [status, requireAuth]);

  if (status === "loading" || loading) {
    return (
      <PageShell variant="prose">
        <Skeleton className="mb-8 h-10 w-48" />
        <RoutesSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell variant="prose">
      <PageHeader
        title="我的路線"
        description="規劃與管理巡禮路線"
        action={
          <Button asChild>
            <Link href="/routes/new">
              <Route className="h-4 w-4" />
              規劃新路線
            </Link>
          </Button>
        }
      />

      {routes.length === 0 ? (
        <EmptyState
          icon={Route}
          title="尚無路線"
          description="開始規劃你的巡禮之旅吧！"
          actionLabel="建立路線"
          actionHref="/routes/new"
        />
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <Link key={route.id} href={`/routes/${route.id}`}>
              <Card className="p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                <h2 className="font-semibold">{route.title}</h2>
                {route.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {route.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {route.totalDistanceM != null && (
                    <Badge variant="secondary">
                      約 {(route.totalDistanceM / 1000).toFixed(1)} km
                    </Badge>
                  )}
                  {route.estimatedMinutes != null && (
                    <Badge variant="secondary">
                      預估 {Math.floor(route.estimatedMinutes / 60)}h{" "}
                      {route.estimatedMinutes % 60}m
                    </Badge>
                  )}
                  <Badge variant={route.isPublic ? "default" : "outline"}>
                    {route.isPublic ? "公開" : "私人"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    更新於 {formatDate(route.updatedAt)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
