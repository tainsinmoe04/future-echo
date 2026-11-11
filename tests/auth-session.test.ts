import assert from "node:assert/strict";
import test from "node:test";
import { logoutOutcome, parseAuthSession } from "../src/server/auth-session";
import { ApiError } from "../src/server/backend-http";
import { SupabaseBackend } from "../src/server/supabase-backend";
import { backendConfig } from "../src/server/backend-config";

const valid = { access_token: "header.payload.signature", refresh_token: "refresh-token-123", expires_in: 3600 };
const invalid = (error: unknown) => error instanceof ApiError && error.status === 502 && error.code === "auth_response";

test("session cookies accept bounded token shapes and cap positive expiry", () => {
  assert.deepEqual(parseAuthSession(valid), { accessToken: valid.access_token, refreshToken: valid.refresh_token, accessMaxAge: 3600 });
  assert.equal(parseAuthSession({ ...valid, expires_in: 999999 })?.accessMaxAge, 86400);
  assert.equal(parseAuthSession({ ...valid, expires_in: undefined })?.accessMaxAge, 3600);
});

test("only successful logout accepts a bodyless upstream 204 response", async () => {
  const backend = new SupabaseBackend(backendConfig({
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "fictional-public-key",
  }), async () => new Response(null, { status: 204 }));
  assert.deepEqual(await backend.auth("logout", {}, "fictional-token"), {});
  assert.deepEqual(await logoutOutcome(() => backend.auth("logout", {}, "fictional-token")), { signedOut: true, serverRevocationConfirmed: true });
  await assert.rejects(backend.auth("token?grant_type=refresh_token", { refresh_token: "fictional-token" }));
});

test("malformed auth sessions cannot create cookies or pretend email confirmation", () => {
  for (const patch of [
    { access_token: "" }, { access_token: "not-a-jwt" }, { access_token: "a".repeat(3801) },
    { refresh_token: "" }, { refresh_token: "unsafe; injected=yes" }, { refresh_token: "a".repeat(2049) },
    { expires_in: -1 }, { expires_in: 0 }, { expires_in: NaN }, { expires_in: Infinity }, { expires_in: 1.5 }, { expires_in: "3600" }, { expires_in: null },
  ]) assert.throws(() => parseAuthSession({ ...valid, ...patch }), invalid);
  assert.throws(() => parseAuthSession({}), invalid);
  assert.throws(() => parseAuthSession({}, true), invalid);
  const pending = { user: { id: "11111111-1111-4111-8111-111111111111" } };
  assert.equal(parseAuthSession(pending, true), undefined);
  assert.throws(() => parseAuthSession(pending), invalid);
  assert.throws(() => parseAuthSession({ ...pending, access_token: "" }, true), invalid);
});

test("REST signup bare User means pending confirmation, never a login session", () => {
  const user={id:"11111111-1111-4111-8111-111111111111",aud:"authenticated",email:"fictional@example.invalid",email_confirmed_at:null};
  assert.equal(parseAuthSession(user,true),undefined);
  assert.equal(parseAuthSession({user,access_token:null,refresh_token:null},true),undefined);
  assert.throws(()=>parseAuthSession(user),invalid);
  assert.throws(()=>parseAuthSession({id:user.id},true),invalid);
  assert.throws(()=>parseAuthSession({...user,access_token:""},true),invalid);
  assert.throws(()=>parseAuthSession({...user,access_token:valid.access_token},true),invalid);
  assert.throws(()=>parseAuthSession({...user,refresh_token:valid.refresh_token},true),invalid);
});

test("logout distinguishes local removal from confirmed upstream revocation without raw errors", async () => {
  assert.deepEqual(await logoutOutcome(async () => ({})), { signedOut: true, serverRevocationConfirmed: true });
  for (const outcome of [
    await logoutOutcome(),
    await logoutOutcome(async () => { throw new Error("private backend failure"); }),
  ]) {
    assert.equal(outcome.signedOut, true);
    assert.equal(outcome.serverRevocationConfirmed, false);
    assert.equal(outcome.message, "Signed out on this browser. Server session revocation could not be confirmed.");
    assert.equal(JSON.stringify(outcome).includes("private backend failure"), false);
  }
});

test("email signup maps known service failures without disclosing account existence or upstream text", async () => {
  const config = backendConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "fictional-public-key" });
  for (const [errorCode, status, expectedStatus, expectedCode] of [
    ["email_address_not_authorized", 403, 503, "email_signup_unavailable"],
    ["over_email_send_rate_limit", 429, 429, "confirmation_rate_limit"],
    ["unexpected_failure", 500, 503, "auth_unavailable"],
    ["email_exists", 422, 401, "authentication"],
  ] as const) {
    const db = new SupabaseBackend(config, async () => Response.json({ error_code: errorCode, msg: "private upstream detail" }, { status }));
    await assert.rejects(db.auth("signup", {}), (error) => error instanceof ApiError && error.status === expectedStatus && error.code === expectedCode && !error.message.includes("private upstream detail"));
  }
});
