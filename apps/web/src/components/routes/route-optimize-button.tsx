"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RouteOptimizeButton({ routeId }: { routeId: string }) {
  const router = useRouter();
  const { requireAuth } = useRequireAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function optimize() {
    if (!requireAuth()) return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/routes/${routeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optimize: true }),
    });

    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "優化失敗");
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={optimize} disabled={loading}>
        <Route className="mr-2 h-4 w-4" />
        {loading ? "優化中..." : "優化同日順序"}
      </Button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
