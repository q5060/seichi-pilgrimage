import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // CI starts the server in the workflow (monorepo root); local runs use webServer.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        env: {
          ...process.env,
          AUTH_SECRET:
            process.env.AUTH_SECRET ??
            "ci-e2e-secret-at-least-32-characters-long",
          AUTH_URL: process.env.AUTH_URL ?? baseURL,
          AUTH_TRUST_HOST: "true",
          ENABLE_DEV_CREDENTIALS: "true",
          NEXT_PUBLIC_ENABLE_DEV_LOGIN: "true",
        },
      },
});
