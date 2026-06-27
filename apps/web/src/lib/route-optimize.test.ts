import { describe, expect, it } from "vitest";
import { optimizeStopsByDay, type RouteStopCoords } from "./route-optimize";

describe("optimizeStopsByDay", () => {
  it("returns single stop unchanged", () => {
    const stops: RouteStopCoords[] = [
      { id: "1", spotId: "a", lat: 35.68, lng: 139.76, dayIndex: 1 },
    ];
    expect(optimizeStopsByDay(stops)).toHaveLength(1);
  });

  it("reorders stops within a day by nearest neighbor", () => {
    const stops: RouteStopCoords[] = [
      { id: "1", spotId: "a", lat: 0, lng: 0, dayIndex: 1 },
      { id: "2", spotId: "b", lat: 0.01, lng: 0.01, dayIndex: 1 },
      { id: "3", spotId: "c", lat: 10, lng: 10, dayIndex: 1 },
    ];
    const ordered = optimizeStopsByDay(stops);
    const ids = ordered.map((s) => s.id);
    expect(ids[0]).toBe("1");
    expect(ids[1]).toBe("2");
    expect(ids[2]).toBe("3");
  });

  it("keeps day groups separate", () => {
    const stops: RouteStopCoords[] = [
      { id: "d2", spotId: "b", lat: 5, lng: 5, dayIndex: 2 },
      { id: "d1", spotId: "a", lat: 1, lng: 1, dayIndex: 1 },
    ];
    const ordered = optimizeStopsByDay(stops);
    expect(ordered[0].dayIndex).toBe(1);
    expect(ordered[1].dayIndex).toBe(2);
  });
});
