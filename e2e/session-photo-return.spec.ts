import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function setup(page: Page) {
  await page.goto("/onboarding");
  await page.getByLabel("One possible version of me is…").fill("A thoughtful maker with a small studio");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I am 18 or older.", exact: true }).check();
  await page.getByRole("button", { name: /^(Meet your Future Self|Continue on this device without AI)$/ }).click();
  await page.getByRole("button", { name: "Add a personal moment", exact: true }).click();
  await page.getByRole("textbox", { name: "My words", exact: true }).fill("A fictional page for image testing.");
}

test("returning to paste during setup remains editable while one session check is pending", async ({ page }) => {
  let release: (() => void) | undefined;
  let hold = false, requests = 0, fail = false;
  await page.route("**/api/auth/session", async route => {
    requests++;
    if (hold) await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill(fail ? { status: 503, json: { error: "Unavailable" } } : { json: { user: null } });
  });
  await page.goto("/onboarding");
  const definition = page.getByLabel("One possible version of me is…");
  await definition.fill("ကိုယ်ပိုင်စတူဒီယိုလေး ဖွင့်ချင်တယ်။");
  await definition.focus();
  hold = true;
  const before = requests;
  await page.evaluate(() => { dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); dispatchEvent(new Event("pageshow")); });
  await expect.poll(() => Boolean(release)).toBe(true);
  await expect(definition).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Checking your session" })).toHaveCount(0);
  await page.keyboard.insertText(" ကိုယ့်စိတ်ကူးတွေကို ယုံကြည်ချင်တယ်။");
  await expect(definition).toHaveValue(/ကိုယ့်စိတ်ကူးတွေ/);
  expect(requests - before).toBe(1);
  hold = false;
  const response = page.waitForResponse("**/api/auth/session"); release!(); await response;
  await expect(definition).toBeFocused();
  await page.getByLabel("Why does this direction matter to you?").fill("ပုံဆွဲရတာကို ချစ်လို့ပါ။");
  await page.getByLabel("What do you want to hold on to?").fill("ဖန်တီးရတဲ့ ပျော်ရွှင်မှု။");
  await page.reload();
  await expect(definition).toHaveValue(/ကိုယ့်စိတ်ကူးတွေ/);
  await expect(page.getByLabel("Why does this direction matter to you?")).toHaveValue("ပုံဆွဲရတာကို ချစ်လို့ပါ။");
  fail = true;
  await page.evaluate(() => dispatchEvent(new Event("focus")));
  await expect(page.getByRole("alert").filter({ hasText: "Local journals remain locked" })).toBeVisible();
  await expect(definition).toHaveCount(0);
});

test("cover photos above 5 MiB resize locally and survive picker return, save and reload", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await setup(page);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("button", { name: "Back to Your Space", exact: true }).click();
  await page.getByRole("button", { name: /Customize \d{4} book/ }).click();
  // Real noisy PNG, no padded header or mocked decoder. Landscape dimensions
  // also exceed the output size so both compression and resizing are exercised.
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 2400; canvas.height = 1600;
    const context = canvas.getContext("2d")!, pixels = context.createImageData(canvas.width, canvas.height);
    let seed = 12345;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      pixels.data[i] = seed & 255; pixels.data[i + 1] = (seed >>> 8) & 255; pixels.data[i + 2] = (seed >>> 16) & 255; pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    context.clearRect(0, 0, 40, 40);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const buffer = Buffer.from(data, "base64"); expect(buffer.length).toBeGreaterThan(5 * 1024 * 1024);
  const chooser = page.waitForEvent("filechooser");
  await page.locator("button").filter({ hasText: /^Choose cover photo$/ }).click();
  await (await chooser).setFiles({ name: "large-collage.png", mimeType: "image/png", buffer });
  await page.evaluate(() => dispatchEvent(new Event("focus")));
  await expect(page.getByRole("status").filter({ hasText: "Checking your session" })).toHaveCount(0);
  const cover = page.locator(".journal-book-designer > .journal-cover");
  const photo = cover.locator(".journal-cover-background");
  await expect(photo).toBeVisible();
  const result = await photo.evaluate(async el => {
    const img = el as HTMLImageElement; await img.decode();
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!; ctx.drawImage(img, 0, 0);
    return { width: img.naturalWidth, height: img.naturalHeight, alpha: ctx.getImageData(0, 0, 1, 1).data[3], size: atob(img.src.split(",")[1]).length };
  });
  expect(result.width).toBe(2048); expect(result.height).toBe(1365);
  expect(result.alpha).toBe(0); expect(result.size).toBeLessThan(3 * 1024 * 1024);
  const stored = await photo.getAttribute("src");
  // A rejected file keeps the existing cover and leaves its controls usable.
  await page.getByLabel("Choose cover photo", { exact: true }).setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await expect(page.getByRole("alert").filter({ hasText: /header/ })).toBeVisible();
  await expect(photo).toHaveAttribute("src", stored!);
  if (process.env.ECHO_QA_DIR) await page.screenshot({ path: path.join(process.env.ECHO_QA_DIR, `large-cover-${test.info().project.name}.png`) });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Open Your Space", exact: true }).click();
  await expect(page.locator(".journal-open-cover .journal-cover-background")).toHaveAttribute("src", stored!);
  expect(errors).toEqual([]);
});
