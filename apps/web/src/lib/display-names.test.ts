import { describe, expect, it } from "vitest";
import {
  getAnimeDisplayTitle,
  getAnimeSearchAttributes,
  getSpotDisplayName,
  getSpotSearchAttributes,
} from "./display-names";

describe("getSpotDisplayName", () => {
  it("prefers Chinese for zh-TW", () => {
    expect(
      getSpotDisplayName({ nameZh: "東京塔", nameJa: "東京タワー" }, "zh-TW")
    ).toBe("東京塔");
  });

  it("prefers Japanese for ja locale", () => {
    expect(
      getSpotDisplayName({ nameZh: "東京塔", nameJa: "東京タワー" }, "ja")
    ).toBe("東京タワー");
  });

  it("falls back when primary locale name is missing", () => {
    expect(getSpotDisplayName({ nameZh: "測試", nameJa: null }, "ja")).toBe("測試");
    expect(getSpotDisplayName({ nameZh: "", nameJa: "テスト" }, "zh-TW")).toBe("テスト");
  });

  it("returns empty string when both names missing", () => {
    expect(getSpotDisplayName({ nameZh: "", nameJa: null }, "zh-TW")).toBe("");
    expect(getSpotDisplayName({ nameZh: "", nameJa: "" }, "ja")).toBe("");
  });
});

describe("getAnimeDisplayTitle", () => {
  const titles = {
    chinese: "你的名字。",
    native: "君の名は。",
    romaji: "Kimi no Na wa.",
    english: "Your Name.",
  };

  it("prefers Chinese for zh-TW", () => {
    expect(getAnimeDisplayTitle(titles, "zh-TW")).toBe("你的名字。");
  });

  it("prefers native title for ja locale", () => {
    expect(getAnimeDisplayTitle(titles, "ja")).toBe("君の名は。");
  });

  it("returns fallback when all titles are missing", () => {
    expect(getAnimeDisplayTitle({}, "zh-TW")).toBe("未知作品");
  });
});

describe("getSpotSearchAttributes", () => {
  it("orders nameJa first for ja locale", () => {
    expect(getSpotSearchAttributes("ja")[0]).toBe("nameJa");
  });

  it("orders nameZh first for zh-TW locale", () => {
    expect(getSpotSearchAttributes("zh-TW")[0]).toBe("nameZh");
  });
});

describe("getAnimeSearchAttributes", () => {
  it("orders titleNative first for ja locale", () => {
    expect(getAnimeSearchAttributes("ja")[0]).toBe("titleNative");
  });

  it("orders titleChinese first for zh-TW locale", () => {
    expect(getAnimeSearchAttributes("zh-TW")[0]).toBe("titleChinese");
  });
});
