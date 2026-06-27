"use client";

import { useState, useEffect } from "react";
import { PILGRIMAGE_STATUSES, PILGRIMAGE_STATUS_LABELS } from "@seichi/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function AnimeStatusButton({ anilistId }: { anilistId: number }) {
  const [status, setStatus] = useState<string>("want");
  const [score, setScore] = useState<string>("");
  const [review, setReview] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/anime/${anilistId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.userStatus) {
          if (data.userStatus.status) setStatus(data.userStatus.status);
          if (data.userStatus.score != null) setScore(String(data.userStatus.score));
          if (data.userStatus.review) setReview(data.userStatus.review);
          if (Array.isArray(data.userStatus.tags)) {
            setTags(data.userStatus.tags.join(", "));
          }
        }
      })
      .finally(() => setInitialLoading(false));
  }, [anilistId]);

  async function updateStatus(newStatus: string) {
    setLoading(true);
    setError("");
    setSaved(false);
    const res = await fetch(`/api/anime/${anilistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pilgrimageStatus: newStatus }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "更新失敗");
    } else {
      setStatus(newStatus);
    }
    setLoading(false);
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSaved(false);
    const tagList = tags
      .split(/[,，、]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await fetch(`/api/anime/${anilistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: score ? Number(score) : null,
        review: review || null,
        tags: tagList,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "儲存失敗");
    } else {
      setSaved(true);
    }
    setLoading(false);
  }

  if (initialLoading) {
    return <p className="text-sm text-muted-foreground">載入狀態中...</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">巡禮狀態</p>
        <div className="flex flex-wrap gap-2">
          {PILGRIMAGE_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => updateStatus(s)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-elevated"
              }`}
            >
              {PILGRIMAGE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={saveDetails} className="space-y-3 rounded-lg border border-subtle bg-surface/30 p-4">
        <p className="text-sm font-medium">我的評價</p>
        <div>
          <label className="text-xs text-muted-foreground">評分（1–10）</label>
          <Input
            type="number"
            min={1}
            max={10}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="mt-1"
            placeholder="選填"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">短評</label>
          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={3}
            className="mt-1"
            placeholder="分享巡禮心得..."
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">標籤（逗號分隔）</label>
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1"
            placeholder="治癒, 夜景, 必訪"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading}>
          儲存評價
        </Button>
        {saved && <p className="text-xs text-green-400">已儲存</p>}
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
