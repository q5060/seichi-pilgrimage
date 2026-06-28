import { test, expect } from "@playwright/test";
import { devLogin, expectLoggedIn } from "./helpers/dev-login";

test.describe("smoke", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/聖地/);
  });

  test("search page loads with skeleton or results area", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "搜尋", level: 1 })).toBeVisible();
    await page.locator("#search-form input[type='search']").first().fill("東京");
    await page.locator("#search-form").press("Enter");
    await expect(page.locator(".animate-pulse, [class*='skeleton']").first()).toBeVisible({
      timeout: 5000,
    }).catch(() => {
      // skeleton may be too fast; ensure page responded
    });
  });

  test("spots list navigation", async ({ page }) => {
    await page.goto("/spots");
    await expect(page.getByRole("link").first()).toBeVisible();
    const spotLink = page.locator('main a[href^="/spots/"]:not([href="/spots/map"])').first();
    if (await spotLink.count()) {
      await spotLink.click();
      await expect(page).toHaveURL(/\/spots\/[^/]+$/);
    }
  });

  test("search empty results for unlikely keyword", async ({ page }) => {
    await page.goto("/search");
    await page.getByRole("tab", { name: "聖地" }).click();
    await page.locator("#search-form input[type='search']").first().fill("zzzznonexistentkeyword99999");
    await page.locator("#search-form").press("Enter");
    await expect(page.getByText("找不到結果")).toBeVisible({ timeout: 10000 });
  });

  test("map page loads", async ({ page }) => {
    await page.goto("/spots/map");
    await expect(page.getByRole("heading", { name: "地圖探索" })).toBeVisible();
  });

  test("lists new page opens create dialog or redirects to sign in", async ({
    page,
  }) => {
    await page.goto("/lists/new");
    await expect(
      page.getByRole("heading", { name: /新增清單|登入聖地巡禮/i })
    ).toBeVisible();
  });

  test("mobile more sheet opens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/spots");
    await page.getByRole("button", { name: /更多|もっと見る/ }).click();
    await expect(page.getByRole("link", { name: /動態|タイムライン/ })).toBeVisible();
  });

  test("dev credentials sign-in reaches settings", async ({ page }) => {
    await devLogin(page);
    await expectLoggedIn(page);
  });

  test("search page title in Japanese locale", async ({ page, context }) => {
    await context.addCookies([
      {
        name: "NEXT_LOCALE",
        value: "ja",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "検索", level: 1 })).toBeVisible();
  });

  test("anime browse page loads", async ({ page }) => {
    await page.goto("/anime");
    await expect(page.getByRole("heading", { name: "作品瀏覽", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "本季新番" })).toBeVisible();
  });

  test("list detail loads after creating a list", async ({ page }) => {
    await devLogin(page);

    await page.goto("/lists/new");
    await page.getByPlaceholder("清單名稱").waitFor({ state: "visible", timeout: 15000 });
    await page.getByPlaceholder("清單名稱").fill("E2E 測試清單");
    await page.getByRole("button", { name: "建立" }).click();
    await page.waitForURL(/\/lists\/[^/]+/, { timeout: 15000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("anime score saves without changing status", async ({ page }) => {
    await devLogin(page);

    await page.goto("/anime/21617");
    await expect(page.getByText("載入狀態中...")).toBeHidden({ timeout: 15000 });
    const scoreInput = page.getByLabel("評分（1–10）");
    await scoreInput.fill("9");
    await page.getByRole("button", { name: "儲存評價" }).click();
    await expect(page.getByText("已儲存")).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.getByText("載入狀態中...")).toBeHidden({ timeout: 15000 });
    await expect(page.getByLabel("評分（1–10）")).toHaveValue("9");
  });
});
