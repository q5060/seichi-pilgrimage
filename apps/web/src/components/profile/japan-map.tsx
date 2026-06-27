"use client";

import { PREFECTURES } from "@seichi/shared";
import { cn } from "@/lib/utils";

/** Approximate SVG positions (viewBox 0 0 100 110) for each prefecture */
const PREFECTURE_LAYOUT: Record<string, { x: number; y: number; w: number; h: number }> = {
  北海道: { x: 62, y: 2, w: 22, h: 14 },
  青森県: { x: 68, y: 18, w: 8, h: 6 },
  岩手県: { x: 76, y: 18, w: 8, h: 10 },
  宮城県: { x: 72, y: 28, w: 8, h: 6 },
  秋田県: { x: 64, y: 24, w: 8, h: 8 },
  山形県: { x: 64, y: 32, w: 8, h: 6 },
  福島県: { x: 72, y: 34, w: 10, h: 8 },
  茨城県: { x: 74, y: 44, w: 8, h: 6 },
  栃木県: { x: 68, y: 42, w: 6, h: 6 },
  群馬県: { x: 62, y: 42, w: 6, h: 6 },
  埼玉県: { x: 66, y: 48, w: 8, h: 5 },
  千葉県: { x: 76, y: 50, w: 8, h: 8 },
  東京都: { x: 70, y: 52, w: 5, h: 4 },
  神奈川県: { x: 66, y: 54, w: 6, h: 5 },
  新潟県: { x: 58, y: 30, w: 8, h: 10 },
  富山県: { x: 50, y: 38, w: 6, h: 5 },
  石川県: { x: 44, y: 38, w: 6, h: 5 },
  福井県: { x: 38, y: 42, w: 6, h: 5 },
  山梨県: { x: 60, y: 50, w: 6, h: 5 },
  長野県: { x: 54, y: 44, w: 8, h: 8 },
  岐阜県: { x: 48, y: 48, w: 8, h: 6 },
  静岡県: { x: 56, y: 54, w: 10, h: 6 },
  愛知県: { x: 48, y: 54, w: 8, h: 5 },
  三重県: { x: 44, y: 56, w: 6, h: 6 },
  滋賀県: { x: 38, y: 50, w: 6, h: 5 },
  京都府: { x: 32, y: 50, w: 6, h: 5 },
  大阪府: { x: 30, y: 55, w: 6, h: 5 },
  兵庫県: { x: 26, y: 50, w: 8, h: 8 },
  奈良県: { x: 34, y: 56, w: 6, h: 5 },
  和歌山県: { x: 30, y: 61, w: 8, h: 6 },
  鳥取県: { x: 22, y: 48, w: 6, h: 5 },
  島根県: { x: 14, y: 48, w: 8, h: 6 },
  岡山県: { x: 20, y: 54, w: 8, h: 5 },
  広島県: { x: 12, y: 54, w: 8, h: 5 },
  山口県: { x: 6, y: 56, w: 8, h: 6 },
  徳島県: { x: 24, y: 62, w: 6, h: 5 },
  香川県: { x: 20, y: 60, w: 5, h: 4 },
  愛媛県: { x: 12, y: 62, w: 8, h: 6 },
  高知県: { x: 16, y: 68, w: 8, h: 8 },
  福岡県: { x: 4, y: 64, w: 8, h: 5 },
  佐賀県: { x: 2, y: 70, w: 6, h: 4 },
  長崎県: { x: 2, y: 74, w: 8, h: 6 },
  熊本県: { x: 8, y: 70, w: 8, h: 6 },
  大分県: { x: 14, y: 70, w: 6, h: 5 },
  宮崎県: { x: 10, y: 76, w: 8, h: 6 },
  鹿児島県: { x: 6, y: 82, w: 10, h: 8 },
  沖縄県: { x: 8, y: 98, w: 10, h: 6 },
};

export function JapanMap({ visitedPrefectures }: { visitedPrefectures: string[] }) {
  const visited = new Set(visitedPrefectures);

  return (
    <div className="glass rounded-xl p-5">
      <p className="mb-4 text-sm text-muted-foreground">
        已造訪{" "}
        <span className="font-semibold text-primary">{visited.size}</span> /{" "}
        {PREFECTURES.length} 都道府縣
      </p>
      <svg
        viewBox="0 0 100 110"
        className="mx-auto w-full max-w-md"
        role="img"
        aria-label="日本都道府縣地圖"
      >
        {PREFECTURES.map((p) => {
          const layout = PREFECTURE_LAYOUT[p];
          if (!layout) return null;
          const isVisited = visited.has(p);
          const shortName = p.replace(/[県府都道]/g, "");
          return (
            <a key={p} href={`/regions/${encodeURIComponent(p)}`}>
              <g className="cursor-pointer">
                <rect
                  x={layout.x}
                  y={layout.y}
                  width={layout.w}
                  height={layout.h}
                  rx={1.5}
                  className={cn(
                    "stroke-border transition-colors",
                    isVisited
                      ? "fill-primary/50 stroke-primary/60 hover:fill-primary/70"
                      : "fill-surface/80 stroke-border/60 hover:fill-surface"
                  )}
                />
                <text
                  x={layout.x + layout.w / 2}
                  y={layout.y + layout.h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={cn(
                    "pointer-events-none select-none text-[3px] font-medium",
                    isVisited ? "fill-primary" : "fill-muted-foreground/60"
                  )}
                >
                  {shortName}
                </text>
              </g>
            </a>
          );
        })}
      </svg>
    </div>
  );
}
