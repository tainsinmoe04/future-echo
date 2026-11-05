import assert from "node:assert/strict";
import test from "node:test";
import {beginGoogleFlow,consumeGoogleFlow} from "../src/server/google-oauth";
import {backendConfig} from "../src/server/backend-config";
const config=backendConfig({NODE_ENV:"production",APP_ORIGIN:"https://example.test",SUPABASE_URL:"https://fictional.supabase.co",SUPABASE_PUBLISHABLE_KEY:"fictional"});
test("Google uses fixed Supabase provider, random PKCE/state and fixed app callback",()=>{
 const a=beginGoogleFlow(config,"/now",1000),b=beginGoogleFlow(config,"/now",1000),url=new URL(a.url);
 assert.notEqual(a.cookie,b.cookie);assert.equal(url.origin,config.supabaseUrl);assert.equal(url.searchParams.get("provider"),"google");assert.equal(url.searchParams.get("code_challenge_method"),"s256");
 const callback=new URL(url.searchParams.get("redirect_to")!);assert.equal(callback.origin,config.origin);assert.equal(callback.pathname,"/api/auth/google-callback");
 const flow=consumeGoogleFlow(a.cookie,callback.searchParams.get("state"),"fictional-code",2000);assert.equal(flow.destination,"/now");assert.equal(flow.verifier.length,64);
 for(const [cookie,state,code,now] of [[undefined,callback.searchParams.get("state"),"code",2000],[a.cookie,"x".repeat(32),"code",2000],[a.cookie,callback.searchParams.get("state"),null,2000],[a.cookie,callback.searchParams.get("state"),"code",601000]] as const) assert.throws(()=>consumeGoogleFlow(cookie,state,code,now));
 assert.throws(()=>beginGoogleFlow(backendConfig({NODE_ENV:"production"}),"/now"));
});
