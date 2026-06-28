import { describe, it, expect } from "vitest";
import { getNotificationCopy } from "./notification-copy";

describe("getNotificationCopy", () => {
  it("returns zh-TW follow copy", () => {
    const copy = getNotificationCopy("follow", "zh-TW", { actorName: "Alice" });
    expect(copy.title).toBe("Alice 開始追蹤你");
  });

  it("returns ja follow copy", () => {
    const copy = getNotificationCopy("follow", "ja", { actorName: "Bob" });
    expect(copy.title).toBe("Bob があなたをフォローしました");
  });

  it("returns route invite body in zh-TW", () => {
    const copy = getNotificationCopy("route_invite", "zh-TW", {
      routeTitle: "東京一日",
    });
    expect(copy.title).toBe("路線協作邀請");
    expect(copy.body).toContain("東京一日");
  });

  it("returns achievement body", () => {
    const copy = getNotificationCopy("achievement", "ja", {
      achievementName: "初チェックイン",
    });
    expect(copy.body).toBe("初チェックイン");
  });
});
