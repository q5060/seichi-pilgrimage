import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoadingGeneric() {
  return (
    <PageShell variant="wide">
      <Skeleton className="mb-6 h-10 w-48" />
      <Skeleton className="mb-4 h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

export function SpotDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-[420px] w-full rounded-none" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function AnimeDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-[400px] w-full rounded-none" />
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <Skeleton className="h-[280px] w-full rounded-none" />
      <PageShell variant="standard" className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </PageShell>
    </div>
  );
}

export function ListPageLoading() {
  return (
    <PageShell variant="wide">
      <Skeleton className="mb-8 h-10 w-40" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </PageShell>
  );
}
