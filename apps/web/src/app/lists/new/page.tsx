"use client";

import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/require-auth-client";
import { PageShell } from "@/components/layout/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateListDialog } from "@/components/lists/create-list-dialog";

export default function NewListPage() {
  const router = useRouter();
  const { requireAuth, status } = useRequireAuth();

  if (status === "loading") {
    return (
      <PageShell variant="standard">
        <Skeleton className="mb-8 h-10 w-48" />
        <Skeleton className="h-64 w-full max-w-md rounded-xl" />
      </PageShell>
    );
  }

  if (!requireAuth()) {
    return null;
  }

  return (
    <PageShell variant="standard">
      <CreateListDialog
        open
        onClose={() => router.push("/lists")}
        onCreated={(list) => router.push(`/lists/${list.id}`)}
      />
    </PageShell>
  );
}
