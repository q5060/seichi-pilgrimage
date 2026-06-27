"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportTravelogueButton({ routeId }: { routeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/routes/${routeId}/export-travelogue`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "匯出失敗");
      router.push(`/travelogue/${data.slug}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "匯出失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="secondary"
        onClick={handleExport}
        disabled={loading}
      >
        <FileText className="mr-2 h-4 w-4" />
        {loading ? "匯出中..." : "匯出為遊記草稿"}
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
