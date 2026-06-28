"use client";

import dynamic from "next/dynamic";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

const RoutePlannerClient = dynamic(
  () => import("./route-planner-client").then((m) => ({ default: m.default })),
  {
    ssr: false,
    loading: () => (
      <PageShell variant="prose">
        <Skeleton className="mb-6 h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageShell>
    ),
  }
);

export function RoutePlannerLoader() {
  return <RoutePlannerClient />;
}
