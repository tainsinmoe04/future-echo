import assert from "node:assert/strict";
import test from "node:test";
import {createReply,parseChatInput} from "../src/server/chat-service";
import {SupabaseBackend} from "../src/server/supabase-backend";
import {backendConfig} from "../src/server/backend-config";
import {activeIdentityVersion} from "../src/lib/mock-data";

test("authenticated reply reservations dispatch only SEA-LION and replay without another generation",async(t)=>{
 const config=backendConfig({FUTURE_ECHO_AI_PROVIDER:"sealion",SEA_LION_API_KEY:"fictional-sealion",SUPABASE_URL:"https://db.example",SUPABASE_SERVICE_ROLE_KEY:"fictional-service"});
 const input=parseChatInput({identityId:activeIdentityVersion.id,message:"I feel tired today.",requestId:"12345678-1234-4234-8234-123456789abc"});
 const user="11111111-1111-4111-8111-111111111111";let complete=false,calls=0;
 const stored={id:input.requestId,role:"assistant",content:"A little room to rest.",created_at:"2026-11-05T00:00:00Z"};
 const db=new SupabaseBackend(config,async(url,options)=>{
  const path=new URL(String(url)).pathname;
  if(path.endsWith("fe_directions"))return Response.json([{definition:activeIdentityVersion}]);
  if(path.endsWith("fe_reserve_reply")){assert.equal(JSON.parse(String(options?.body)).p_user,user);return Response.json({status:complete?"completed":"reserved"});}
  if(path.endsWith("fe_finish_reply")){complete=true;return Response.json({id:input.requestId,role:"assistant",content:stored.content,createdAt:stored.created_at});}
  if(path.endsWith("fe_messages"))return Response.json(complete?[stored]:[]);
  return Response.json([]);
 });
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(String(url),"https://api.sea-lion.ai/v1/chat/completions");assert.equal(new Headers(options?.headers).get("Authorization"),"Bearer fictional-sealion");
  const body=JSON.parse(String(options?.body));assert.equal(body.messages.at(-1).content,input.message);
  return Response.json({choices:[{finish_reason:"stop",message:{role:"assistant",content:JSON.stringify({text:stored.content,safety:"normal",playlist:null})}}]});};
 await createReply(db,user,input);await createReply(db,user,input);assert.equal(calls,1);
});
