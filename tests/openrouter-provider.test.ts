import assert from "node:assert/strict";
import test from "node:test";
import { openRouterTrialEnabled, OPENROUTER_TRIAL_MODEL, requestOpenRouterReply } from "../src/server/openrouter-provider";
import { parseLocalContext } from "../src/server/local-ollama";
import { localReplyPayload } from "../src/lib/local-ai-input";
import { activeIdentityVersion } from "../src/lib/mock-data";

const context = () => parseLocalContext(localReplyPayload(activeIdentityVersion, [], [], "Today was difficult."));
const config = { key: "fictional-test-key", model: OPENROUTER_TRIAL_MODEL };
const response = (content: unknown, finish_reason = "stop") => Response.json({ choices: [{ finish_reason, message: { role: "assistant", content: typeof content === "string" ? content : JSON.stringify(content) } }] });
const normal = { text: "You can pause before deciding.", safety: "normal", playlist: null };

test("OpenRouter trial is opt-in and impossible in production", () => {
  assert.equal(OPENROUTER_TRIAL_MODEL, "dots-studio/dots-3-note-preview:free");
  assert.equal(openRouterTrialEnabled({ NODE_ENV: "production", FUTURE_ECHO_OPENROUTER_TRIAL: "true" }), false);
  assert.equal(openRouterTrialEnabled({ NODE_ENV: "development" }), false);
  assert.equal(openRouterTrialEnabled({ NODE_ENV: "development", FUTURE_ECHO_OPENROUTER_TRIAL: "true" }), true);
});
test("OpenRouter keeps real conversation roles, fixed free model, privacy and zero-price guards", async () => {
  let calls = 0;
  const input = { ...context(), recentMessages: [{ role: "user" as const, content: "I took an exam." }, { role: "assistant" as const, content: "How did it go?" }] };
  const reply = await requestOpenRouterReply(input, config, async (url, options) => {
    calls++;
    assert.equal(String(url), "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.equal(new Headers(options?.headers).get("Authorization"), `Bearer ${config.key}`);
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, OPENROUTER_TRIAL_MODEL);
    assert.deepEqual(body.provider, { allow_fallbacks: false, require_parameters: true, data_collection: "deny", max_price: { prompt: 0, completion: 0 } });
    assert.deepEqual(body.messages.slice(1), [...input.recentMessages, { role: "user", content: input.currentMessage }]);
    assert.equal(body.messages[0].role, "system");
    assert.ok(body.messages[0].content.includes("ငါ"));
    assert.ok(body.messages[0].content.includes("not actual time travel"));
    assert.ok(body.messages[0].content.includes("Reply in the language of the user's latest message"));
    assert.ok(body.messages[0].content.includes("Follow a language switch immediately"));
    return response(normal);
  });
  assert.equal(reply.text, normal.text);
  assert.equal(calls, 1);
  await assert.rejects(requestOpenRouterReply(input, { ...config, model: "paid-model" }), /approved free/);
  await assert.rejects(requestOpenRouterReply(input, { ...config, key: "" }), /approved free/);
});
test("OpenRouter rejects partial, invalid, oversized and unsafe playlist envelopes", async () => {
  for (const reply of [response(normal, "length"), response("not JSON"), response("x".repeat(16001)), response({ ...normal, safety: "unknown" }), response({ ...normal, text: "" }), response({ ...normal, extra: true })]) {
    await assert.rejects(requestOpenRouterReply(context(), config, async () => reply));
  }
  const playlist = { title: "A pause", description: "A suggestion", songs: [{ title: "Example", artist: "Fictional" }] };
  const unsolicited = await requestOpenRouterReply(context(), config, async () => response({ ...normal, playlist }));
  assert.equal(unsolicited.playlist, null);
  const requested = await requestOpenRouterReply({ ...context(), currentMessage: "Recommend songs for me." }, config, async () => response({ ...normal, playlist }));
  assert.deepEqual(requested.playlist, playlist);
  await assert.rejects(requestOpenRouterReply(context(), config, async () => response({ ...normal, safety: "support", playlist })));
});
test("OpenRouter failures are fixed safe messages and never retry or expose provider payloads", async () => {
  let calls = 0;
  for (const status of [401, 402, 403, 404, 429, 500]) {
    await assert.rejects(requestOpenRouterReply(context(), config, async () => { calls++; return Response.json({ error: { message: "SECRET_PROVIDER_PAYLOAD" } }, { status }); }), (error: Error) => !error.message.includes("SECRET_PROVIDER_PAYLOAD") && !error.message.includes(config.key));
  }
  assert.equal(calls, 6);
  await assert.rejects(requestOpenRouterReply(context(), config, async () => { throw new Error("SECRET_NETWORK_ERROR"); }), /No other model or provider was tried/);
});
