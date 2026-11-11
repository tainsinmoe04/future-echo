import { test, expect, type Page } from "@playwright/test";

const a = "aaaaaaaa-1111-4111-8111-111111111111";
const b = "bbbbbbbb-1111-4111-8111-111111111111";
const ownerA = "Private page for account A";
const ownerB = "Private page for account B";
const switchEvent = "future-echo:session-changed";

async function makePage(page: Page, words: string) {
  await page.goto("/onboarding");
  await page.getByLabel("One possible version of me is…").fill("Someone who makes things carefully");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: "I am 18 or older.", exact: true }).check();
  await page.getByRole("button", { name: /^Meet your Future Self/ }).click();
  await page.waitForURL("**/now");
  await page.goto("/memory");
  await page.getByRole("button", { name: "Add a moment", exact: true }).click();
  await page.getByRole("textbox", { name: "Moment title", exact: true }).fill(words);
  await page.getByRole("textbox", { name: "My words", exact: true }).fill(words);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("Saved on this device", { exact: true })).toBeVisible();
  await expect(page.locator(".paper-original")).toHaveText(words);
}

test("verified A → sign out → B → A scopes journals and locks on session failure", async ({ page }) => {
  let owner: string | null = a;
  let offline = false;
  await page.route("**/api/auth/session", route => route.fulfill(offline ? { status: 503, json: { error: "Session unavailable" } } : { json: { user: owner ? { id: owner, email: "account@example.invalid" } : null } }));
  await page.route("**/api/backend/status", route => route.fulfill({ json: { aiConfigured: false } }));
  await page.route("**/api/context", route => route.fulfill({ json: { cleared: true } }));
  await page.route("**/api/auth/logout", route => { owner = null; return route.fulfill({ json: { serverRevocationConfirmed: true } }); });

  await makePage(page, ownerA);
  await page.goto("/memory");
  await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await page.getByRole("button", { name: /^Your account/ }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("Your first page can be anything.", { exact: true })).toBeVisible();
  await expect(page.getByText(ownerA, { exact: true })).toHaveCount(0);

  owner = b;
  await page.evaluate(event => dispatchEvent(new Event(event)), switchEvent);
  await expect(page.getByText("Your first page can be anything.", { exact: true })).toBeVisible();
  await makePage(page, ownerB);
  owner = a;
  await page.evaluate(event => dispatchEvent(new Event(event)), switchEvent);
  await expect(page.getByText(ownerB, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Open book", exact: true }).click();
  await expect(page.locator(".paper-original")).toHaveText(ownerA);

  offline = true;
  await page.evaluate(event => dispatchEvent(new Event(event)), switchEvent);
  await expect(page.getByRole("alert").filter({ hasText: "Local journals remain locked" })).toBeVisible();
  await expect(page.getByText(ownerA, { exact: true })).toHaveCount(0);
  offline = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByRole("button", { name: "Open book", exact: true }).click();
  await expect(page.locator(".paper-original")).toHaveText(ownerA);
});

test("successful Google return invalidates a previously open account tab", async ({ page, context }) => {
  let owner = a;
  await context.route("**/api/auth/session", route => route.fulfill({ json: { user: { id: owner, email: "account@example.invalid" } } }));
  await makePage(page, ownerA);
  await page.goto("/memory");
  await page.getByRole("button", { name: "Open book", exact: true }).click();
  await expect(page.locator(".paper-original")).toHaveText(ownerA);

  // Exercise the browser return/invalidation without authenticating a real account.
  const returned = await context.newPage();
  owner = b;
  await returned.goto("/now?google=success");
  await expect(returned).toHaveURL(/\/now$/);
  await expect(page.getByText(ownerA, { exact: true })).toHaveCount(0);
  await expect(page.getByText("Your first page can be anything.", { exact: true })).toBeVisible();
});
