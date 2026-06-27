"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Copy } from "lucide-react";

export function CopyRouteButton({ routeId }: { routeId: string }) {
  const router = useRouter();
  const { requireAuth } = useRequireAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function copyRoute() {
    if (!requireAuth()) return;
    setLoading(true);
    setError("");
    const res = await fetch(`/api/routes/${routeId}`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/routes/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "複製失敗");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={copyRoute}
        disabled={loading}
        className="btn-secondary inline-flex text-sm"
      >
        <Copy className="mr-2 h-4 w-4" />
        {loading ? "複製中..." : "複製到我的路線"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
