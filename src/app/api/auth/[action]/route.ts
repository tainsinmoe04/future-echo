import { NextResponse } from "next/server";
import { authConfigured, backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, cookieValue, exact, object, readJson, requireOrigin } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
type Params = { params: Promise<{ action: string }> };
function sessionResponse(value: Record<string, unknown>, secure: boolean) {
  if (typeof value.access_token !== "string" || typeof value.refresh_token !== "string") return apiJson({ requiresConfirmation: true, message: "Check your email to confirm your account, then sign in." });
  const response = NextResponse.json({ signedIn: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("fe-access", value.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: typeof value.expires_in === "number" ? Math.min(value.expires_in, 86400) : 3600 });
  response.cookies.set("fe-refresh", value.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/api/auth", maxAge: 60 * 60 * 24 * 30 }); return response;
}
export async function GET(request: Request, { params }: Params) {
  try { if ((await params).action !== "session") throw new ApiError(404, "not_found", "Unknown account action."); const config = backendConfig(); if (!authConfigured(config) || (!cookieValue(request, "fe-access") && !cookieValue(request, "fe-refresh"))) return apiJson({ user: null });
    const db = new SupabaseBackend(config), user = await db.user(request); return apiJson({ user });
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request, { params }: Params) {
  try {
    const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), action = (await params).action;
    if (action === "logout") { const token = cookieValue(request, "fe-access"); if (token && authConfigured(config)) await db.auth("logout", {}, token).catch(() => {}); const result = NextResponse.json({ signedOut: true }, { headers: { "Cache-Control": "no-store" } }); result.cookies.set("fe-access", "", { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" }); result.cookies.set("fe-refresh", "", { maxAge: 0, path: "/api/auth", httpOnly: true, sameSite: "lax" }); return result; }
    if (action === "refresh") { const token = cookieValue(request, "fe-refresh"); if (!token) throw new ApiError(401, "sign_in", "Sign in again to continue."); return sessionResponse(await db.auth("token?grant_type=refresh_token", { refresh_token: token }), new URL(config.origin).protocol === "https:"); }
    if (!["login", "signup"].includes(action)) throw new ApiError(404, "not_found", "Unknown account action.");
    const input = await readJson(request, 4096);
    if (!object(input) || !exact(input, ["email", "password", "name", "adultConfirmed"]) || typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254 || typeof input.password !== "string" || input.password.length < 8 || input.password.length > 256 || input.adultConfirmed !== true || (input.name !== undefined && (typeof input.name !== "string" || input.name.length > 120))) throw new ApiError(400, "account_input", "Enter a valid email and password (at least 8 characters), and confirm you are 18 or older.");
    const value = await db.auth(action === "login" ? "token?grant_type=password" : "signup", { email: input.email.trim(), password: input.password, ...(action === "signup" ? { data: { display_name: input.name ?? "", adult_confirmed: true } } : {}) });
    if (object(value.user) && typeof value.user.id === "string" && config.serviceKey) await db.rpc("fe_attest_adult", { p_user: value.user.id });
    return sessionResponse(value, new URL(config.origin).protocol === "https:");
  } catch (error) { return apiFailure(error); }
}
