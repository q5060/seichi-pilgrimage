"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactionTarget } from "@seichi/shared";

interface LikeButtonProps {
  targetType: ReactionTarget;
  targetId: string;
  link?: string;
  className?: string;
  initialLikeCount?: number;
  initialLiked?: boolean;
}

export function LikeButton({
  targetType,
  targetId,
  link,
  className,
  initialLikeCount,
  initialLiked,
}: LikeButtonProps) {
  const { requireAuth } = useRequireAuth();
  const [likeCount, setLikeCount] = useState(initialLikeCount ?? 0);
  const [liked, setLiked] = useState(initialLiked ?? false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialLikeCount !== undefined && initialLiked !== undefined) return;
    fetch(
      `/api/social?type=reactions&targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`
    )
      .then((r) => r.json())
      .then((data) => {
        setLikeCount(data.likeCount ?? 0);
        setLiked(data.liked ?? false);
      });
  }, [targetType, targetId, initialLikeCount, initialLiked]);

  async function toggle() {
    if (!requireAuth()) return;
    setLoading(true);
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "like",
        targetType,
        targetId,
        unlike: liked,
        link,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setLiked(!liked);
      if (data.likeCount !== undefined) setLikeCount(data.likeCount);
      else setLikeCount((c) => (liked ? c - 1 : c + 1));
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
        liked && "bg-red-500/20 text-red-400 hover:bg-red-500/30",
        className
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      <span>{likeCount}</span>
    </Button>
  );
}
