import { test, expect } from "@playwright/test";
import path from "node:path";

test("Google is primary on login and signup, with email available by choice", async ({ page }) => {
  for (const route of ["/login", "/signup"]) {
    let request: { adultConfirmed: boolean; signup: boolean } | undefined;
    await page.route("**/api/auth/google", r => { request = r.request().postDataJSON(); return r.fulfill({ status: 503, json: { error: "Fictional provider response for this test." } }); });
    await page.goto(route);
    const google = page.getByRole("button", { name: "Continue with Google", exact: true });
    const email = page.getByLabel("Email", { exact: true });
    await expect(google).toBeVisible(); await expect(email).toBeHidden(); await expect(email).toBeDisabled();
    const box = await google.boundingBox(); expect(box!.y + box!.height).toBeLessThan(page.viewportSize()!.height);
    expect(await google.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(238, 238, 238)");
    if (process.env.ECHO_QA_DIR) await page.screenshot({ path: path.join(process.env.ECHO_QA_DIR, `${route.slice(1)}-${test.info().project.name}.png`) });
    await page.getByRole("checkbox", { name: /I am 18 or older/ }).check(); await google.click();
    await expect.poll(() => request).toEqual({ adultConfirmed: true, signup: route === "/signup" });
    await expect(page.getByRole("alert").filter({ hasText: "Fictional provider response" })).toBeVisible();
    await page.getByText("Use email instead", { exact: true }).click();
    await expect(email).toBeVisible(); await expect(email).toBeEnabled();
    await page.getByText("Use email instead", { exact: true }).click();
    await expect(email).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.unroute("**/api/auth/google");
  }
});

test("cover stickers resize beyond two times, stay inside the book and persist", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByLabel("One possible version of me is…").fill("A calm and creative maker");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I am 18 or older.", exact: true }).check();
  await page.getByRole("button", { name: /^(Meet your Future Self|Continue on this device without AI)$/ }).click();
  await page.getByRole("button", { name: "Add a personal moment", exact: true }).click();
  await page.getByRole("textbox", { name: "My words", exact: true }).fill("Fictional words that stay unchanged.");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Back to Your Space", exact: true }).click();
  await page.getByRole("button", { name: /Customize \d{4} book/ }).click();
  await page.getByRole("button", { name: /Lace & letters/ }).click();
  const cover = page.locator(".journal-book-designer > .journal-cover");
  const sticker = cover.getByRole("group", { name: "lace-trim cover sticker", exact: true });
  const scale = () => sticker.evaluate(el => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.hypot(m.a, m.b); });
  await sticker.focus(); await cover.scrollIntoViewIfNeeded();
  const h = await page.getByRole("button", { name: "Resize lace-trim cover sticker", exact: true }).boundingBox();
  await page.mouse.move(h!.x + h!.width / 2, h!.y + h!.height / 2); await page.mouse.down();
  await page.mouse.move(h!.x + h!.width / 2 + 50, h!.y + h!.height / 2 + 50, { steps: 10 }); await page.mouse.up();
  expect(await scale()).toBeGreaterThan(2.1);
  await page.getByRole("button", { name: "Undo", exact: true }).click(); expect(await scale()).toBeCloseTo(2, 2);
  await page.getByRole("button", { name: "Redo", exact: true }).click(); expect(await scale()).toBeGreaterThan(2.1);
  await sticker.focus();
  for (let i = 0; i < 30; i++) await sticker.press("+");
  const maxScale = await scale(); await sticker.press("+"); expect(await scale()).toBeCloseTo(maxScale, 3);
  await sticker.press("]"); await sticker.press("Shift+ArrowRight"); await sticker.press("Shift+ArrowUp");
  const outer = await cover.boundingBox(), inner = await sticker.boundingBox();
  expect(inner!.x).toBeGreaterThanOrEqual(outer!.x); expect(inner!.y).toBeGreaterThanOrEqual(outer!.y);
  expect(inner!.x + inner!.width).toBeLessThanOrEqual(outer!.x + outer!.width);
  expect(inner!.y + inner!.height).toBeLessThanOrEqual(outer!.y + outer!.height);
  expect(await scale()).toBeGreaterThan(2);
  const transform = await sticker.evaluate(el => (el as HTMLElement).style.transform);
  if (process.env.ECHO_QA_DIR) await page.screenshot({ path: path.join(process.env.ECHO_QA_DIR, `larger-sticker-${test.info().project.name}.png`) });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.reload(); await page.getByRole("button", { name: "Open Your Space", exact: true }).click();
  expect(await page.locator('.journal-open-cover [data-object="sticker:template-lace"]').evaluate(el => (el as HTMLElement).style.transform)).toBe(transform);
});
