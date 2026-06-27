"use client";

import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SpotHelpfulButtonProps {
  spotId: string;
  className?: string;
  initialCount?: number;
  initialVoted?: boolean;
}

export function SpotHelpfulButton({
  spotId,
  className,
  initialCount,
  initialVoted,
}: SpotHelpfulButtonProps) {
  const { requireAuth } = useRequireAuth();
  const [count, setCount] = useState(initialCount ?? 0);
  const [voted, setVoted] = useState(initialVoted ?? false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCount !== undefined && initialVoted !== undefined) return;
    fetch(`/api/spots/${spotId}/helpful`)
      .then((r) => r.json())
      .then((data) => {
        setCount(data.count ?? 0);
        setVoted(data.voted ?? false);
      });
  }, [spotId, initialCount, initialVoted]);

  async function toggle() {
    if (!requireAuth()) return;
    setLoading(true);
    const res = await fetch(`/api/spots/${spotId}/helpful`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setVoted(data.voted);
      setCount(data.count);
    }
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
        voted && "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
        className
      )}
    >
      <ThumbsUp className={cn("h-4 w-4", voted && "fill-current")} />
      <span>有幫助 ({count})</span>
    </Button>
  );
}
