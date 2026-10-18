import assert from "node:assert/strict";
import test from "node:test";
import { geminiFailure } from "../src/server/gemini-error";
import { requestFutureReply } from "../src/server/future-self-provider";
import { buildAIContext } from "../src/server/ai-context-builder";
import { activeIdentityVersion } from "../src/lib/mock-data";

test("Gemini setup failures are classified without assuming every precondition means billing", () => {
  const cases = [
    [400, { error: { status: "FAILED_PRECONDITION", message: "User location is not supported for the API use." } }, "provider_region", 503],
    [400, { error: { status: "FAILED_PRECONDITION", message: "Please enable billing to use this project." } }, "provider_billing", 503],
    [400, { error: { status: "FAILED_PRECONDITION", message: "An unspecified prerequisite is not met." } }, "provider_error", 502],
    [400, { error: { message: "API key not valid. Please pass a valid API key.", details: [{ reason: "API_KEY_INVALID" }] } }, "provider_credentials", 503],
    [401, {}, "provider_credentials", 503], [403, {}, "provider_access", 503],
    [404, {}, "provider_model", 503], [429, {}, "provider_limit", 429], [503, {}, "provider_error", 502],
  ] as const;
  for (const [status, body, expected, mappedStatus] of cases) {
    const error = geminiFailure(status, body);
    assert.equal(error.code, expected); assert.equal(error.status, mappedStatus);
  }
});

test("malformed or sensitive raw provider errors never reach the user", () => {
  for (const body of [null, [], "secret-fixture", { error: null }, { error: { message: "secret-fixture", details: [null, "secret-fixture", {}] } }]) {
    const error = geminiFailure(502, body);
    assert.equal(error.code, "provider_error"); assert.ok(!error.message.includes("secret-fixture"));
  }
  const region = geminiFailure(400, { error: { message: "User location is not supported. secret-fixture" } });
  assert.equal(region.code, "provider_region"); assert.ok(!region.message.includes("secret-fixture"));
});

test("a blocked generation fails once with the specific safe error, never a fake reply or retry", async () => {
  let calls = 0;
  const context = buildAIContext({ currentMessage: "A fictional setup check", recentMessages: [], relevantSavedMoments: [], activeIdentityVersion });
  await assert.rejects(requestFutureReply(context, { key: "fixture-not-real", model: "fixture" }, async () => {
    calls++;
    return Response.json({ error: { status: "FAILED_PRECONDITION", message: "User location is not supported for the API use. fixture-not-real" } }, { status: 400 });
  }), (error: unknown) => error instanceof Error && "code" in error && error.code === "provider_region" && !error.message.includes("fixture-not-real"));
  assert.equal(calls, 1);
});
