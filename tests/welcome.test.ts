import assert from "node:assert/strict";
import test from "node:test";
import { firstMessage } from "../src/lib/mock-messenger";
import { activeIdentityVersion } from "../src/lib/mock-data";

test("built-in welcome uses the chosen year, remains imagined and does not repeat the whole definition", () => {
  const identity = { ...activeIdentityVersion, definition: "A thoughtful learner", horizon: { ...activeIdentityVersion.horizon, targetMonth: "2036-10" } };
  const english = firstMessage(identity);
  assert.match(english, /2036/);
  assert.match(english, /one possible version/);
  assert.equal(english.includes(identity.definition), false);
  const myanmar = firstMessage({ ...identity, definition: "နည်းပညာသင်ယူချင်တယ်" });
  assert.match(myanmar, /2036/);
  assert.match(myanmar, /စိတ်ကူး/);
  assert.equal(myanmar.includes("မထင်မှတ်ဘဲဆက်သွယ်မိ"), false);
  assert.equal(firstMessage(identity), english);
});
