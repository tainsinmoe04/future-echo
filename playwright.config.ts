import { defineConfig } from "@playwright/test";
const baseURL = process.env.ECHO_BASE_URL ?? "http://localhost:3000";
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1,
  forbidOnly: Boolean(process.env.CI), retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, locale: "en-US", timezoneId: "Asia/Rangoon", contextOptions: { reducedMotion: "reduce" }, screenshot: "only-on-failure", trace: "retain-on-failure", launchOptions: process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {} },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "small-mobile", use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  ...(process.env.CI ? { webServer: { command: "npm run start -- --hostname 127.0.0.1", url: "http://localhost:3000", timeout: 120000, reuseExistingServer: false } } : {}),
});
