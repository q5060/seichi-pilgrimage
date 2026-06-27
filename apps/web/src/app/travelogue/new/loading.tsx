import { Skeleton } from "@/components/ui/skeleton";
import { PageShell } from "@/components/layout/page-shell";

export default function Loading() {
  return (
    <PageShell variant="prose">
      <Skeleton className="mb-8 h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </PageShell>
  );
}
