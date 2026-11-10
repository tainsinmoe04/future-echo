import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => { expect(pageErrors.get(page)).toEqual([]); });

async function settings(page: Page) {
  const response = await page.goto("/memory");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Future Echo");
  await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
}
async function backup(page: Page) {
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup", exact: true }).click();
  const download = await waiting, file = await download.path();
  if (!file) throw new Error("No local test download was created");
  return JSON.parse(await readFile(file, "utf8"));
}
async function evidence(page: Page, name: string) {
  if (process.env.ECHO_QA_DIR) await page.screenshot({ path: path.join(process.env.ECHO_QA_DIR, `${name}-${test.info().project.name}.png`) });
}

test("settings section navigation is keyboard accessible and preferences remain saved", async ({ page }) => {
  await settings(page);
  await page.getByRole("link", { name: "Your data", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#settings-data")).toBeFocused();
  await page.getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(page.locator("#settings-appearance")).toBeFocused();
  await page.getByRole("radio", { name: "Larger", exact: true }).check();
  await expect(page.locator("[data-echo-reading]")).toHaveAttribute("data-echo-reading", "large");
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Larger", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Back to Your Space", exact: true }).click();
  await expect(page.getByRole("button", { name: "Space settings", exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("invalid and larger valid backups require review; recovery is independently removable", async ({ page }) => {
  await settings(page);
  const original = await backup(page);
  await page.getByLabel("Import journal backup", { exact: true }).setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("{broken") });
  await expect(page.getByRole("alert").filter({ hasText: "This file is not valid JSON." })).toBeVisible();
  expect((await backup(page)).snapshot).toEqual(original.snapshot);
  const larger = structuredClone(original);
  larger.snapshot.preferences.readingSize = "large";
  // A sizeable valid setup draft is NOT smuggled through an ordinary export.
  // Use 300 explicitly authored fixture pages, never the owner's browser records.
  larger.snapshot.identityVersions = [{ id: "qa-direction", journeyId: "qa-journey", version: 1, status: "active", definition: "Make room for curiosity", horizon: { targetMonth: "2036-10", label: "October 2036" }, principles: [], createdAt: "2026-10-16T00:00:00.000Z" }];
  larger.snapshot.moments = Array.from({ length: 300 }, (_, i) => ({ id: `qa-page-${i}`, identityVersionId: "qa-direction", kind: "personal", title: `Quiet page ${i}`, originalExcerpt: "ဒီနေ့ဖြည်းဖြည်းချင်းလျှောက်ခဲ့တယ်။ ".repeat(100), occurredAt: "2026-10-16T00:00:00.000Z", calendarDate: "2026-10-16", revisitAt: "2027-04-16T00:00:00.000Z", consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: "2026-10-16T00:00:00.000Z" } }));
  const file = { name: "larger.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(larger)) };
  await page.getByLabel("Import journal backup", { exact: true }).setInputFiles(file);
  await expect(page.getByRole("group", { name: "Restore preview", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Standard", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Cancel restore", exact: true }).click();
  expect((await backup(page)).snapshot).toEqual(original.snapshot);
  await page.getByLabel("Import journal backup", { exact: true }).setInputFiles(file);
  await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
  await expect(page.getByText("Journal restored. Your previous journal is available below.", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Larger", exact: true })).toBeChecked();
  expect((await backup(page)).snapshot.moments).toHaveLength(300);
  await page.getByText("Previous journal recovery copy", { exact: true }).click();
  await page.getByRole("button", { name: "Preview recovery", exact: true }).click();
  await page.getByRole("button", { name: "Replace with this backup", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Standard", exact: true })).toBeChecked();
  expect((await backup(page)).snapshot).toEqual(original.snapshot);
  await page.getByRole("button", { name: "Delete recovery copy", exact: true }).click();
  await page.getByRole("button", { name: "Keep recovery", exact: true }).click();
  await expect(page.getByText("Previous journal recovery copy", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete recovery copy", exact: true }).click();
  await page.getByRole("button", { name: "Confirm delete recovery", exact: true }).click();
  await expect(page.getByText("Recovery copy deleted.", { exact: true })).toBeVisible();
  await evidence(page, "resilience-recovery");
  await page.reload(); await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await expect(page.getByText("Previous journal recovery copy", { exact: true })).toHaveCount(0);
  expect((await backup(page)).snapshot).toEqual(original.snapshot);
});

test("quota failure keeps unsaved work exportable and retries only after storage recovers", async ({ page }) => {
  await settings(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (sessionStorage.getItem("qa-quota") === "full") throw new DOMException("Storage quota exceeded (test fixture)", "QuotaExceededError");
      return original.apply(this, args);
    };
    sessionStorage.setItem("qa-quota", "full");
  });
  await page.getByRole("radio", { name: "Larger", exact: true }).check();
  await expect(page.getByText("Not saved — keep this tab open", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); dispatchEvent(event); return event.defaultPrevented; })).toBe(true);
  expect((await backup(page)).snapshot.preferences.readingSize).toBe("large");
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.getByText("Not saved — keep this tab open", { exact: true })).toBeVisible();
  await evidence(page, "resilience-quota");
  await page.evaluate(() => sessionStorage.removeItem("qa-quota"));
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => { const event = new Event("beforeunload", { cancelable: true }); dispatchEvent(event); return event.defaultPrevented; })).toBe(false);
  await page.reload(); await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Larger", exact: true })).toBeChecked();
});

test("two tabs never overwrite each other and the stale tab can export its changes", async ({ page, context }) => {
  await settings(page);
  const other = await context.newPage(); await settings(other);
  await page.getByRole("radio", { name: "Larger", exact: true }).check();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await other.getByRole("radio", { name: "Reduce motion", exact: true }).check();
  await expect(other.getByText("Not saved — keep this tab open", { exact: true })).toBeVisible();
  await expect(other.getByRole("alert").filter({ hasText: "Another tab saved a newer journal" })).toBeVisible();
  const unsaved = await backup(other);
  expect(unsaved.snapshot.preferences.motion).toBe("reduced");
  expect(unsaved.snapshot.preferences.readingSize).toBe("regular");
  await other.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(other.getByText("Not saved — keep this tab open", { exact: true })).toBeVisible();
  await evidence(other, "resilience-conflict");
  await page.reload(); await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Larger", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Follow device", exact: true })).toBeChecked();
  await other.close();
});

test("keyboard opens settings and navigates controls with meaningful accessible names", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/memory");
  const opener = page.getByRole("button", { name: "Space settings", exact: true });
  await opener.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Back to Your Space", exact: true })).toBeFocused();
  const standard = page.getByRole("radio", { name: "Standard", exact: true });
  await standard.focus(); await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Larger", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Back to Your Space", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your Space", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Space settings", exact: true })).toBeFocused();
  await page.getByRole("searchbox", { name: "Search saved moments", exact: true }).focus();
  await page.keyboard.type("nothing matches");
  await expect(page.getByRole("status").filter({ hasText: "0 matching moments" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("unsupported stored documents block hydration and are never replaced with an empty journal", async ({ page }) => {
  await settings(page);
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("future-echo-journal-v1", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction("documents", "readwrite");
        tx.objectStore("documents").put({ format: "future-echo-local", version: 999, revision: 50, savedAt: "2026-10-16T00:00:00.000Z", value: { marker: "preserve-this-unsupported-record" } }, "journal");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  });
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "original record has been left untouched" })).toBeVisible();
  await expect(page.getByText("Your existing local journal has not been replaced.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry opening journal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Space settings", exact: true })).toHaveCount(0);
  const stored = await page.evaluate(async () => new Promise<unknown>((resolve, reject) => {
    const request = indexedDB.open("future-echo-journal-v1", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction("documents", "readonly"), read = tx.objectStore("documents").get("journal");
      let record: unknown; read.onsuccess = () => { record = read.result; };
      tx.oncomplete = () => { db.close(); resolve(record); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
  expect(stored).toMatchObject({ version: 999, revision: 50, value: { marker: "preserve-this-unsupported-record" } });
  await evidence(page, "resilience-unsupported");
});
