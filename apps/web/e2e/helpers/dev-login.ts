import { type Page, expect } from "@playwright/test";

const DEMO_EMAIL = "demo@seichi.local";
const DEMO_NAME = "巡禮測試者";

export async function devLogin(page: Page) {
  const csrfResp = await page.request.get("/api/auth/csrf");
  if (!csrfResp.ok()) {
    throw new Error(
      `CSRF fetch failed: ${csrfResp.status()} ${await csrfResp.text()}`
    );
  }
  const { csrfToken } = (await csrfResp.json()) as { csrfToken: string };

  const loginResp = await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      callbackUrl: "/",
      json: "true",
    },
  });
  if (!loginResp.ok()) {
    throw new Error(
      `Credentials login failed: ${loginResp.status()} ${await loginResp.text()}`
    );
  }
}

export async function expectLoggedIn(page: Page) {
  await page.goto("/settings");
  await expect(
    page.getByRole("heading", { name: /帳號設定|アカウント設定/ })
  ).toBeVisible({ timeout: 15000 });
}
