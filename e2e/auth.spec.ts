import { test, expect } from "@playwright/test";

test("Google requires adult confirmation and reports missing setup without pretending sign-in",async({page})=>{
 let calls=0;
 await page.route("**/api/auth/google",route=>{calls++;return route.fulfill({status:503,json:{code:"google_setup",error:"Google sign-in needs provider setup."}});});
 await page.goto("/login");
 await page.getByRole("button",{name:"Continue with Google",exact:true}).click();expect(calls).toBe(0);
 await page.getByRole("checkbox",{name:/I am 18 or older/}).check();
 await page.getByRole("button",{name:"Continue with Google",exact:true}).click();
 await expect(page.getByRole("alert").filter({hasText:"Google sign-in needs provider setup."})).toBeVisible();expect(calls).toBe(1);
 await expect(page).toHaveURL(/\/login$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test("login has accessible controls, native validation and truthful errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  let calls = 0;
  await page.route("**/api/auth/login", route => { calls++; return route.fulfill({ status: 401, json: { code: "authentication", error: "Sign-in could not be verified. Check your details or sign in again." } }); });
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  await expect(page).toHaveTitle("Future Echo");
  const email = page.getByRole("textbox", { name: "Email", exact: true });
  const password = page.getByLabel("Password", { exact: true });
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  expect(calls).toBe(0);
  await email.fill("fictional@example.invalid");
  await password.fill("fictional-password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  expect(calls).toBe(0); // Adult self-attestation remains mandatory.
  await page.getByRole("checkbox", { name: /I am 18 or older/ }).check();
  await password.press("Enter");
  const notice = page.getByRole("alert").filter({ hasText: "Sign-in could not be verified." });
  await expect(notice).toBeVisible();
  await expect(notice).toBeFocused();
  expect(calls).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await email.evaluate(node => getComputedStyle(node).fontSize)).toBe("16px");
  const toggle = await page.getByRole("button", { name: "Show password" }).boundingBox();
  expect(toggle?.width).toBeGreaterThanOrEqual(44);
  expect(toggle?.height).toBeGreaterThanOrEqual(44);
  expect(errors).toEqual([]);
});

test("signup preserves confirmation messaging without pretending to sign in", async ({ page }) => {
  await page.route("**/api/auth/signup", route => route.fulfill({ json: { requiresConfirmation: true, message: "Check your email to confirm your account, then sign in." } }));
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: false }).fill("Fictional reader");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("fictional@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("fictional-password");
  await page.getByRole("checkbox", { name: /I am 18 or older/ }).check();
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Check your email to confirm your account, then sign in.");
  await expect(page).toHaveURL(/\/signup$/);
  await page.getByText("About account access", { exact: true }).click();
  await expect(page.getByText(/Password recovery is not available/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("successful login navigates without sending journal context and suppresses repeat submission", async ({ page }) => {
  let calls = 0, contextCalls = 0;
  let finish: () => void = () => {};
  const pending = new Promise<void>(resolve => { finish = resolve; });
  await page.route("**/api/context", route => { contextCalls++; return route.abort(); });
  await page.route("**/api/auth/login", async route => { calls++; await pending; await route.fulfill({ json: { signedIn: true } }); });
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("fictional@example.invalid");
  const password = page.getByLabel("Password", { exact: true });
  await password.fill("fictional-password");
  await page.getByRole("checkbox", { name: /I am 18 or older/ }).check();
  await password.press("Enter");
  await expect(page.getByRole("button", { name: "Signing in…" })).toBeDisabled();
  await page.getByRole("form", { name: "Log in", exact: true }).dispatchEvent("submit");
  finish();
  await expect(page).toHaveURL(/\/now$/);
  expect(calls).toBe(1);
  expect(contextCalls).toBe(0);
});
