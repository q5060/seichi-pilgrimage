"use client";

import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export function FollowButton({ userId, className }: FollowButtonProps) {
  const { requireAuth, session } = useRequireAuth();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const isSelf = session?.user?.id === userId;

  useEffect(() => {
    fetch(`/api/social?type=follow_status&userId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        setFollowing(data.following ?? false);
        setFollowerCount(data.followerCount ?? 0);
      })
      .finally(() => setInitialLoading(false));
  }, [userId]);

  async function toggle() {
    if (!requireAuth()) return;
    setLoading(true);
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: following ? "unfollow" : "follow",
        userId,
      }),
    });
    if (res.ok) {
      setFollowing(!following);
      setFollowerCount((c) => (following ? c - 1 : c + 1));
    }
    setLoading(false);
  }

  if (isSelf || initialLoading) return null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-sm text-muted-foreground">{followerCount} 位追蹤者</span>
      <Button
        type="button"
        variant={following ? "outline" : "default"}
        size="sm"
        onClick={toggle}
        disabled={loading}
        className="rounded-full"
      >
        {following ? (
          <>
            <UserCheck className="h-4 w-4" />
            已追蹤
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            追蹤
          </>
        )}
      </Button>
    </div>
  );
}
