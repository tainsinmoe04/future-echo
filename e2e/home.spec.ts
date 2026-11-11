import { test, expect } from "@playwright/test";

test("Home remains the first screen for guests and verified returning accounts", async ({ page }) => {
  let user: { id: string } | null = null;
  await page.route("**/api/auth/session", route => route.fulfill({ json: { user } }));
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Meet your future self" })).toHaveAttribute("href", "/signup");
  await expect(page.locator(".across-emblem")).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "မြန်မာ", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("lang", "my");
  await expect(page.getByRole("region", { name: "စိတ်ကူးယဉ် နမူနာစကားဝိုင်း" })).toBeVisible();
  user = { id: "11111111-1111-4111-8111-111111111111" };
  await page.reload();
  await expect(page.locator("main")).toHaveAttribute("lang", "my");
  await expect(page.getByRole("link", { name: "စကားဆက်ပြောမယ်" })).toHaveAttribute("href", "/now");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("link", { name: "Continue conversation" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const favicon = await page.request.get("/favicon.ico");
  expect(favicon.ok()).toBe(true);
  expect((await favicon.body()).readUInt16LE(2)).toBe(1);
});
