"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomeDataUnavailableBanner() {
  const router = useRouter();

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>資料暫時無法載入，請確認資料庫服務是否已啟動。</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          重試
        </Button>
      </div>
    </div>
  );
}
