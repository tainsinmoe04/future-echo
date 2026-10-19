import assert from "node:assert/strict";
import test from "node:test";
import { firstMessage } from "../src/lib/mock-messenger";
import { activeIdentityVersion } from "../src/lib/mock-data";

test("built-in welcome is conversational and asks about today without a direction lecture", () => {
  const identity = { ...activeIdentityVersion, definition: "A thoughtful learner", horizon: { ...activeIdentityVersion.horizon, targetMonth: "2036-10" } };
  const english = firstMessage(identity);
  assert.match(english, /How was your day/);
  assert.equal(english.includes("Imagine"), false);
  assert.equal(english.includes(identity.definition), false);
  const myanmar = firstMessage({ ...identity, definition: "နည်းပညာသင်ယူချင်တယ်" });
  assert.match(myanmar, /ဒီနေ့ရော မင်းဘာတွေဖြစ်ခဲ့လဲ/);
  assert.match(myanmar, /နည်းနည်းထူးဆန်းတယ်နော်/);
  assert.equal(myanmar.includes("စိတ်ကူး"), false);
  assert.equal(myanmar.includes("ရွေးထားတဲ့လမ်း"), false);
  assert.equal(myanmar.includes("မထင်မှတ်ဘဲဆက်သွယ်မိ"), false);
  assert.equal(firstMessage(identity), english);
});
