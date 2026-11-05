import assert from "node:assert/strict";
import test from "node:test";
import { backendConfig, aiConfigured } from "../src/server/backend-config";
import { ApiError, readJson, requireOrigin } from "../src/server/backend-http";
import { isFutureReply, isPlaylist, isSavedPlaylist, requestsMusic, songSearchUrl } from "../src/lib/playlist";
import { contextSyncPayload, isContextSync } from "../src/server/context-sync";
import { activeIdentityVersion } from "../src/lib/mock-data";
import { sampleMoments } from "../src/lib/mock-messenger";
import { createReply, parseChatInput, messageFromRow } from "../src/server/chat-service";
import { requestFutureReply } from "../src/server/future-self-provider";
import { buildAIContext } from "../src/server/ai-context-builder";
import { SupabaseBackend } from "../src/server/supabase-backend";
import { serializeJournalBackup, parseJournalBackup } from "../src/lib/journal-backup";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";
const playlist = { title: "A little room", description: "Songs for tonight", songs: [{ title: "Holocene", artist: "Bon Iver" }] };
const context = buildAIContext({ currentMessage: "Recommend songs", recentMessages: [], activeIdentityVersion, relevantSavedMoments: [] });
test("invalid server key characters fail safely before header construction or network access",async()=>{
 for(const key of ["sb_secret_masked••••","secret\ninside","KEY=value","\"quoted\""]){
  let calls=0;const db=new SupabaseBackend(backendConfig({SUPABASE_SERVICE_ROLE_KEY:key}),async()=>{calls++;return Response.json([]);});
  await assert.rejects(db.rest("fe_profiles"),(error:unknown)=>error instanceof ApiError&&error.code==="database_key_format"&&!error.message.includes(key));assert.equal(calls,0);
 }
});
test("saved playlists survive validated backup without becoming memory", () => {
  const saved = { ...playlist, id: "playlist-1", identityVersionId: activeIdentityVersion.id, sourceMessageId: "message-1", savedAt: "2026-10-15T00:00:00.000Z" };
  const snapshot = { version: 1 as const, identityVersions: [activeIdentityVersion], moments: [], preferences: DEFAULT_PREFERENCES, playlists: [saved] };
  const restored = parseJournalBackup(serializeJournalBackup(snapshot)).snapshot; assert.deepEqual(restored.playlists, [saved]); assert.deepEqual(restored.moments, []);
});
test("reply service builds owned bounded context and strips unsolicited playlists", async () => {
  const userId = "11111111-1111-4111-8111-111111111111", calls: string[] = [];
  const input = parseChatInput({ identityId: activeIdentityVersion.id, message: "A difficult day", requestId: "12345678-1234-4234-8234-123456789abc" });
  const db = new SupabaseBackend(backendConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "server-secret" }), async (url, options) => {
    const path = new URL(String(url)).pathname, query = new URL(String(url)).search; calls.push(path);
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    if (path.includes("/rpc/")) { assert.equal(body.p_user, userId); if (path.endsWith("fe_reserve_reply")) return Response.json({ status: "reserved" }); assert.equal(body.p_reply.playlist, null); return Response.json({ id: input.requestId, role: "assistant", content: body.p_reply.text, createdAt: new Date().toISOString() }); }
    assert.ok(query.includes(`user_id=eq.${userId}`));
    if (path.endsWith("fe_directions")) return Response.json([{ definition: activeIdentityVersion }]);
    if (path.endsWith("fe_messages")) { assert.ok(query.includes("limit=10")); return Response.json([]); }
    return Response.json(sampleMoments.map((m) => ({ record: m })));
  });
  let providerCalls = 0;
  await createReply(db, userId, input, async (payload) => { providerCalls++; assert.equal(payload.currentMessage, input.message); assert.ok(payload.savedMoments.length <= 3); assert.equal(JSON.stringify(payload).includes("photos"), false); return { text: "There is room to pause.", playlist, safety: "normal" }; });
  assert.equal(providerCalls, 1); assert.ok(calls.some((path) => path.endsWith("fe_finish_reply")));
});
test("backend is fail-closed without explicit Gemini configuration", () => {
  assert.equal(aiConfigured(backendConfig({})), false);
  assert.equal(aiConfigured(backendConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public", SUPABASE_SERVICE_ROLE_KEY: "secret", GEMINI_API_KEY: "secret", GEMINI_MODEL: "configured-model", FUTURE_ECHO_AI_ENABLED: "true" })), true);
});
test("playlist validation rejects URLs, duplicates, excess fields and safety music", () => {
  assert.ok(isPlaylist(playlist)); assert.equal(isPlaylist({ ...playlist, songs: [...playlist.songs, ...playlist.songs] }), false);
  assert.equal(isPlaylist({ ...playlist, url: "https://evil.test" }), false);
  assert.ok(isFutureReply({ text: "Here are a few songs.", safety: "normal", playlist }));
  assert.equal(isFutureReply({ text: "Help", safety: "support", playlist }), false);
  assert.equal(isSavedPlaylist({ ...playlist, id: "x", identityVersionId: "y", sourceMessageId: "z", savedAt: "nonsense" }), false);
  const url = new URL(songSearchUrl({ title: "x & ?", artist: "a/b" })); assert.equal(url.hostname, "www.youtube.com"); assert.equal(url.searchParams.get("search_query"), "x & ? a/b");
  assert.ok(requestsMusic("သီချင်းတွေ recommend ပေးပါ")); assert.equal(requestsMusic("I had a difficult day"), false);
});
test("context upload only projects consented text and rejects extra private fields", () => {
  const moment = { ...sampleMoments[0], identityVersionId: activeIdentityVersion.id, myNote: "Private note", consent: { ...sampleMoments[0].consent, useInAiContext: true, includeMyNoteInAiContext: false } };
  const payload = contextSyncPayload(activeIdentityVersion, [moment]); assert.ok(isContextSync(payload));
  assert.equal(payload.moments[0].myNote, undefined); assert.equal(payload.moments[0].photos, undefined); assert.equal(payload.moments[0].relatedAiReply, undefined);
  assert.equal(isContextSync({ ...payload, messages: [] }), false);
  assert.equal(isContextSync({ ...payload, moments: [{ ...payload.moments[0], photos: [] }] }), false);
  assert.equal(contextSyncPayload(activeIdentityVersion, [{ ...moment, consent: { ...moment.consent, useInAiContext: false } }]).moments.length, 0);
});
test("API rejects cross-origin, oversized JSON and caller-supplied history", async () => {
  assert.throws(() => requireOrigin(new Request("http://localhost:3000/api/ai", { headers: { origin: "https://evil.test" } }), "http://localhost:3000"), ApiError);
  await assert.rejects(readJson(new Request("http://localhost/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ long: "x".repeat(100) }) }), 20), ApiError);
  const input = { identityId: "identity-v2", message: "Hello", requestId: "12345678-1234-4234-8234-123456789abc" }; assert.equal(parseChatInput(input).message, "Hello");
  assert.throws(() => parseChatInput({ ...input, recentMessages: [] }), ApiError);
  assert.throws(() => messageFromRow({ id: "a", role: "assistant", content: "x", created_at: "2026-10-15", playlist: { arbitrary: true } }), ApiError);
});
test("Gemini uses server header, bounded context and validated structured replies", async () => {
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(new URL(String(url)).hostname, "generativelanguage.googleapis.com"); assert.ok(!String(url).includes("secret"));
    assert.equal(new Headers(options?.headers).get("x-goog-api-key"), "secret");
    const body = JSON.parse(String(options?.body)); assert.ok(body.systemInstruction); assert.equal(body.generationConfig.responseFormat.text.mimeType, "application/json");
    assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), context);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ text: "Some songs for tonight.", playlist, safety: "normal" }) }] } }] });
  };
  const result = await requestFutureReply(context, { key: "secret", model: "test-model" }, fetcher); assert.equal(result.playlist?.title, playlist.title);
  await assert.rejects(requestFutureReply(context, { key: "secret", model: "bad/model" }, fetcher), ApiError);
});
test("Gemini refuses malformed and incomplete output without pretending success", async () => {
  for (const candidate of [{ finishReason: "MAX_TOKENS" }, { finishReason: "STOP", content: { parts: [{ text: "not json" }] } }, { finishReason: "STOP", content: { parts: [{ text: '{"text":"Hi","safety":"normal","playlist":null,"extra":true}' }] } }]) {
    await assert.rejects(requestFutureReply(context, { key: "x", model: "test" }, async () => Response.json({ candidates: [candidate] })), ApiError);
  }
  const blocked = await requestFutureReply(context, { key: "x", model: "test" }, async () => Response.json({ promptFeedback: { blockReason: "SAFETY" } })); assert.equal(blocked.safety, "support"); assert.equal(blocked.playlist, null);
});
test("account identity is network-verified, never supplied by the browser", async () => {
  const db = new SupabaseBackend(backendConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "public" }), async (url, options) => {
    assert.equal(String(url), "https://example.supabase.co/auth/v1/user"); assert.ok(new Headers(options?.headers).get("authorization")?.startsWith("Bearer "));
    return Response.json({ id: "11111111-1111-4111-8111-111111111111", email: "a@example.test" });
  });
  await assert.rejects(db.user(new Request("http://localhost")), ApiError);
  const user = await db.user(new Request("http://localhost", { headers: { cookie: `fe-access=${"a".repeat(30)}` } })); assert.equal(user.email, "a@example.test");
});

test("modern server keys use apikey only; legacy service JWTs retain bearer authentication", async () => {
  for (const key of ["sb_secret_fixture_not_real", "eyJlegacy.fixture.signature"]) {
    const db = new SupabaseBackend(backendConfig({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: key }), async (_url, options) => {
      const headers = new Headers(options?.headers);
      assert.equal(headers.get("apikey"), key);
      assert.equal(headers.get("authorization"), key.startsWith("sb_secret_") ? null : `Bearer ${key}`);
      assert.equal(headers.get("prefer"), "return=representation");
      assert.equal(options?.cache, "no-store");
      return Response.json([]);
    });
    await db.rest("fe_profiles?select=user_id&limit=0", { headers: { Prefer: "return=representation", authorization: "Bearer wrong-token", apikey: "wrong-key" } });
  }
});
