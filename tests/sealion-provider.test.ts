import assert from "node:assert/strict";
import test from "node:test";
import { requestSeaLionReply, seaLionTrialEnabled, SEALION_TRIAL_MODEL } from "../src/server/sealion-provider";
import { buildAIContext } from "../src/server/ai-context-builder";
import { activeIdentityVersion } from "../src/lib/mock-data";
const context = buildAIContext({currentMessage:"Today was difficult.", recentMessages:[], activeIdentityVersion, relevantSavedMoments:[]});
const reply = { text:"That sounds difficult.", safety:"normal", playlist:null };
test("SEA-LION is development-only, opt-in and excludes simultaneous OpenRouter", () => {
  assert.equal(seaLionTrialEnabled({NODE_ENV:"production", FUTURE_ECHO_SEALION_TRIAL:"true"}), false);
  assert.equal(seaLionTrialEnabled({NODE_ENV:"development"}), false);
  assert.equal(seaLionTrialEnabled({NODE_ENV:"development", FUTURE_ECHO_SEALION_TRIAL:"true"}), true);
  assert.equal(seaLionTrialEnabled({NODE_ENV:"development", FUTURE_ECHO_SEALION_TRIAL:"true", FUTURE_ECHO_OPENROUTER_TRIAL:"true"}), false);
});
test("SEA-LION uses fixed endpoint/model, server key and native strict JSON profile", async () => {
  const result = await requestSeaLionReply(context, "fictional-key", async (url, options) => {
    assert.equal(String(url), "https://api.sea-lion.ai/v1/chat/completions");
    assert.equal(options?.redirect, "error");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer fictional-key");
    const body = JSON.parse(String(options?.body));
    assert.equal(body.model, SEALION_TRIAL_MODEL);
    assert.deepEqual(body.chat_template_kwargs, {enable_thinking:false});
    assert.deepEqual(body.response_format, {type:"json_object"});
    assert.equal(body.messages.at(-1).content, context.currentMessage);
    return Response.json({choices:[{finish_reason:"stop",message:{role:"assistant",content:JSON.stringify(reply)}}]});
  });
  assert.deepEqual(result, reply);
});
test("SEA-LION fails closed without retries, leaked errors or repaired partial output", async () => {
  await assert.rejects(requestSeaLionReply(context, ""), /server-only/);
  for (const value of ["not JSON", JSON.stringify({...reply,extra:true}), JSON.stringify({...reply,text:""})]) {
    await assert.rejects(requestSeaLionReply(context,"fictional",async()=>Response.json({choices:[{finish_reason:"stop",message:{role:"assistant",content:value}}]})));
  }
  await assert.rejects(requestSeaLionReply(context,"fictional",async()=>Response.json({choices:[{finish_reason:"length",message:{role:"assistant",content:JSON.stringify(reply)}}]})), /finish safely/);
  let calls=0;
  for (const status of [401,402,403,429,500]) await assert.rejects(requestSeaLionReply(context,"fictional",async()=>{calls++;return Response.json({secret:"PRIVATE"},{status});}), error => error instanceof Error && !error.message.includes("PRIVATE"));
  assert.equal(calls,5);
});
