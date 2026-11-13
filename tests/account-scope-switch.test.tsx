// Before the fixture: fake-indexeddb installs onto `window` when one exists,
// while journal-storage reads the bare `indexedDB` global.
import "fake-indexeddb/auto";
import "./fixtures/component-env";
import { mockModule } from "./fixtures/component-env";
import test from "node:test";
import assert from "node:assert/strict";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { useEffect } from "react";
import { notifyAccountSessionChanged } from "@/lib/account-scope";

// The gate only runs on product routes; next/navigation and next/font are
// replaced for this process so the real provider tree can mount under node:test.
mockModule("next/navigation", {
  usePathname: () => "/now",
  useRouter: () => ({ push() {}, replace() {}, prefetch() {} }),
});
mockModule("@/app/myanmar-fonts", { myanmarVariables: "" });

test("switching the signed-in account remounts the product under the new scope", async (t) => {
  t.after(cleanup);
  const originalFetch = globalThis.fetch;
  let sessionAccount: string | null = "11111111-1111-4111-8111-111111111111";
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).endsWith("/api/auth/session"))
      return Response.json({ user: sessionAccount ? { id: sessionAccount } : null });
    return Response.json({ error: "unexpected test request" }, { status: 404 });
  }) as typeof fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  const { MockProductStateProvider, useMockProductState } = await import("@/components/mock-product-state");
  let mounts = 0;
  function Probe() {
    const { account } = useMockProductState();
    useEffect(() => { mounts += 1; }, []);
    return <div data-testid="probe" data-account={account ?? "signed-out"} />;
  }

  mounts = 0;
  render(<MockProductStateProvider><Probe /></MockProductStateProvider>);
  assert.match(screen.getByRole("status").textContent ?? "", /Checking your session/, "verification locks first");

  const first = await screen.findByTestId("probe", {}, { timeout: 5000 });
  assert.equal(first.getAttribute("data-account"), "11111111-1111-4111-8111-111111111111");
  assert.equal(mounts, 1, "one mount for the first account");

  sessionAccount = "22222222-2222-4222-8222-222222222222";
  act(() => { notifyAccountSessionChanged(); });

  await waitFor(() => {
    assert.equal(screen.getByTestId("probe").getAttribute("data-account"), "22222222-2222-4222-8222-222222222222");
  }, { timeout: 5000 });
  assert.equal(mounts, 2, "the account key remounts state for the new scope only");
});
