/** The user ID comes from the verified same-origin session endpoint, not a form or a cache. */
export const ACCOUNT_SCOPE_EVENT = "future-echo:session-changed";
export const ACCOUNT_SCOPE_STORAGE_EVENT = "future-echo.session-change.v1";
export const EXPECTED_ACCOUNT_HEADER = "X-Future-Echo-Account";

export function readAccountScope(value: unknown): string | null {
  if (!value || typeof value !== "object" || !("user" in value)) throw new Error("Invalid session response.");
  if (value.user === null) return null;
  if (!value.user || typeof value.user !== "object" || !("id" in value.user)
    || typeof value.user.id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value.user.id)) throw new Error("Invalid session account.");
  return value.user.id.toLowerCase();
}

export function accountStorageSuffix(account: string | null): string {
  return account ? `account-${account}` : "guest";
}

/** Broadcast only an invalidation signal; never trust it as proof of identity. */
export function notifyAccountSessionChanged() {
  window.dispatchEvent(new Event(ACCOUNT_SCOPE_EVENT));
  try { localStorage.setItem(ACCOUNT_SCOPE_STORAGE_EVENT, crypto.randomUUID()); } catch { /* Focus also rechecks the session. */ }
}
