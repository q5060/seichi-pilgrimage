import { describe, it, expect } from "vitest";
import {
  defaultSeasonForDate,
  parseBrowseTab,
  parseSeason,
  parseYear,
} from "./anime-browse-shared";

describe("defaultSeasonForDate", () => {
  it("returns winter for January", () => {
    expect(defaultSeasonForDate(new Date("2026-01-15"))).toEqual({
      season: "WINTER",
      year: 2026,
    });
  });

  it("returns spring for April", () => {
    expect(defaultSeasonForDate(new Date("2026-04-01"))).toEqual({
      season: "SPRING",
      year: 2026,
    });
  });

  it("returns summer for July", () => {
    expect(defaultSeasonForDate(new Date("2026-07-01"))).toEqual({
      season: "SUMMER",
      year: 2026,
    });
  });

  it("returns fall for October", () => {
    expect(defaultSeasonForDate(new Date("2026-10-01"))).toEqual({
      season: "FALL",
      year: 2026,
    });
  });
});

describe("parseBrowseTab", () => {
  it("defaults to season", () => {
    expect(parseBrowseTab()).toBe("season");
    expect(parseBrowseTab("invalid")).toBe("season");
  });

  it("accepts valid tabs", () => {
    expect(parseBrowseTab("trending")).toBe("trending");
    expect(parseBrowseTab("pilgrimage")).toBe("pilgrimage");
  });
});

describe("parseSeason", () => {
  it("falls back to current season", () => {
    const current = defaultSeasonForDate();
    expect(parseSeason()).toBe(current.season);
    expect(parseSeason("INVALID")).toBe(current.season);
  });

  it("accepts valid season", () => {
    expect(parseSeason("SUMMER")).toBe("SUMMER");
  });
});

describe("parseYear", () => {
  it("falls back to current year", () => {
    expect(parseYear()).toBe(new Date().getFullYear());
    expect(parseYear("abc")).toBe(new Date().getFullYear());
  });

  it("accepts valid year", () => {
    expect(parseYear("2024")).toBe(2024);
  });
});
