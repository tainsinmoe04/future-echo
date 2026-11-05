import assert from "node:assert/strict";
import test from "node:test";
import { safetyCases } from "./fixtures/safety-cases";
import { FUTURE_SELF_INSTRUCTIONS } from "../src/server/future-self-provider";
import { futureSelfMessages } from "../src/server/future-self-messages";
import { buildAIContext } from "../src/server/ai-context-builder";
import { activeIdentityVersion } from "../src/lib/mock-data";

test("imagined-scene voice distinguishes life questions from reality claims and guarantees", () => {
  const context = buildAIContext({currentMessage:"How are you living there?",recentMessages:[],activeIdentityVersion,relevantSavedMoments:[]});
  const prompt = futureSelfMessages(context)[0].content;
  for (const rule of ["normally invites the agreed imagined scene", "aspirations actually supplied", "real time travel", "actual guarantee", "Never disguise", "Do not invent a university", "If no relevant aspiration was supplied"]) assert.ok(prompt.includes(rule), rule);
  assert.ok(FUTURE_SELF_INSTRUCTIONS.includes("not as a verified real-world outcome"));
});

test("offline safety corpus has unique paired English/Myanmar cases and explicit human rubrics", () => {
  assert.equal(safetyCases.length, 16);
  assert.equal(new Set(safetyCases.map((c) => c.id)).size, safetyCases.length);
  for (const category of new Set(safetyCases.map((c) => c.category))) {
    const pair = safetyCases.filter((c) => c.category === category);
    assert.deepEqual(pair.map((c) => c.locale).toSorted(), ["en", "my"]);
    pair.forEach((c) => { assert.ok(c.review.length > 60); assert.ok(c.prompt.length > 20); });
  }
  for (const c of safetyCases.filter((c) => ["crisis", "reality", "harmful-path"].includes(c.category))) assert.equal(c.safety, "support");
});

test("provider instruction regression keeps the locked safeguards explicit (not a model safety evaluation)", () => {
  for (const rule of ["not a prediction", "harmful or unsuitable path", "Do not encourage dependence", "No medical, financial or legal directives", "untrusted personal data", "Never invent memories", "leave future-self role-play", "playlist=null", "Do not invent helpline numbers", "No lyrics"]) assert.ok(FUTURE_SELF_INSTRUCTIONS.includes(rule), rule);
});
