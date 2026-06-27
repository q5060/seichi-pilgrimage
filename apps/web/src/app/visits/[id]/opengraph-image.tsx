import { ImageResponse } from "next/og";
import { db, visits, spots, users } from "@seichi/db";
import { eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "打卡分享";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [result] = await db
    .select({ visit: visits, spot: spots, user: users })
    .from(visits)
    .innerJoin(spots, eq(visits.spotId, spots.id))
    .innerJoin(users, eq(visits.userId, users.id))
    .where(eq(visits.id, id))
    .limit(1);

  if (!result || result.visit.privacy !== "public") {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "#0b1622",
            color: "#fff",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
          }}
        >
          聖地巡禮
        </div>
      ),
      { ...size }
    );
  }

  const { visit, spot, user } = result;
  const rating = visit.rating ? `${visit.rating}/10` : null;
  const date = formatDate(visit.visitedAt.toISOString());

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
          聖地巡禮 · 打卡
        </div>
        <div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>
            {spot.nameZh}
          </div>
          <div style={{ fontSize: 28, color: "#9ca3af", marginTop: 16 }}>
            {spot.prefecture}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 24, color: "#d1d5db" }}>
              {user.name ?? user.username ?? "巡禮者"}
            </div>
            <div style={{ fontSize: 20, color: "#6b7280", marginTop: 8 }}>{date}</div>
          </div>
          {rating && (
            <div
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: "#6d9ec4",
                background: "rgba(109,158,196,0.15)",
                padding: "12px 24px",
                borderRadius: 12,
              }}
            >
              {rating}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
