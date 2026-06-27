import { ImageResponse } from "next/og";
import { db, spots } from "@seichi/db";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const alt = "聖地巡禮";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [spot] = await db
    .select()
    .from(spots)
    .where(eq(spots.id, id))
    .limit(1);

  const title = spot?.nameZh ?? "聖地";
  const subtitle = spot?.prefecture ?? "日本";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0b1622 0%, #1a3a52 50%, #0b1622 100%)",
          color: "#ffffff",
          padding: 64,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 28, color: "#6d9ec4", fontWeight: 600 }}>
          聖地巡禮
        </div>
        <div>
          <div style={{ fontSize: 32, color: "#8ab4d9", marginBottom: 12 }}>
            {subtitle}
          </div>
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
          {spot?.nameJa && (
            <div style={{ fontSize: 28, color: "#9ab4c8", marginTop: 16 }}>
              {spot.nameJa}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
