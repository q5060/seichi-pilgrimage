"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function RouteJoinInner({ routeId }: { routeId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("邀請連結不完整");
      return;
    }

    fetch(`/api/routes/${routeId}/invite`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 401) {
          router.push(`/auth/signin?callbackUrl=/routes/${routeId}/join?token=${token}`);
          return;
        }
        if (!res.ok) {
          setStatus("error");
          setMessage(data.error ?? "無法加入路線");
          return;
        }
        setStatus("ok");
        setMessage(data.alreadyMember ? "你已是此路線的協作者" : "已成功加入路線協作");
      })
      .catch(() => {
        setStatus("error");
        setMessage("連線失敗，請稍後再試");
      });
  }, [routeId, token, router]);

  return (
    <Card className="p-6 text-center">
      {status === "loading" ? (
        <>
          <Skeleton className="mx-auto mb-4 h-8 w-48" />
          <Skeleton className="mx-auto h-4 w-64" />
        </>
      ) : (
        <>
          <p className="text-lg font-semibold">
            {status === "ok" ? "加入成功" : "無法加入"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          {status === "ok" && (
            <Button asChild className="mt-6">
              <Link href={`/routes/${routeId}`}>查看路線</Link>
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

export default function RouteJoinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [routeId, setRouteId] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => setRouteId(id));
  }, [params]);

  return (
    <PageShell variant="narrow">
      {routeId ? (
        <Suspense fallback={<Skeleton className="h-40 rounded-xl" />}>
          <RouteJoinInner routeId={routeId} />
        </Suspense>
      ) : (
        <Skeleton className="h-40 rounded-xl" />
      )}
    </PageShell>
  );
}
