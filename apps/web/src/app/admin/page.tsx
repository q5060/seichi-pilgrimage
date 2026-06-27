"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Flag, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface QueueItem {
  id: string;
  targetType: string;
  targetId: string;
  status: string;
  createdAt: string;
  payload?: Record<string, unknown> | null;
}

interface ReportItem {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  reasonLabel: string;
  details?: string | null;
  reporterName?: string;
  targetPreview: string;
  createdAt: string;
}

function AdminSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function getContentLink(item: QueueItem): string | null {
  const payload = item.payload;
  if (item.targetType === "spot") return `/spots/${item.targetId}`;
  if (item.targetType === "spot_edit" && payload?.spotId) {
    return `/spots/${payload.spotId as string}`;
  }
  if (item.targetType === "spot_link_edit" && payload?.spotId) {
    return `/spots/${payload.spotId as string}`;
  }
  if (item.targetType === "anime_meta" && payload?.anilistId) {
    return `/anime/${payload.anilistId}`;
  }
  if (item.targetType === "location_report" && payload?.spotId) {
    return `/spots/${payload.spotId as string}`;
  }
  return null;
}

function renderStructuredDiff(item: QueueItem) {
  const payload = item.payload;
  if (!payload) return null;

  if (item.targetType === "spot_edit" && payload.changes) {
    const changes = payload.changes as Record<string, unknown>;
    const keys = Object.keys(changes);
    return (
      <div className="mt-2 space-y-1 rounded-lg bg-elevated p-3 text-sm">
        {keys.map((key) => (
          <p key={key}>
            <span className="font-medium text-primary">{key}</span>
            <span className="text-muted-foreground"> → </span>
            <span>{String(changes[key])}</span>
          </p>
        ))}
      </div>
    );
  }

  return renderQueuePreview(item);
}

function renderQueuePreview(item: QueueItem) {
  const payload = item.payload;
  if (!payload) return null;

  if (item.targetType === "spot" && payload.spot) {
    const spot = payload.spot as {
      nameZh?: string;
      prefecture?: string;
      address?: string;
    };
    return (
      <p className="text-sm text-muted-foreground">
        {spot.nameZh} · {spot.prefecture}
        {spot.address && ` · ${spot.address}`}
      </p>
    );
  }

  if (item.targetType === "spot_edit" && payload.changes) {
    const changes = payload.changes as { nameZh?: string };
    return (
      <p className="text-sm text-muted-foreground">
        編輯提案：{changes.nameZh ?? "欄位更新"}
      </p>
    );
  }

  if (item.targetType === "spot_link_edit") {
    return (
      <p className="text-sm text-muted-foreground">
        話數/場景：{(payload.summary as string) ?? "更新"}
      </p>
    );
  }

  if (item.targetType === "anime_meta" && payload.changes) {
    const changes = payload.changes as {
      customTitle?: string;
      etiquetteNotes?: string;
    };
    return (
      <p className="text-sm text-muted-foreground">
        作品 Meta：{changes.customTitle ?? changes.etiquetteNotes ?? "更新"}
      </p>
    );
  }

  if (item.targetType === "location_report") {
    const reportLabels: Record<string, string> = {
      still_open: "仍開放",
      closed: "已關閉",
      renovated: "已翻新",
      restricted: "限制進入",
    };
    const reportType = payload.reportType as string;
    return (
      <p className="text-sm text-muted-foreground">
        現況回報：{reportLabels[reportType] ?? reportType}
        {payload.notes ? ` — ${String(payload.notes)}` : ""}
      </p>
    );
  }

  return (
    <pre className="mt-1 max-h-24 overflow-auto text-xs text-muted-foreground">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}

export default function AdminPage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin").then(async (r) => {
        if (!r.ok) throw new Error("需要管理員權限");
        return r.json();
      }),
      fetch("/api/admin/reports").then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([queue, reportItems]) => {
        setItems(queue);
        setReports(reportItems);
      })
      .catch(() => setError("需要管理員權限"))
      .finally(() => setLoading(false));
  }, []);

  async function review(queueId: string, approved: boolean) {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queueId,
        approved,
        notes: approved ? "審核通過" : "審核拒絕",
      }),
    });
    setItems((prev) => prev.filter((i) => i.id !== queueId));
  }

  async function resolveReport(reportId: string, action: "resolve" | "dismiss") {
    await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }

  if (loading) {
    return (
      <PageShell variant="standard">
        <Skeleton className="mb-8 h-10 w-48" />
        <AdminSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell variant="narrow">
        <EmptyState icon={ShieldCheck} title="無法存取" description={error} />
      </PageShell>
    );
  }

  return (
    <PageShell variant="standard">
      <PageHeader
        title="審核後台"
        description="審核聖地提案、協作編輯與使用者檢舉"
      />

      <Tabs defaultValue="queue" className="mt-6">
        <TabsList>
          <TabsTrigger value="queue">
            審核佇列 ({items.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            檢舉 ({reports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          {items.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="目前沒有待審核項目"
              description="所有項目都已處理完畢"
            />
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{item.targetType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("zh-TW")}
                        </span>
                      </div>
                      {renderStructuredDiff(item)}
                      {getContentLink(item) && (
                        <Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild>
                          <Link href={getContentLink(item)!}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            查看內容
                          </Link>
                        </Button>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <Button size="sm" onClick={() => review(item.id, true)}>
                        通過
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => review(item.id, false)}
                      >
                        拒絕
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          {reports.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="目前沒有待處理檢舉"
              description="使用者檢舉會顯示在這裡"
            />
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{report.reasonLabel}</Badge>
                        <Badge variant="outline">{report.targetType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString("zh-TW")}
                        </span>
                      </div>
                      <p className="mt-2 font-medium">{report.targetPreview}</p>
                      {report.details && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {report.details}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        檢舉人：{report.reporterName}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => resolveReport(report.id, "resolve")}
                      >
                        處理
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveReport(report.id, "dismiss")}
                      >
                        關閉
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
