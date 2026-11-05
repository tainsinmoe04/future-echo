import { NextResponse } from "next/server";
import { authConfigured, backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, cookieValue, exact, object, readJson, requireOrigin } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
import { logoutOutcome, parseAuthSession } from "@/server/auth-session";
import { beginGoogleFlow, consumeGoogleFlow, GOOGLE_FLOW_COOKIE } from "@/server/google-oauth";
type Params = { params: Promise<{ action: string }> };
function sessionResponse(value: Record<string, unknown>, secure: boolean, allowConfirmation = false) {
  const session = parseAuthSession(value, allowConfirmation);
  if (!session) return NextResponse.json({ requiresConfirmation: true, message: "Check your email to confirm your account, then sign in." }, { headers: { "Cache-Control": "no-store" } });
  const response = NextResponse.json({ signedIn: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("fe-access", session.accessToken, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: session.accessMaxAge });
  response.cookies.set("fe-refresh", session.refreshToken, { httpOnly: true, secure, sameSite: "lax", path: "/api/auth", maxAge: 60 * 60 * 24 * 30 }); return response;
}
export async function GET(request: Request, { params }: Params) {
  const action = (await params).action;
  if (action === "google-callback") {
    const config = backendConfig();
    try {
      if (process.env.FUTURE_ECHO_GOOGLE_AUTH !== "true" || !authConfigured(config) || new URL(request.url).origin !== config.origin) throw new ApiError(503,"google_setup","Google sign-in is not configured yet.");
      const query = new URL(request.url).searchParams;
      if (query.has("error") || query.getAll("code").length!==1 || query.getAll("state").length!==1) throw new ApiError(400,"google_state","Google sign-in was not completed.");
      const flow = consumeGoogleFlow(cookieValue(request,GOOGLE_FLOW_COOKIE),query.get("state"),query.get("code"));
      const db = new SupabaseBackend(config), value = await db.auth("token?grant_type=pkce",{auth_code:flow.code,code_verifier:flow.verifier});
      const session = parseAuthSession(value); if (!session) throw new ApiError(502,"auth_response","Sign-in could not be verified.");
      const verified = await db.user(new Request(config.origin,{headers:{cookie:`fe-access=${session.accessToken}`}}));
      if (config.serviceKey) await db.rpc("fe_attest_adult",{p_user:verified.id});
      const result = NextResponse.redirect(new URL(flow.destination,config.origin),303), cookies = sessionResponse(value,new URL(config.origin).protocol==="https:");
      for (const cookie of cookies.cookies.getAll()) result.cookies.set(cookie);
      result.headers.set("Cache-Control","no-store"); result.headers.set("Referrer-Policy","no-referrer");
      result.cookies.set(GOOGLE_FLOW_COOKIE,"",{maxAge:0,path:"/api/auth",httpOnly:true,sameSite:"lax",secure:new URL(config.origin).protocol==="https:"}); return result;
    } catch {
      if (!config.origin) return apiFailure(new ApiError(503,"google_setup","Configure the application origin before signing in."));
      const result=NextResponse.redirect(new URL("/login?google=failed",config.origin),303); result.headers.set("Cache-Control","no-store");
      result.cookies.set(GOOGLE_FLOW_COOKIE,"",{maxAge:0,path:"/api/auth",httpOnly:true,sameSite:"lax",secure:new URL(config.origin).protocol==="https:"}); return result;
    }
  }
  try { if (action !== "session") throw new ApiError(404, "not_found", "Unknown account action."); const config = backendConfig(); if (!authConfigured(config) || (!cookieValue(request, "fe-access") && !cookieValue(request, "fe-refresh"))) return apiJson({ user: null });
    const db = new SupabaseBackend(config), user = await db.user(request); return apiJson({ user });
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request, { params }: Params) {
  try {
    const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), action = (await params).action;
    if (action === "attest-adult") {
      const input = await readJson(request,512);
      if (!object(input) || !exact(input,["adultConfirmed"]) || input.adultConfirmed!==true) throw new ApiError(400,"adult_required","Confirm you are 18 or older before connecting live AI.");
      const user=await db.user(request); await db.rpc("fe_attest_adult",{p_user:user.id}); return apiJson({confirmed:true});
    }
    if (action === "google") {
      if (process.env.FUTURE_ECHO_GOOGLE_AUTH !== "true") throw new ApiError(503,"google_setup","Google sign-in needs provider setup. Email login or the device-only journal remain available.");
      const input = await readJson(request,1024);
      if (!object(input) || !exact(input,["adultConfirmed","signup"]) || input.adultConfirmed!==true || typeof input.signup!=="boolean") throw new ApiError(400,"adult_required","Confirm you are 18 or older before continuing.");
      const flow=beginGoogleFlow(config,input.signup?"/onboarding":"/now");
      const result=NextResponse.json({url:flow.url},{headers:{"Cache-Control":"no-store"}});
      result.cookies.set(GOOGLE_FLOW_COOKIE,flow.cookie,{httpOnly:true,secure:new URL(config.origin).protocol==="https:",sameSite:"lax",path:"/api/auth",maxAge:600}); return result;
    }
    if (action === "logout") { const token = cookieValue(request, "fe-access"); const outcome = await logoutOutcome(token && authConfigured(config) ? () => db.auth("logout", {}, token) : undefined); const result = NextResponse.json(outcome, { headers: { "Cache-Control": "no-store" } }); result.cookies.set("fe-access", "", { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" }); result.cookies.set("fe-refresh", "", { maxAge: 0, path: "/api/auth", httpOnly: true, sameSite: "lax" }); return result; }
    if (action === "refresh") { const token = cookieValue(request, "fe-refresh"); if (!token) throw new ApiError(401, "sign_in", "Sign in again to continue."); return sessionResponse(await db.auth("token?grant_type=refresh_token", { refresh_token: token }), new URL(config.origin).protocol === "https:"); }
    if (!["login", "signup"].includes(action)) throw new ApiError(404, "not_found", "Unknown account action.");
    const input = await readJson(request, 4096);
    if (!object(input) || !exact(input, ["email", "password", "name", "adultConfirmed"]) || typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254 || typeof input.password !== "string" || input.password.length < 8 || input.password.length > 256 || input.adultConfirmed !== true || (input.name !== undefined && (typeof input.name !== "string" || input.name.length > 120))) throw new ApiError(400, "account_input", "Enter a valid email and password (at least 8 characters), and confirm you are 18 or older.");
    const value = await db.auth(action === "login" ? "token?grant_type=password" : "signup", { email: input.email.trim(), password: input.password, ...(action === "signup" ? { data: { display_name: input.name ?? "", adult_confirmed: true } } : {}) });
    if (object(value.user) && typeof value.user.id === "string" && config.serviceKey) await db.rpc("fe_attest_adult", { p_user: value.user.id });
    return sessionResponse(value, new URL(config.origin).protocol === "https:", action === "signup");
  } catch (error) { return apiFailure(error); }
}
