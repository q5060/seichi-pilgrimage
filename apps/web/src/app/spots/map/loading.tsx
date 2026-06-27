import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

export default function Loading() {
  return (
    <PageShell variant="wide" noPadding className="px-4 py-8 md:px-4">
      <Skeleton className="mb-4 h-10 w-48" />
      <Skeleton className="mb-4 h-4 w-72" />
      <Skeleton className="h-[calc(100dvh-12rem)] w-full rounded-xl md:h-[calc(100vh-14rem)]" />
    </PageShell>
  );
}
