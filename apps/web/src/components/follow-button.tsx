"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

export function AnimeFollowButton({ anilistId }: { anilistId: number }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social?type=follows")
      .then((r) => (r.ok ? r.json() : { anime: [] }))
      .then((data) => {
        setFollowing(
          data.anime?.some((f: { animeId: number }) => f.animeId === anilistId) ?? false
        );
      })
      .finally(() => setLoading(false));
  }, [anilistId]);

  async function toggle() {
    const action = following ? "unfollow_anime" : "follow_anime";
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, animeId: anilistId }),
    });
    if (res.ok) setFollowing(!following);
  }

  if (loading) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
        following
          ? "bg-primary/20 text-primary"
          : "glass hover:bg-elevated"
      }`}
    >
      {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {following ? "已訂閱通知" : "訂閱作品更新"}
    </button>
  );
}

export function RegionFollowButton({ region }: { region: string }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/social?type=follows")
      .then((r) => (r.ok ? r.json() : { regions: [] }))
      .then((data) => {
        setFollowing(
          data.regions?.some((f: { region: string }) => f.region === region) ?? false
        );
      })
      .finally(() => setLoading(false));
  }, [region]);

  async function toggle() {
    const action = following ? "unfollow_region" : "follow_region";
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, region }),
    });
    if (res.ok) setFollowing(!following);
  }

  if (loading) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
        following
          ? "bg-primary/20 text-primary"
          : "glass hover:bg-elevated"
      }`}
    >
      {following ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      {following ? "已訂閱地區" : "訂閱地區更新"}
    </button>
  );
}
