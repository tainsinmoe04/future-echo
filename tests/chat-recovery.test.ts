import test from "node:test";
import assert from "node:assert/strict";
import { parseChatRecovery, recoveredThreads } from "../src/lib/chat-recovery";
const now = Date.now();
const message = { id: "user-1", role: "user", content: "Not ready to lose these words", createdAt: new Date(now).toISOString() };
const value = { version: 1, owner: null, savedAt: now, threads: { direction: { messages: [message], draft: "", typing: true } }, attempts: { direction: { content: message.content, requestId: "12345678-1234-4123-8123-123456789012" } } };
test("reload recovery keeps interrupted words and request ID without resuming generation", () => {
  const parsed = parseChatRecovery(JSON.stringify(value), now);
  assert.ok(parsed);
  const thread = recoveredThreads(parsed).direction;
  assert.equal(thread.typing, false);
  assert.equal(thread.draft, message.content);
  assert.deepEqual(thread.messages, [message]);
  assert.equal(parsed.attempts.direction.requestId, value.attempts.direction.requestId);
});
test("recovery preserves newer draft rather than replacing it with interrupted text", () => {
  const parsed = parseChatRecovery(JSON.stringify({ ...value, threads: { direction: { ...value.threads.direction, draft: "My newer thought" } } }), now)!;
  assert.equal(recoveredThreads(parsed).direction.draft, "My newer thought");
});
test("unload cancellation cannot erase pending words after typing has already stopped", () => {
  const parsed = parseChatRecovery(JSON.stringify({ ...value, threads: { direction: { ...value.threads.direction, typing: false } } }), now)!;
  assert.equal(recoveredThreads(parsed).direction.draft, message.content);
});
test("an already completed request does not restore an old draft", () => {
  const parsed = parseChatRecovery(JSON.stringify({ ...value, threads: { direction: { messages: [message, { ...message, id: value.attempts.direction.requestId, role: "assistant", content: "A completed reply" }], draft: "", typing: false } } }), now)!;
  assert.equal(recoveredThreads(parsed).direction.draft, "");
});
test("live RPC nullable playlist is normalized without losing conversation", () => {
  const live = { ...value, threads: { direction: { messages: [{ ...message, role: "assistant", playlist: null, safety: "normal" }], draft: "Unsent", typing: false } } };
  const parsed = parseChatRecovery(JSON.stringify(live), now);
  assert.ok(parsed);
  assert.equal(recoveredThreads(parsed).direction.messages.length, 1);
  assert.equal(Object.hasOwn(recoveredThreads(parsed).direction.messages[0], "playlist"), false);
});
test("recovery rejects oversized, expired, malformed, unknown and prototype payloads", () => {
  assert.equal(parseChatRecovery("x".repeat(2_000_001)), null);
  for (const change of [{ savedAt: now - 86400001 }, { savedAt: now + 60001 }, { owner: "not-an-account" }, { consent: true }, { attempts: { unknown: value.attempts.direction } }, { threads: JSON.parse('{"__proto__":{}}') }]) assert.equal(parseChatRecovery(JSON.stringify({ ...value, ...change }), now), null);
  assert.equal(parseChatRecovery("broken", now), null);
});
