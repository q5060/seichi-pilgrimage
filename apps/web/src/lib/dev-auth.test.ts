import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("dev-auth", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows dev credentials in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.ENABLE_DEV_CREDENTIALS;
    const { isDevCredentialsEnabled } = await import("./dev-auth");
    expect(isDevCredentialsEnabled()).toBe(true);
  });

  it("allows dev credentials in production when flag is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_DEV_CREDENTIALS", "true");
    const { isDevCredentialsEnabled } = await import("./dev-auth");
    expect(isDevCredentialsEnabled()).toBe(true);
  });

  it("blocks dev credentials in production without flag", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ENABLE_DEV_CREDENTIALS", "");
    const { isDevCredentialsEnabled } = await import("./dev-auth");
    expect(isDevCredentialsEnabled()).toBe(false);
  });

  it("shows dev login UI when public flag is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_DEV_LOGIN", "true");
    const { isDevLoginUiEnabled } = await import("./dev-auth");
    expect(isDevLoginUiEnabled()).toBe(true);
  });
});
