"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactionTarget } from "@seichi/shared";

interface BookmarkButtonProps {
  targetType: ReactionTarget;
  targetId: string;
  className?: string;
  initialBookmarked?: boolean;
}

export function BookmarkButton({
  targetType,
  targetId,
  className,
  initialBookmarked,
}: BookmarkButtonProps) {
  const { requireAuth } = useRequireAuth();
  const [bookmarked, setBookmarked] = useState(initialBookmarked ?? false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialBookmarked !== undefined) return;
    fetch(
      `/api/social?type=reactions&targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
    )
      .then((r) => r.json())
      .then((data) => setBookmarked(data.bookmarked ?? false));
  }, [targetType, targetId, initialBookmarked]);

  async function toggle() {
    if (!requireAuth()) return;
    setLoading(true);
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "bookmark",
        targetType,
        targetId,
        remove: bookmarked,
      }),
    });
    if (res.ok) setBookmarked(!bookmarked);
    setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={cn(
        "rounded-full",
        bookmarked && "bg-primary/20 text-primary hover:bg-primary/30",
        className
      )}
      aria-label={bookmarked ? "取消收藏" : "收藏"}
    >
      <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
      <span>{bookmarked ? "已收藏" : "收藏"}</span>
    </Button>
  );
}
