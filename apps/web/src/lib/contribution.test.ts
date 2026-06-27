import { describe, expect, it } from "vitest";
import { CONTRIBUTION_POINTS } from "./contribution";

describe("CONTRIBUTION_POINTS", () => {
  it("defines expected point values", () => {
    expect(CONTRIBUTION_POINTS.spot_created).toBe(10);
    expect(CONTRIBUTION_POINTS.spot_edit).toBe(3);
    expect(CONTRIBUTION_POINTS.spot_link_edit).toBe(2);
    expect(CONTRIBUTION_POINTS.location_report).toBe(1);
    expect(CONTRIBUTION_POINTS.photo_upload).toBe(2);
    expect(CONTRIBUTION_POINTS.travelogue_published).toBe(5);
    expect(CONTRIBUTION_POINTS.anime_meta).toBe(2);
  });

  it("covers all contribution actions", () => {
    const actions = Object.keys(CONTRIBUTION_POINTS);
    expect(actions).toHaveLength(7);
    for (const action of actions) {
      expect(CONTRIBUTION_POINTS[action as keyof typeof CONTRIBUTION_POINTS]).toBeGreaterThan(0);
    }
  });
});
