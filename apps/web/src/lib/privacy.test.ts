import { describe, expect, it } from "vitest";
import { canViewContent, sanitizeSpotForList } from "./privacy";

describe("canViewContent", () => {
  const ownerId = "owner-1";
  const viewerId = "viewer-1";
  const following = new Set([ownerId]);

  it("allows public content for anonymous viewers", () => {
    expect(canViewContent("public", ownerId, undefined, new Set())).toBe(true);
  });

  it("denies non-public content for anonymous viewers", () => {
    expect(canViewContent("followers", ownerId, undefined, new Set())).toBe(
      false
    );
    expect(canViewContent("private", ownerId, undefined, new Set())).toBe(
      false
    );
  });

  it("allows owners to view their own content", () => {
    expect(canViewContent("private", ownerId, ownerId, new Set())).toBe(true);
  });

  it("allows followers to view followers-only content", () => {
    expect(canViewContent("followers", ownerId, viewerId, following)).toBe(
      true
    );
  });

  it("denies followers-only content when not following", () => {
    expect(canViewContent("followers", ownerId, viewerId, new Set())).toBe(
      false
    );
  });
});

describe("sanitizeSpotForList", () => {
  const baseSpot = {
    latitude: 35.6586,
    longitude: 139.7454,
    fuzzyLatitude: 35.66,
    fuzzyLongitude: 139.75,
    isSensitive: false,
  };

  it("returns spot unchanged when not sensitive", () => {
    expect(sanitizeSpotForList(baseSpot)).toEqual(baseSpot);
  });

  it("replaces coordinates with fuzzy values for sensitive spots", () => {
    const sensitive = { ...baseSpot, isSensitive: true };
    const result = sanitizeSpotForList(sensitive);
    expect(result.latitude).toBe(35.66);
    expect(result.longitude).toBe(139.75);
  });

  it("falls back to original coordinates when fuzzy values are missing", () => {
    const sensitive = {
      ...baseSpot,
      isSensitive: true,
      fuzzyLatitude: null,
      fuzzyLongitude: null,
    };
    const result = sanitizeSpotForList(sensitive);
    expect(result.latitude).toBe(35.6586);
    expect(result.longitude).toBe(139.7454);
  });
});
