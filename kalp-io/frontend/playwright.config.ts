import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Kalp.io Frontend
 * Sets LLM_MOCK=1 in webServer environment so tests never reach the live LLM API.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      LLM_MOCK: "1",
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000",
    },
    timeout: 120 * 1000,
  },
});
