"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function VisitForm({ spotId, spotName }: { spotId: string; spotName: string }) {
  const router = useRouter();
  const { requireAuth, status } = useRequireAuth();
  const [notes, setNotes] = useState("");
  const [companions, setCompanions] = useState("");
  const [rating, setRating] = useState(5);
  const [privacy, setPrivacy] = useState("public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requireAuth()) return;

    setLoading(true);
    setError("");
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        spotId,
        visitedAt: new Date().toISOString(),
        notes,
        companions: companions.trim() || undefined,
        rating,
        privacy,
      }),
    });
    setLoading(false);
    if (res.status === 401) {
      router.push("/auth/signin");
      return;
    }
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "打卡失敗");
      return;
    }
    const visit = await res.json();
    toast.success(`已成功打卡 ${spotName}！`);
    if (privacy === "public" && visit.id) {
      const url = `${window.location.origin}/visits/${visit.id}`;
      setShareUrl(url);
    } else {
      router.refresh();
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("分享連結已複製");
  }

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">載入中...</p>;
  }

  if (shareUrl) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">打卡成功！</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            分享你的巡禮打卡給朋友
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={copyShareLink}>
              <Share2 className="mr-2 h-4 w-4" />
              複製連結
            </Button>
            <Button asChild className="flex-1">
              <Link href={shareUrl.replace(window.location.origin, "")}>查看分享卡</Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.refresh()}
          >
            完成
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">打卡造訪</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">評分</label>
            <input
              type="range"
              min={1}
              max={10}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1 w-full accent-primary"
            />
            <span className="text-sm text-foreground">{rating}/10</span>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="巡禮心得..."
            rows={3}
          />
          <div>
            <label className="text-sm text-muted-foreground">同行夥伴</label>
            <input
              type="text"
              value={companions}
              onChange={(e) => setCompanions(e.target.value)}
              placeholder="以逗號分隔，例：小明, 小華"
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">隱私</label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">公開</SelectItem>
                <SelectItem value="followers">僅追蹤者</SelectItem>
                <SelectItem value="private">私密</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "打卡中..." : "打卡"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
