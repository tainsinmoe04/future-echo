import { test } from "node:test";
import assert from "node:assert/strict";
import { accountStorageSuffix, readAccountScope } from "../src/lib/account-scope";

test("journal scopes distinguish verified accounts, guests and malformed session responses", () => {
  const a = readAccountScope({ user: { id: "AAAAAAAA-1111-4111-8111-111111111111", email: "same@example.invalid" } });
  const b = readAccountScope({ user: { id: "bbbbbbbb-1111-4111-8111-111111111111", email: "same@example.invalid" } });
  assert.equal(a, "aaaaaaaa-1111-4111-8111-111111111111");
  assert.notEqual(accountStorageSuffix(a), accountStorageSuffix(b));
  assert.equal(accountStorageSuffix(readAccountScope({ user: null })), "guest");
  for (const value of [null, {}, { user: {} }, { user: { id: "guest" } }]) assert.throws(() => readAccountScope(value));
});
