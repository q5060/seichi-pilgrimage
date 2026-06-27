"use client";

import { X } from "lucide-react";

interface ComparisonViewerProps {
  photoUrl: string;
  screenshotUrl: string | null;
  caption?: string | null;
  onClose: () => void;
}

export function ComparisonViewer({
  photoUrl,
  screenshotUrl,
  caption,
  onClose,
}: ComparisonViewerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-auto rounded-xl bg-elevated border border-border p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-secondary p-1.5 hover:bg-elevated"
          aria-label="關閉"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="mb-4 pr-10 text-lg font-bold">聖地對比照</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">動畫截圖</p>
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt="動畫截圖"
                className="w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-lg bg-secondary text-sm text-muted-foreground">
                尚無截圖
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">實地拍攝</p>
            <img src={photoUrl} alt="實地拍攝" className="w-full rounded-lg object-contain" />
          </div>
        </div>

        {caption && <p className="mt-4 text-sm text-muted-foreground">{caption}</p>}
      </div>
    </div>
  );
}
