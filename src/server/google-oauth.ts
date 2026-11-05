import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { ApiError, object } from "./backend-http";
import { authConfigured, type BackendConfig } from "./backend-config";

export const GOOGLE_FLOW_COOKIE = "fe-google-flow";
export function beginGoogleFlow(config: BackendConfig, destination: "/now" | "/onboarding", now = Date.now()) {
  if (!authConfigured(config)) throw new ApiError(503, "google_setup", "Configure Supabase account services and Google sign-in first.");
  const verifier = randomBytes(48).toString("base64url"), state = randomBytes(24).toString("base64url");
  const callback = new URL("/api/auth/google-callback", config.origin); callback.searchParams.set("state", state);
  const url = new URL("/auth/v1/authorize", config.supabaseUrl);
  url.searchParams.set("provider", "google"); url.searchParams.set("redirect_to", callback.href);
  url.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("scopes", "email profile");
  return { url: url.href, cookie: Buffer.from(JSON.stringify({verifier,state,destination,expires:now+600000})).toString("base64url") };
}
export function consumeGoogleFlow(cookie: string | undefined, state: string | null, code: string | null, now = Date.now()) {
  const fail = () => new ApiError(400, "google_state", "Google sign-in expired or could not be verified. Start again from the sign-in page.");
  if (!cookie || cookie.length > 2048 || !state || !/^[A-Za-z0-9_-]{32}$/.test(state) || !code || !/^[A-Za-z0-9_.-]{1,2048}$/.test(code)) throw fail();
  let flow: unknown; try { flow=JSON.parse(Buffer.from(cookie,"base64url").toString("utf8")); } catch { throw fail(); }
  if (!object(flow) || typeof flow.verifier!=="string" || !/^[A-Za-z0-9_-]{64}$/.test(flow.verifier) || typeof flow.state!=="string" || flow.state.length!==state.length || !timingSafeEqual(Buffer.from(flow.state),Buffer.from(state)) || typeof flow.expires!=="number" || !Number.isSafeInteger(flow.expires) || flow.expires<=now || flow.expires>now+600000 || !["/now","/onboarding"].includes(flow.destination as string)) throw fail();
  return { verifier:flow.verifier, destination:flow.destination as "/now"|"/onboarding", code };
}
