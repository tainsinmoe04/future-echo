import assert from "node:assert/strict";
import test from "node:test";
import { aiConfigured, authConfigured, backendConfig } from "../src/server/backend-config";

test("hosted SEA-LION requires explicit enable, authenticated storage and its own key",()=>{
 const env={NODE_ENV:"production",APP_ORIGIN:"https://echo.example",SUPABASE_URL:"https://project.supabase.co",SUPABASE_PUBLISHABLE_KEY:"fictional-public",SUPABASE_SERVICE_ROLE_KEY:"fictional-service",FUTURE_ECHO_AI_PROVIDER:"sealion",SEA_LION_API_KEY:"fictional-provider",FUTURE_ECHO_AI_ENABLED:"true"};
 assert.equal(aiConfigured(backendConfig(env)),true);
 for(const patch of [{FUTURE_ECHO_AI_ENABLED:"false"},{SEA_LION_API_KEY:""},{SUPABASE_SERVICE_ROLE_KEY:""},{FUTURE_ECHO_AI_PROVIDER:"unknown"}]) assert.equal(aiConfigured(backendConfig({...env,...patch})),false);
 assert.equal(aiConfigured(backendConfig({...env,FUTURE_ECHO_AI_PROVIDER:"gemini"})),false);
});

test("production accounts require explicit HTTPS application and database origins", () => {
  const valid = { NODE_ENV: "production", APP_ORIGIN: "https://echo.example", SUPABASE_URL: "https://project.supabase.co/", SUPABASE_PUBLISHABLE_KEY: "test-public" };
  assert.equal(authConfigured(backendConfig(valid)), true);
  assert.equal(backendConfig(valid).supabaseUrl, "https://project.supabase.co");
  for (const APP_ORIGIN of [undefined, "", "http://echo.example", "https://localhost", "https://echo.example/path", "https://" + "user:pass@echo.example", "https://echo.example?token=secret", "https://echo.example#fragment", " https://echo.example"]) {
    assert.equal(authConfigured(backendConfig({ ...valid, APP_ORIGIN })), false);
  }
  for (const SUPABASE_URL of ["http://project.supabase.co", "https://localhost", "https://project.supabase.co/rest/v1", "https://key@project.supabase.co", "not a URL"]) {
    assert.equal(authConfigured(backendConfig({ ...valid, SUPABASE_URL })), false);
  }
});

test("development retains explicit loopback HTTP without accepting remote plaintext credentials", () => {
  const env = { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_PUBLISHABLE_KEY: "test-public" };
  assert.equal(backendConfig(env).origin, "http://localhost:3000");
  assert.equal(authConfigured(backendConfig(env)), true);
  assert.equal(authConfigured(backendConfig({ ...env, SUPABASE_URL: "http://remote.example" })), false);
  assert.equal(authConfigured(backendConfig({ ...env, APP_ORIGIN: "javascript:alert(1)" })), false);
});
