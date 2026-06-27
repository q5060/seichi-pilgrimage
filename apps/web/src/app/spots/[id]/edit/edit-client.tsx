"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ACCESS_TYPES,
  ACCESS_TYPE_LABELS,
  SPOT_STATUSES,
  SPOT_STATUS_LABELS,
  PREFECTURES,
} from "@seichi/shared";

import { SpotAnimeLinksEditor } from "@/components/spots/anime-links-editor";

interface AnimeLinkRow {
  link: {
    id: string;
    episode?: string | null;
    scene?: { description?: string; timestamp?: string } | null;
  };
  anime: { anilistId: number; titles: { romaji?: string; english?: string; native?: string; chinese?: string } };
}

export default function EditSpotClient({ spotId }: { spotId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [animeLinks, setAnimeLinks] = useState<AnimeLinkRow[]>([]);
  const [form, setForm] = useState({
    nameZh: "",
    nameJa: "",
    latitude: "",
    longitude: "",
    fuzzyLatitude: "",
    fuzzyLongitude: "",
    isSensitive: false,
    prefecture: "",
    address: "",
    googleMapsUrl: "",
    osmUrl: "",
    accessType: "uncertain",
    status: "open",
    transportNotes: "",
    nearestStation: "",
    walkMinutes: "",
    suggestedStayMinutes: "",
    businessHours: "",
    alignmentDifficulty: "",
    photoTips: "",
    bestSeason: "",
    bestTimeOfDay: "",
    etiquetteNotes: "",
    changeSummary: "",
  });

  useEffect(() => {
    fetch(`/api/spots/${spotId}`)
      .then((r) => r.json())
      .then((spot) => {
        if (spot.error) {
          setError(spot.error);
          return;
        }
        setForm({
          nameZh: spot.nameZh ?? "",
          nameJa: spot.nameJa ?? "",
          latitude: String(spot.latitude ?? ""),
          longitude: String(spot.longitude ?? ""),
          fuzzyLatitude: spot.fuzzyLatitude ? String(spot.fuzzyLatitude) : "",
          fuzzyLongitude: spot.fuzzyLongitude ? String(spot.fuzzyLongitude) : "",
          isSensitive: spot.isSensitive ?? false,
          prefecture: spot.prefecture ?? "",
          address: spot.address ?? "",
          googleMapsUrl: spot.googleMapsUrl ?? "",
          osmUrl: spot.osmUrl ?? "",
          accessType: spot.accessType ?? "uncertain",
          status: spot.status ?? "open",
          transportNotes: spot.transportNotes ?? "",
          nearestStation: spot.nearestStation ?? "",
          walkMinutes: spot.walkMinutes ? String(spot.walkMinutes) : "",
          suggestedStayMinutes: spot.suggestedStayMinutes
            ? String(spot.suggestedStayMinutes)
            : "",
          businessHours: spot.businessHours ?? "",
          alignmentDifficulty: spot.alignmentDifficulty
            ? String(spot.alignmentDifficulty)
            : "",
          photoTips: spot.photoTips ?? "",
          bestSeason: spot.bestSeason ?? "",
          bestTimeOfDay: spot.bestTimeOfDay ?? "",
          etiquetteNotes: spot.etiquetteNotes ?? "",
          changeSummary: "",
        });
        setAnimeLinks(spot.animeLinks ?? []);
      })
      .finally(() => setLoading(false));
  }, [spotId]);

  function update(field: string, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/spots/${spotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameZh: form.nameZh,
        nameJa: form.nameJa || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        fuzzyLatitude: form.fuzzyLatitude ? Number(form.fuzzyLatitude) : undefined,
        fuzzyLongitude: form.fuzzyLongitude ? Number(form.fuzzyLongitude) : undefined,
        isSensitive: form.isSensitive,
        prefecture: form.prefecture,
        address: form.address || undefined,
        googleMapsUrl: form.googleMapsUrl || undefined,
        osmUrl: form.osmUrl || undefined,
        accessType: form.accessType,
        status: form.status,
        transportNotes: form.transportNotes || undefined,
        nearestStation: form.nearestStation || undefined,
        walkMinutes: form.walkMinutes ? Number(form.walkMinutes) : undefined,
        suggestedStayMinutes: form.suggestedStayMinutes
          ? Number(form.suggestedStayMinutes)
          : undefined,
        businessHours: form.businessHours || undefined,
        alignmentDifficulty: form.alignmentDifficulty
          ? Number(form.alignmentDifficulty)
          : undefined,
        photoTips: form.photoTips || undefined,
        bestSeason: form.bestSeason || undefined,
        bestTimeOfDay: form.bestTimeOfDay || undefined,
        etiquetteNotes: form.etiquetteNotes || undefined,
        changeSummary: form.changeSummary || undefined,
      }),
    });

    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error ?? "提交失敗");
      return;
    }

    setMessage(data.message ?? "已提交");
    if (data.autoApproved) {
      setTimeout(() => router.push(`/spots/${spotId}`), 1500);
    }
  }

  if (loading) return <p className="p-8 text-muted-foreground">載入中...</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/spots/${spotId}`} className="text-sm text-primary hover:underline">
        ← 返回聖地
      </Link>
      <h1 className="mt-4 text-2xl font-bold">提案編輯聖地</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        變更將進入審核佇列（信任分數 ≥ 50 自動核准）
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium">中文名稱</label>
          <input
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
            <label className="text-sm font-medium">緯度</label>
            <input
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium">經度</label>
            <input
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="isSensitive"
            type="checkbox"
            checked={form.isSensitive}
            onChange={(e) => update("isSensitive", e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isSensitive" className="text-sm font-medium">
            敏感地點（模糊座標）
          </label>
        </div>
        {form.isSensitive && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">模糊緯度</label>
              <input
                type="number"
                step="any"
                value={form.fuzzyLatitude}
                onChange={(e) => update("fuzzyLatitude", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">模糊經度</label>
              <input
                type="number"
                step="any"
                value={form.fuzzyLongitude}
                onChange={(e) => update("fuzzyLongitude", e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 p-2"
              />
            </div>
          </div>
        )}
        <div>
          <label className="text-sm font-medium">都道府縣</label>
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
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">OpenStreetMap 連結</label>
          <input
            value={form.osmUrl}
            onChange={(e) => update("osmUrl", e.target.value)}
            placeholder="https://www.openstreetmap.org/..."
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">營業時間</label>
          <input
            value={form.businessHours}
            onChange={(e) => update("businessHours", e.target.value)}
            placeholder="例：10:00–18:00（週一公休）"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">對位難度（1–5）</label>
          <input
            type="number"
            min={1}
            max={5}
            value={form.alignmentDifficulty}
            onChange={(e) => update("alignmentDifficulty", e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <div>
            <label className="text-sm font-medium">現況</label>
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 p-2"
            >
              {SPOT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SPOT_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">變更摘要</label>
          <input
            value={form.changeSummary}
            onChange={(e) => update("changeSummary", e.target.value)}
            placeholder="簡述此次編輯內容"
            className="mt-1 w-full rounded-lg border border-gray-300 p-2"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "提交中..." : "提交編輯提案"}
        </button>
      </form>

      <SpotAnimeLinksEditor
        spotId={spotId}
        links={animeLinks.map((row) => ({
          id: row.link.id,
          episode: row.link.episode,
          scene: row.link.scene,
          anime: row.anime,
        }))}
      />
    </div>
  );
}
