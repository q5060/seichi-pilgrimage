import { ImageResponse } from "next/og";
import { db, anime } from "@seichi/db";
import { eq } from "drizzle-orm";
import type { AnimeTitles } from "@seichi/shared";

export const runtime = "nodejs";
export const alt = "聖地巡禮";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function displayTitle(titles: AnimeTitles | undefined) {
  return titles?.chinese ?? titles?.native ?? titles?.romaji ?? "動畫作品";
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anilistId = Number(id);

  const [row] = await db
    .select()
    .from(anime)
    .where(eq(anime.anilistId, anilistId))
    .limit(1);

  const titles = row?.titles as AnimeTitles | undefined;
  const title = displayTitle(titles);
  const romaji = titles?.romaji;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0b1622 0%, #162a40 50%, #0b1622 100%)",
          color: "#ffffff",
          padding: 64,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 28, color: "#6d9ec4", fontWeight: 600 }}>
          聖地巡禮 · 作品
        </div>
        <div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {romaji && romaji !== title && (
            <div style={{ fontSize: 28, color: "#9ab4c8", marginTop: 16 }}>
              {romaji}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
