import { test, expect } from "@playwright/test";

test("reading routes enforce browser security headers", async ({ request }) => {
  for (const route of ["/", "/now", "/memory", "/future-self", "/login", "/signup", "/onboarding"]) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("no-referrer");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["permissions-policy"]).toContain("microphone=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  }
});

test("sign-out distinguishes this browser from unconfirmed server revocation", async ({ page }) => {
  await page.route("**/api/backend/status", route => route.fulfill({ json: { aiConfigured: false } }));
  await page.route("**/api/auth/session", route => route.fulfill({ json: { user: { email: "fictional@example.invalid" } } }));
  await page.route("**/api/context", route => route.fulfill({ json: {} }));
  await page.route("**/api/auth/logout", route => route.fulfill({ json: { signedOut: true, serverRevocationConfirmed: false } }));
  await page.goto("/memory");
  await page.getByRole("button", { name: "Space settings", exact: true }).click();
  await expect(page.getByText("Signed in as fictional@example.invalid")).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const notice = page.getByRole("alert").filter({ hasText: "Signed out on this browser." });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Server session revocation could not be confirmed.");
  await expect(page.getByRole("link", { name: "Sign in to connect", exact: true })).toBeVisible();
});

test("cross-site account mutations fail before authentication", async ({ request }) => {
  const response = await request.post("/api/auth/login", {
    headers: { origin: "https://untrusted.invalid" },
    data: {},
  });
  expect(response.status()).toBe(403);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toMatchObject({ code: "origin" });
});
