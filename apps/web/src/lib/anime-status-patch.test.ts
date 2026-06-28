import { describe, it, expect } from "vitest";

function buildStatusPatch(body: {
  pilgrimageStatus?: string;
  score?: number | null;
  review?: string | null;
  tags?: string[];
}) {
  const hasStatusUpdate =
    body.pilgrimageStatus !== undefined ||
    body.score !== undefined ||
    body.review !== undefined ||
    body.tags !== undefined;

  if (!hasStatusUpdate) return null;

  const updates: Record<string, unknown> = {};
  if (body.pilgrimageStatus !== undefined) updates.status = body.pilgrimageStatus;
  if (body.score !== undefined) updates.score = body.score;
  if (body.review !== undefined) updates.review = body.review;
  if (body.tags !== undefined) updates.tags = body.tags;

  return {
    updates,
    insertDefaults: {
      status: body.pilgrimageStatus ?? "want",
      score: body.score ?? null,
      review: body.review ?? null,
      tags: body.tags ?? [],
    },
  };
}

describe("userAnimeStatus PATCH field handling", () => {
  it("detects score-only updates", () => {
    const result = buildStatusPatch({ score: 8 });
    expect(result).not.toBeNull();
    expect(result?.updates).toEqual({ score: 8 });
    expect(result?.insertDefaults.status).toBe("want");
  });

  it("detects review and tags without status", () => {
    const result = buildStatusPatch({
      review: "很棒的巡禮",
      tags: ["夜景"],
    });
    expect(result?.updates).toEqual({
      review: "很棒的巡禮",
      tags: ["夜景"],
    });
  });

  it("returns null when no relevant fields", () => {
    expect(buildStatusPatch({})).toBeNull();
  });
});
