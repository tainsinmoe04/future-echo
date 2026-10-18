import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
});
async function evidence(page: Page, name: string) { if (process.env.ECHO_QA_DIR) await page.screenshot({ path: path.join(process.env.ECHO_QA_DIR, `${name}-${test.info().project.name}.png`) }); }

async function begin(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-14T18:30:00.000Z"));
  await page.goto("/onboarding");
  await page.getByLabel("One possible version of me is…").fill("Someone who makes things without losing the rest of life");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator("input[type=month]").fill("2036-10");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I am 18 or older.", exact: true }).check();
  await page.getByRole("button", { name: "Meet your Future Self", exact: true }).click();
  await page.getByRole("textbox", { name: "Message your future self", exact: true }).waitFor();
  await expect(page.getByText(/How is that direction feeling today/)).toBeVisible();
}
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }

test("fresh personal space is empty, demo is isolated, and setup survives refresh", async ({ page }) => {
  await page.goto("/"); await expect(page).toHaveTitle("Future Echo"); await noOverflow(page);
  await evidence(page, "updated-landing");
  await page.getByRole("button", { name: "Send this example", exact: true }).click();
  await page.getByRole("button", { name: "Save this moment", exact: true }).click();
  await expect(page.getByText("This is only a preview. Your own space starts empty.", { exact: true })).toBeVisible();
  await page.goto("/memory"); await expect(page.getByText("Your first page can be anything.", { exact: true })).toBeVisible();
  await expect(page.locator(".constellation-star")).toHaveCount(0); await evidence(page, "empty-personal-space");
  await page.goto("/onboarding"); await page.getByLabel("One possible version of me is…").fill("A direction still taking shape");
  await page.getByRole("button", { name: "Continue", exact: true }).click(); await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.reload(); await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("One possible version of me is…")).toHaveValue("A direction still taking shape"); await noOverflow(page);
});

test("earlier exchanges support Myanmar redaction and reversible separate memory permissions", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await begin(page);
  const composer = page.getByRole("textbox", { name: "Message your future self", exact: true });
  await composer.fill("ဒီနေ့စာမေးပွဲအောင်တယ်ဒါပေမယ့်စိတ်ပင်ပန်းတယ်"); await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save this moment", exact: true })).toHaveCount(1);
  await composer.fill("I feel tired tonight"); await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save this moment", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Save this moment", exact: true }).first().click();
  await page.getByLabel("Your words · redact only").fill("ဒီနေ့စာမေးပွဲအောင်တယ်");
  await page.getByLabel("A name for this moment").fill("Words from earlier");
  await page.getByLabel("My Note (optional)").fill("A note that stays separate");
  await page.getByRole("checkbox", { name: "Allow my saved words in future AI context", exact: true }).check();
  await page.getByRole("checkbox", { name: "Also allow My Note", exact: true }).check();
  await page.getByRole("button", { name: "Confirm and save", exact: true }).click();
  await page.getByRole("button", { name: "Open moment", exact: true }).click();
  await page.getByRole("button", { name: "Record details and controls", exact: true }).click();
  await page.getByRole("checkbox", { name: "Allow saved words in future AI context", exact: true }).uncheck();
  await expect(page.getByRole("checkbox", { name: "Also allow My Note", exact: true })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Also allow My Note", exact: true })).toBeDisabled();
  await expect(page.locator(".paper-original")).toHaveText("ဒီနေ့စာမေးပွဲအောင်တယ်"); await evidence(page, "updated-permissions");
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible(); await noOverflow(page); expect(errors).toEqual([]);
});

test("long journal, local day, photo framing, layers, search and cover persist", async ({ page }) => {
  await begin(page); await page.goto("/memory"); await page.getByRole("button", { name: "Add a moment", exact: true }).click();
  await expect(page.getByLabel("Moment date", { exact: true })).toHaveValue("2026-10-15");
  await page.getByRole("textbox", { name: "Moment title", exact: true }).fill("A long quiet morning");
  const words = "A little room for the rest of my life. ".repeat(100);
  await page.getByRole("textbox", { name: "My words", exact: true }).fill(words);
  await page.getByLabel("Choose photos", { exact: true }).setInputFiles(path.resolve("public/scrapbook/study.png"));
  await page.getByRole("button", { name: "Frame photo", exact: true }).click();
  await page.getByRole("button", { name: "square", exact: true }).click();
  await page.getByRole("button", { name: "Zoom photo in", exact: true }).click();
  await page.getByRole("group", { name: "Drag photo focal point", exact: true }).press("ArrowRight");
  await page.getByRole("button", { name: "Arrange", exact: true }).click();
  const object = page.getByRole("group", { name: "Photo", exact: true }); await object.scrollIntoViewIfNeeded(); const box = await object.boundingBox();
  if (box) { await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 80)); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 18, box.y + Math.min(box.height / 2, 80) + 12, { steps: 4 }); await page.mouse.up(); await expect(object).not.toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)"); }
  await object.focus();
  await page.getByRole("button", { name: "Bring to front", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".paper-original")).toHaveText(words.trim());
  await expect(page.locator(".paper-polaroid img")).toHaveCSS("object-position", "55% 50%");
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible(); await page.goto("/memory");
  await page.getByRole("searchbox", { name: "Search saved moments", exact: true }).fill("quiet morning");
  await expect(page.getByText("1 matching moments", { exact: true })).toBeVisible();
  await page.getByLabel("Jump to month", { exact: true }).fill("2026-09"); await expect(page.getByText("0 matching moments", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search and dates", exact: true }).click();
  await page.getByRole("button", { name: "Customize 2026 book", exact: true }).click();
  await page.getByLabel("Choose cover photo", { exact: true }).setInputFiles(path.resolve("public/scrapbook/coffee.png"));
  await page.getByRole("button", { name: "Zoom photo in", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible(); await page.reload();
  await expect(page.locator(".journal-cover-background")).toHaveCSS("transform", "matrix(1.1, 0, 0, 1.1, 0, 0)"); await noOverflow(page); await evidence(page, "updated-memory-cover");
});

test("direction horizon/principles version correctly and Horizon Day reflection survives reload", async ({ page }) => {
  await begin(page); await page.goto("/future-self");
  await page.getByRole("button", { name: "Edit direction", exact: true }).click();
  await page.getByLabel("Speaking from month and year", { exact: true }).fill("2037-01");
  await page.getByLabel("Your principles · one per line, up to 20", { exact: true }).fill("Curiosity\nRoom to rest");
  await page.getByRole("button", { name: "Save as new version", exact: true }).click();
  await expect(page.getByText("v2 · Current", { exact: true })).toBeVisible(); await expect(page.getByText("Curiosity", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Preview your reflection point/ }).click();
  await page.getByRole("button", { name: "I want to keep going", exact: true }).click();
  await page.getByRole("button", { name: "Keep Horizon Day reflection", exact: true }).click();
  await expect(page.getByText(/Reflection kept on this device/)).toBeVisible(); await page.reload();
  await page.getByRole("button", { name: /Preview your reflection point/ }).click();
  await expect(page.getByRole("button", { name: "I want to keep going", exact: true })).toHaveAttribute("aria-pressed", "true"); await noOverflow(page); await evidence(page, "updated-horizon");
});

test("direct decoration gestures, layer ordering and six-month revisit preserve the original", async ({ page, context }, testInfo) => {
  await begin(page); await page.goto("/memory"); await page.getByRole("button", { name: "Add a moment", exact: true }).click();
  await page.getByRole("textbox", { name: "Moment title", exact: true }).fill("The middle of the road");
  await page.getByRole("textbox", { name: "My words", exact: true }).fill("I took my time and made something small.");
  await page.getByRole("button", { name: "Arrange", exact: true }).click();
  await page.getByRole("button", { name: "Tapes", exact: true }).click();
  await page.getByRole("button", { name: "Add tape-lilac sticker", exact: true }).click();
  const sticker = page.getByRole("group", { name: "tape-lilac sticker", exact: true }); await sticker.scrollIntoViewIfNeeded();
  const box = await sticker.boundingBox(); expect(box).toBeTruthy();
  if (box && testInfo.project.name !== "desktop") {
    const session = await context.newCDPSession(page), x = box.x + box.width / 2, y = box.y + box.height / 2;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x: x - 12, y }, { id: 2, x: x + 12, y }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, x: x - 24, y: y - 12 }, { id: 2, x: x + 24, y: y + 12 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(sticker).not.toHaveAttribute("style", /rotate\(0deg\) scale\(1\)/);
  } else {
    await sticker.focus(); await sticker.press("]"); await sticker.press("+");
    await expect(sticker).toHaveAttribute("style", /rotate\(5deg\).*scale\(1.1\)/);
  }
  await page.getByRole("button", { name: "Send to back", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click(); await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.clock.setFixedTime(new Date("2027-04-16T05:00:00.000Z")); await page.reload();
  await page.getByRole("button", { name: "Open 2026 memory book", exact: true }).click();
  await expect(page.getByText("What feels clearer now than it did then?", { exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Your reflection", exact: true }).fill("Rest was part of this direction, too.");
  await page.getByRole("button", { name: "Keep reflection", exact: true }).click();
  await expect(page.locator(".paper-original")).toHaveText("I took my time and made something small.");
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible(); await noOverflow(page); await evidence(page, "updated-revisit");
});
