import { test, expect } from "@playwright/test";

test.describe("Frontend App Shell and Core Pages", () => {
  test("renders home input page with idea submission form", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Kalp\.io/);
    await expect(page.locator("h1")).toContainText(/Turn your project idea/i);
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("renders projects workspace page", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.locator("h1")).toContainText(/My Projects/i);
  });

  test("renders diagnostics gemini status page", async ({ page }) => {
    await page.goto("/gemini_status");
    await expect(page.locator("h1")).toContainText(/Gemini & LLM Status/i);
  });
});
