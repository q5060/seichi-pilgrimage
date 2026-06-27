import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <EmptyState
        icon={Compass}
        title="找不到頁面"
        description="這個頁面可能已移動或不存在。"
        actionLabel="回到首頁"
        actionHref="/"
      />
    </div>
  );
}
