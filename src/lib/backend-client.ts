import { EXPECTED_ACCOUNT_HEADER } from "./account-scope";
/** Same-origin cookies stay HttpOnly; no provider or Supabase secret reaches JS. */
export class BackendRequestError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
let refreshing: Promise<unknown> | undefined;
export async function backendRequest<T>(path: string, body?: unknown, method = "POST", retry = true, timeoutMs = 60000, expectedAccount?: string): Promise<T> {
  const response = await fetch(path, { method: body === undefined && method === "POST" ? "GET" : method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(expectedAccount ? { [EXPECTED_ACCOUNT_HEADER]: expectedAccount } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
  if (response.status === 401 && retry && (!path.startsWith("/api/auth/") || path === "/api/auth/session")) {
    refreshing ??= backendRequest("/api/auth/refresh", {}, "POST", false).finally(() => { refreshing = undefined; });
    await refreshing;
    return backendRequest(path, body, method, false, timeoutMs, expectedAccount);
  }
  const value = await response.json();
  if (!response.ok) throw new BackendRequestError(response.status, value.code ?? "request_failed", typeof value.error === "string" ? value.error : "This request could not be completed.");
  return value as T;
}
