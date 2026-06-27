"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireAuth } from "@/lib/require-auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function uploadViaPresign(
  file: File,
  spotId: string,
  isComparison: boolean,
  altText?: string
) {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type || "image/jpeg",
      filename: file.name,
    }),
  });

  if (presignRes.status === 501) {
    return null;
  }

  if (!presignRes.ok) {
    const data = await presignRes.json();
    throw new Error(data.error ?? "無法取得上傳授權");
  }

  const { uploadUrl, key, contentType } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("直傳至儲存空間失敗");
  }

  const confirmRes = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storageKey: key,
      spotId,
      isComparison,
      altText: altText || undefined,
    }),
  });

  if (!confirmRes.ok) {
    const data = await confirmRes.json();
    throw new Error(data.error ?? "上傳確認失敗");
  }

  return confirmRes.json();
}

async function uploadViaForm(
  file: File,
  spotId: string,
  isComparison: boolean,
  altText?: string
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("spotId", spotId);
  formData.append("isComparison", String(isComparison));
  if (altText) formData.append("altText", altText);

  const res = await fetch("/api/photos", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "上傳失敗");
  }
  return res.json();
}

export function PhotoUpload({ spotId }: { spotId: string }) {
  const router = useRouter();
  const { requireAuth, status } = useRequireAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [altText, setAltText] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!requireAuth()) return;

    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");

    const isComparison = e.target.dataset.comparison === "true";

    try {
      const direct = await uploadViaPresign(file, spotId, isComparison, altText);
      if (!direct) {
        await uploadViaForm(file, spotId, isComparison, altText);
      }
      toast.success("照片上傳成功！");
      e.target.value = "";
      setAltText("");
    } catch (err) {
      if (err instanceof Error && err.message.includes("未登入")) {
        router.push("/auth/signin");
        return;
      }
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-muted-foreground">載入中...</p>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">上傳照片</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">無障礙說明（選填）</label>
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="簡述照片內容"
            className="mt-1"
          />
        </div>
        <Button variant="secondary" className="relative w-full" disabled={loading} asChild>
          <label>
            {loading ? "上傳中..." : "上傳實拍"}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        </Button>
        <Button variant="outline" className="relative w-full" disabled={loading} asChild>
          <label>
            上傳對比照
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              data-comparison="true"
              onChange={handleUpload}
              disabled={loading}
            />
          </label>
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
