import { ApiError, cookieValue, object } from "./backend-http";
import { authConfigured, type BackendConfig } from "./backend-config";

export class SupabaseBackend {
  constructor(readonly config: BackendConfig, private fetcher: typeof fetch = fetch) {}
  async auth(path: string, body?: unknown, token?: string): Promise<Record<string, unknown>> {
    if (!authConfigured(this.config)) throw new ApiError(503, "setup_required", "Account services are not configured yet.");
    let response: Response;
    try { response = await this.fetcher(`${this.config.supabaseUrl}/auth/v1/${path}`, { method: body === undefined ? "GET" : "POST", headers: { apikey: this.config.supabaseKey, "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: "no-store", signal: AbortSignal.timeout(12000) }); }
    catch { throw new ApiError(503, "auth_unavailable", "Account services are temporarily unavailable."); }
    if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 401, "authentication", response.status === 429 ? "Please wait before trying again." : "Sign-in could not be verified. Check your details or sign in again.");
    if (path === "logout" && response.status === 204) return {};
    const value: unknown = await response.json(); if (!object(value)) throw new ApiError(502, "auth_response", "Account services returned an invalid response."); return value;
  }
  async user(request: Request): Promise<{ id: string; email: string }> {
    const token = cookieValue(request, "fe-access"); if (!token || !/^[A-Za-z0-9_.-]{20,8192}$/.test(token)) throw new ApiError(401, "sign_in", "Sign in to use connected AI.");
    const user = await this.auth("user", undefined, token);
    if (typeof user.id !== "string" || !/^[0-9a-f-]{36}$/i.test(user.id)) throw new ApiError(401, "sign_in", "Sign in again to continue.");
    return { id: user.id, email: typeof user.email === "string" ? user.email : "" };
  }
  async rest(path: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<unknown> {
    if (!this.config.serviceKey) throw new ApiError(503, "database_setup", "The server database is not configured yet.");
    // Modern server keys are opaque API keys, not JWT bearer tokens.
    // Legacy service_role JWTs still need their existing Authorization header.
    const headers = new Headers({ "Content-Type": "application/json", ...options.headers });
    headers.set("apikey", this.config.serviceKey);
    if (this.config.serviceKey.startsWith("sb_secret_")) headers.delete("Authorization");
    else headers.set("Authorization", `Bearer ${this.config.serviceKey}`);
    let response: Response;
    try { response = await this.fetcher(`${this.config.supabaseUrl}/rest/v1/${path}`, { method: options.method ?? "GET", headers, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }), cache: "no-store", signal: AbortSignal.timeout(12000) }); }
    catch { throw new ApiError(503, "database_unavailable", "Your account data could not be reached. Local pages have not been replaced."); }
    if (!response.ok) {
      let details = ""; try { const body = await response.json(); details = typeof body.message === "string" ? body.message : ""; } catch {}
      if (/quota|rate_limit/.test(details)) throw new ApiError(429, "usage_limit", "Your reply allowance or short-term request limit has been reached.");
      if (/direction_changed|not_active/.test(details)) throw new ApiError(409, "direction_changed", "Connect your current direction before sending another message.");
      if (/adult_required/.test(details)) throw new ApiError(403, "adult_required", "Confirm that you are 18 or older in account settings.");
      throw new ApiError(503, "database_error", "Account storage is not ready. Check the backend setup and try again.");
    }
    if (response.status === 204) return null;
    return response.json();
  }
  rpc(name: string, body: unknown) { return this.rest(`rpc/${name}`, { method: "POST", body }); }
}
