"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ComparisonViewer } from "./comparison-viewer";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { ChipFilter } from "@/components/ui/chip-filter";
import { EmptyState } from "@/components/ui/empty-state";
import { Camera } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  tag: string;
  isComparison: boolean;
  comparisonScreenshotUrl: string | null;
}

type TagFilter = "all" | "comparison" | "scenery";

export function PhotoGallery({
  spotId,
  initialPhotos,
}: {
  spotId: string;
  initialPhotos?: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos ?? []);
  const [filter, setFilter] = useState<TagFilter>("all");
  const [loading, setLoading] = useState(!initialPhotos);
  const [selectedComparison, setSelectedComparison] = useState<Photo | null>(null);

  useEffect(() => {
    if (initialPhotos) return;
    fetch(`/api/photos?spotId=${spotId}`)
      .then((r) => r.json())
      .then((data) => setPhotos(data.items ?? (Array.isArray(data) ? data : [])))
      .finally(() => setLoading(false));
  }, [spotId, initialPhotos]);

  const filtered = photos.filter((p) => {
    if (filter === "all") return true;
    return p.tag === filter;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-elevated" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title="尚無照片"
        description="成為第一個分享此地點照片的人"
      />
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title={`照片牆（${photos.length}）`} className="mb-0" />
        <ChipFilter<TagFilter>
          options={[
            { value: "comparison", label: "對比照" },
            { value: "scenery", label: "風景" },
          ]}
          value={filter === "all" ? "" : filter}
          onChange={(v) => setFilter(v === "" ? "all" : v)}
          allLabel="全部"
          className="pb-0"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => p.isComparison && setSelectedComparison(p)}
            className={`group relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-elevated ${
              p.isComparison ? "cursor-pointer hover:border-primary/40 hover:shadow-glow-sm" : ""
            }`}
          >
            <Image
              src={p.thumbnailUrl ?? p.url}
              alt={p.caption ?? ""}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            {p.isComparison && (
              <Badge className="absolute left-2 top-2" variant="default">
                對比照
              </Badge>
            )}
            {p.caption && (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 text-left text-xs text-foreground">
                {p.caption}
              </p>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">此分類尚無照片</p>
      )}

      {selectedComparison && (
        <ComparisonViewer
          photoUrl={selectedComparison.url}
          screenshotUrl={selectedComparison.comparisonScreenshotUrl}
          caption={selectedComparison.caption}
          onClose={() => setSelectedComparison(null)}
        />
      )}
    </section>
  );
}
