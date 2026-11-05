import { test, expect } from "@playwright/test";

test("draft, pending send and completed chat survive repeated reloads", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/onboarding");
  await page.getByLabel("One possible version of me is…").fill("Someone who makes useful things");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator("input[type=month]").fill("2036-11");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I am 18 or older.", exact: true }).check();
  await page.getByRole("button", { name: "Meet your Future Self", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Message your future self", exact: true });
  await expect(page.getByText(/A little strange to meet yourself here/)).toBeVisible();
  await composer.fill("ရိုက်လက်စစာ မပျောက်ရဘူး");
  await page.reload();
  await expect(composer).toHaveValue("ရိုက်လက်စစာ မပျောက်ရဘူး");
  await page.clock.pauseAt(new Date());
  await composer.fill("A pending thought I do not want to lose");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".echo-message.from-present")).toHaveCount(1);
  await page.reload();
  await expect(composer).toHaveValue("A pending thought I do not want to lose");
  await expect(page.locator(".echo-message.from-present")).toHaveCount(1);
  await expect(page.locator(".echo-typing")).toHaveCount(0);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByLabel("Message options", { exact: true })).toHaveCount(1);
  await expect(page.locator(".echo-message.from-present")).toHaveCount(1);
  const messages = await page.locator(".echo-message p").allTextContents();
  for (let index = 0; index < 3; index++) {
    await page.reload();
    await expect(page.locator(".echo-message p")).toHaveText(messages);
    await expect(composer).toHaveValue("");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
