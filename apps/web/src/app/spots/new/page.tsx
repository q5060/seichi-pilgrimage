"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCESS_TYPES,
  ACCESS_TYPE_LABELS,
  PREFECTURES,
} from "@seichi/shared";
import { slugify } from "@/lib/utils";

export default function NewSpotPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nameZh: "",
    nameJa: "",
    latitude: "",
    longitude: "",
    prefecture: PREFECTURES[12],
    address: "",
    googleMapsUrl: "",
    accessType: "uncertain" as (typeof ACCESS_TYPES)[number],
    transportNotes: "",
    nearestStation: "",
    walkMinutes: "",
    suggestedStayMinutes: "",
    etiquetteNotes: "",
    photoTips: "",
    bestSeason: "",
    bestTimeOfDay: "",
    anilistIds: "",
    episode: "",
  });

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const anilistIds = form.anilistIds
      .split(/[,，\s]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n > 0);

    const res = await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameZh: form.nameZh,
        nameJa: form.nameJa || undefined,
        slug: slugify(form.nameZh),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        prefecture: form.prefecture,
        address: form.address || undefined,
        googleMapsUrl: form.googleMapsUrl || undefined,
        accessType: form.accessType,
        transportNotes: form.transportNotes || undefined,
        nearestStation: form.nearestStation || undefined,
        walkMinutes: form.walkMinutes ? Number(form.walkMinutes) : undefined,
        suggestedStayMinutes: form.suggestedStayMinutes
          ? Number(form.suggestedStayMinutes)
          : undefined,
        etiquetteNotes: form.etiquetteNotes || undefined,
        photoTips: form.photoTips || undefined,
        bestSeason: form.bestSeason || undefined,
        bestTimeOfDay: form.bestTimeOfDay || undefined,
        anilistIds,
        episode: form.episode || undefined,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "提交失敗");
      return;
    }

    router.push(`/spots/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/spots/map" className="text-sm text-primary hover:underline">
        ← 返回地圖
      </Link>
      <h1 className="mt-4 text-2xl font-bold">新增聖地</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        貢獻分數 ≥ 50 的使用者提交後將自動核准
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">中文名稱 *</label>
          <input
            required
            value={form.nameZh}
            onChange={(e) => update("nameZh", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">日文名稱</label>
          <input
            value={form.nameJa}
            onChange={(e) => update("nameJa", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">緯度 *</label>
            <input
              required
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">經度 *</label>
            <input
              required
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">都道府縣 *</label>
          <select
            value={form.prefecture}
            onChange={(e) => update("prefecture", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          >
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">地址</label>
          <input
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Google 地圖連結</label>
          <input
            value={form.googleMapsUrl}
            onChange={(e) => update("googleMapsUrl", e.target.value)}
            placeholder="https://maps.google.com/..."
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">拍攝權限</label>
          <select
            value={form.accessType}
            onChange={(e) => update("accessType", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          >
            {ACCESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCESS_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">最近車站</label>
            <input
              value={form.nearestStation}
              onChange={(e) => update("nearestStation", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">步行（分鐘）</label>
            <input
              type="number"
              value={form.walkMinutes}
              onChange={(e) => update("walkMinutes", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">AniList 作品 ID（逗號分隔）</label>
          <input
            value={form.anilistIds}
            onChange={(e) => update("anilistIds", e.target.value)}
            placeholder="21617, 142770"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">集數／場景</label>
          <input
            value={form.episode}
            onChange={(e) => update("episode", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">最佳季節</label>
          <input
            value={form.bestSeason}
            onChange={(e) => update("bestSeason", e.target.value)}
            placeholder="春、夏、秋、冬"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">拍攝建議</label>
          <textarea
            value={form.photoTips}
            onChange={(e) => update("photoTips", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            rows={2}
          />
        </div>
        <div>
          <label className="text-sm font-medium">禮儀提醒</label>
          <textarea
            value={form.etiquetteNotes}
            onChange={(e) => update("etiquetteNotes", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            rows={2}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "提交中..." : "提交聖地"}
        </button>
      </form>
    </div>
  );
}
