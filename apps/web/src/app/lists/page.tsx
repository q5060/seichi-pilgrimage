"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/require-auth-client";
import { useFormatDate } from "@/hooks/use-format-date";
import { CreateListDialog, LIST_TYPE_LABELS, type ListRow } from "@/components/lists/create-list-dialog";
import type { ListType } from "@seichi/shared";
import { ListPlus } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

function ListsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export default function ListsPage() {
  const router = useRouter();
  const formatDate = useFormatDate();
  const { requireAuth, status } = useRequireAuth();
  const [lists, setLists] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!requireAuth()) return;

    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLists(data);
      })
      .finally(() => setLoading(false));
  }, [status, requireAuth]);

  function openCreate() {
    if (!requireAuth()) return;
    setDialogOpen(true);
  }

  if (status === "loading" || loading) {
    return (
      <PageShell variant="standard">
        <Skeleton className="mb-8 h-10 w-48" />
        <ListsSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell variant="standard">
      <PageHeader
        title="我的清單"
        description="整理想去的聖地與巡禮計畫"
        action={
          <Button onClick={openCreate}>
            <ListPlus className="h-4 w-4" />
            新增清單
          </Button>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          title="尚無清單"
          description="建立第一個巡禮清單吧！"
          actionLabel="建立清單"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <Link key={list.id} href={`/lists/${list.id}`}>
              <Card className="p-4 transition-all hover:border-primary/30 hover:shadow-glow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{list.title}</h2>
                  <div className="flex shrink-0 gap-2">
                    <Badge variant="outline">
                      {LIST_TYPE_LABELS[list.listType as ListType] ?? list.listType}
                    </Badge>
                    <Badge variant={list.isPublic ? "default" : "secondary"}>
                      {list.isPublic ? "公開" : "私人"}
                    </Badge>
                  </div>
                </div>
                {list.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {list.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  更新於 {formatDate(list.updatedAt)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateListDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(list) => router.push(`/lists/${list.id}`)}
      />
    </PageShell>
  );
}
