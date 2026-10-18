import assert from "node:assert/strict";
import test from "node:test";
import { localAIEnabled, parseLocalContext, requestLocalReply, requireLocalRequest } from "../src/server/local-ollama";
import { localReplyPayload } from "../src/lib/local-ai-input";
import { activeIdentityVersion } from "../src/lib/mock-data";
import { sampleMoments } from "../src/lib/mock-messenger";

const input = () => localReplyPayload(activeIdentityVersion, [], [], "Today was difficult.");
test("local trial is opt-in, development-only, loopback and same-origin", () => {
  assert.equal(localAIEnabled({ NODE_ENV: "production", FUTURE_ECHO_LOCAL_AI: "true" }), false);
  assert.equal(localAIEnabled({ NODE_ENV: "development" }), false);
  assert.equal(localAIEnabled({ NODE_ENV: "development", FUTURE_ECHO_LOCAL_AI: "true" }), true);
  const req = (host: string, origin: string) => new Request(`http://${host}/api/local-ai`, { headers: { origin } });
  assert.doesNotThrow(() => requireLocalRequest(req("localhost:3000", "http://localhost:3000"), true));
  assert.throws(() => requireLocalRequest(req("localhost:3000", "http://evil.test"), true));
  assert.throws(() => requireLocalRequest(req("example.com", "http://example.com"), true));
  assert.throws(() => requireLocalRequest(req("localhost:3000", "http://localhost:3000"), false));
});
test("local context excludes media, unconsented notes, deleted and old-version moments", () => {
  const m = { ...sampleMoments[0], identityVersionId: activeIdentityVersion.id, originalExcerpt: "x".repeat(2500), myNote: "private", consent: { ...sampleMoments[0].consent, useInAiContext: true, includeMyNoteInAiContext: false } };
  const payload = localReplyPayload(activeIdentityVersion, [m, { ...m, id: "deleted", deletedAt: new Date().toISOString() }, { ...m, id: "old", identityVersionId: "old" }], [], "Hi");
  const context = parseLocalContext(payload);
  assert.equal(context.savedMoments.length, 1);
  assert.equal(context.savedMoments[0].originalExcerpt.length, 2000);
  assert.equal(context.savedMoments[0].myNote, undefined);
  assert.equal(JSON.stringify(payload).includes("photos"), false);
  assert.throws(() => parseLocalContext({ ...input(), photos: [] }));
  assert.throws(() => parseLocalContext({ ...input(), recentMessages: Array(11).fill({}) }));
  assert.throws(() => parseLocalContext({ ...input(), identity: { ...activeIdentityVersion, status: "past" } }));
});
test("Ollama is fixed local-only, schema-validated and never retries into cloud", async () => {
  let calls = 0;
  const reply = await requestLocalReply(parseLocalContext(input()), async (url, options) => {
    calls++;
    assert.equal(String(url), "http://127.0.0.1:11434/api/chat");
    assert.equal(options?.redirect, "error");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, "gemma3:12b"); assert.equal(body.stream, false); assert.ok(body.format.properties.text);
    assert.ok(body.messages[0].content.includes("not a prediction"));
    assert.ok(body.messages[0].content.includes("These feelings alone are not a crisis"));
    return Response.json({ done: true, done_reason: "stop", message: { role: "assistant", content: JSON.stringify({ text: "You can pause.", safety: "normal", playlist: null }) } });
  });
  assert.equal(reply.text, "You can pause."); assert.equal(calls, 1);
  await assert.rejects(requestLocalReply(parseLocalContext(input()), async () => { calls++; throw new Error("secret"); }), /Nothing was sent to a cloud/);
  assert.equal(calls, 2);
  for (const body of [{ done: false }, { done: true, done_reason: "length" }, { done: true, done_reason: "stop", message: { role: "assistant", content: "not json" } }]) {
    await assert.rejects(requestLocalReply(parseLocalContext(input()), async () => Response.json(body)));
  }
});
