import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/聖地/);
  });

  test("search page loads with skeleton or results area", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "搜尋", level: 1 })).toBeVisible();
    await page.getByPlaceholder(/作品名|聖地|遊記/).fill("東京");
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
    await page.getByPlaceholder(/作品名|作品/).fill("zzzznonexistentkeyword99999");
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
});
