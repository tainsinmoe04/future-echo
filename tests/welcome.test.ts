import assert from "node:assert/strict";
import test from "node:test";
import { firstMessage, returningMessage, connectedConversation } from "../src/lib/mock-messenger";
import {parseLiveConnectionConsent} from "../src/lib/live-connection";
import { activeIdentityVersion } from "../src/lib/mock-data";

test("connecting preserves exactly one app-written welcome without promoting preview history",()=>{
 const welcome={id:"welcome-original",role:"assistant" as const,content:"App-written hello",createdAt:"2026-11-05T00:00:00Z"};
 const sample={...welcome,id:"preview-reply",content:"Example, not live"};
 const live={...welcome,id:"actual-reply",content:"Actual reply"};
 assert.deepEqual(connectedConversation([live],[welcome,sample],activeIdentityVersion),[welcome,live]);
 assert.equal(connectedConversation([],[],{ ...activeIdentityVersion, createdAt: new Date().toISOString() })[0].id.startsWith("welcome-"),true);
 assert.equal(connectedConversation([],[],activeIdentityVersion).length,0);
});
test("return check-in follows the latest user language and is not another introduction",()=>{
 assert.match(returningMessage(activeIdentityVersion),/How are you doing today/);
 assert.match(returningMessage(activeIdentityVersion,[{id:"user",role:"user",content:"ဒီနေ့ပင်ပန်းတယ်",createdAt:new Date().toISOString()}]),/ဒီနေ့ရော အဆင်ပြေလား/);
 assert.equal(returningMessage(activeIdentityVersion).includes("It's you"),false);
});
test("tab reconnection consent is narrowly scoped and never accepts journal content",()=>{
 const consent={identityId:"direction-v1",userId:"11111111-1111-4111-8111-111111111111",provider:"SEA-LION"};
 assert.deepEqual(parseLiveConnectionConsent(JSON.stringify(consent)),consent);
 for(const value of [null,"bad",JSON.stringify({...consent,provider:"other"}),JSON.stringify({...consent,userId:""}),JSON.stringify({...consent,note:"private"})]) assert.equal(parseLiveConnectionConsent(value),null);
});

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
