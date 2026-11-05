import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, apiFailure, cookieValue, readJson, requireOrigin } from "../src/server/backend-http";

const request = (body: string, headers: Record<string, string> = {}) => new Request("https://echo.test/api/context", {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body,
});
const isError = (status: number, code: string) => (error: unknown) => error instanceof ApiError && error.status === status && error.code === code;

test("JSON media type is exact, case insensitive and permits charset parameters", async () => {
  assert.deepEqual(await readJson(request('{"ok":true}', { "content-type": "Application/JSON; charset=utf-8" })), { ok: true });
  for (const type of ["application/jsonp", "application/json-evil", "text/plain", "application/problem+json"]) {
    await assert.rejects(readJson(request("{}", { "content-type": type })), isError(415, "content_type"));
  }
});

test("JSON body byte limits are enforced with missing or dishonest content lengths", async () => {
  await assert.rejects(readJson(request('{"text":"မြန်မာ"}'), 10), isError(413, "too_large"));
  await assert.rejects(readJson(request("{}", { "content-length": "1" })), isError(400, "body_length"));
  await assert.rejects(readJson(request("{}", { "content-length": "3" })), isError(400, "body_length"));
  for (const length of ["", "-1", "2.1", "999999999999999999999"]) {
    await assert.rejects(readJson(request("{}", { "content-length": length })), isError(413, "too_large"));
  }
  assert.deepEqual(await readJson(request("{}", { "content-length": "2" }), 2), {});
  await assert.rejects(readJson(request("{}"), 0), RangeError);
});

test("compressed, malformed UTF-8 and broken streams fail with safe client errors", async () => {
  await assert.rejects(readJson(request("{}", { "content-encoding": "gzip" })), isError(415, "content_encoding"));
  const utf8 = new Request("https://echo.test/api/context", { method: "POST", headers: { "content-type": "application/json" }, body: new Uint8Array([0xff]) });
  await assert.rejects(readJson(utf8), isError(400, "json"));
  const broken = new Request("https://echo.test/api/context", {
    method: "POST", headers: { "content-type": "application/json" },
    body: new ReadableStream({ start(controller) { controller.error(new Error("private transport detail")); } }),
    duplex: "half",
  } as RequestInit);
  await assert.rejects(readJson(broken), isError(400, "body"));
});

test("cross-site fetch metadata cannot bypass the configured origin boundary", () => {
  const originRequest = (origin?: string, site?: string) => new Request("https://echo.test/api/context", {
    headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) },
  });
  assert.doesNotThrow(() => requireOrigin(originRequest("https://echo.test", "same-origin"), "https://echo.test"));
  assert.doesNotThrow(() => requireOrigin(originRequest("https://echo.test"), "https://echo.test"));
  for (const configuration of ["", "not a URL", "file:///tmp/private", "https://" + "user:password@echo.test"]) {
    assert.throws(() => requireOrigin(originRequest("https://echo.test"), configuration), isError(503, "origin_setup"));
  }
  for (const candidate of [originRequest(), originRequest("null"), originRequest("https://evil.test"), originRequest("https://echo.test", "cross-site")]) {
    assert.throws(() => requireOrigin(candidate, "https://echo.test"), isError(403, "origin"));
  }
});

test("ambiguous session cookies fail closed and errors never reveal transport details", async () => {
  const cookies = (value: string) => new Request("https://echo.test", { headers: { cookie: value } });
  assert.equal(cookieValue(cookies("other=1; fe-access=valid.token; another=2"), "fe-access"), "valid.token");
  assert.equal(cookieValue(cookies("fe-access=one; fe-access=two"), "fe-access"), undefined);
  assert.equal(cookieValue(cookies("fe-access-shadow=one"), "fe-access"), undefined);
  const failure = apiFailure(new Error("private transport detail"));
  assert.equal(failure.status, 500);
  assert.equal(failure.headers.get("cache-control"), "no-store");
  assert.equal(JSON.stringify(await failure.json()).includes("private transport detail"), false);
});
