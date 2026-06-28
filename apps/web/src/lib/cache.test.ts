import { describe, it, expect, beforeEach, vi } from "vitest";

describe("cacheFetch memory fallback", () => {
  beforeEach(() => {
    vi.stubEnv("REDIS_URL", "");
    vi.resetModules();
  });

  it("returns cached value within TTL", async () => {
    const { cacheFetch } = await import("./cache");
    let calls = 0;
    const fetcher = async () => {
      calls++;
      return { n: calls };
    };

    const a = await cacheFetch("test:memory:key", fetcher, 60_000);
    const b = await cacheFetch("test:memory:key", fetcher, 60_000);

    expect(a).toEqual({ n: 1 });
    expect(b).toEqual({ n: 1 });
    expect(calls).toBe(1);
  });
});
