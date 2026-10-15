import assert from "node:assert/strict";
import test from "node:test";
import { createJournalStorage, isStoredJournalDocument, JournalStorageError, makeJournalDocument } from "../src/lib/journal-storage";

const stamp = "2026-10-14T12:00:00.000Z";

test("local envelope versions and increments revisions without altering the payload", () => {
  const value = { originalExcerpt: "My words", consent: false, photos: ["local-image"] };
  const document = makeJournalDocument(value, 4, stamp);
  assert.equal(document.revision, 5);
  assert.equal(document.version, 1);
  assert.equal(document.value, value);
  assert.equal(isStoredJournalDocument(document), true);
});

test("unknown versions, invalid revisions, absent payloads and invalid dates are rejected", () => {
  const document = makeJournalDocument({}, 0, stamp);
  for (const value of [null, [], "journal", { ...document, version: 2 }, { ...document, revision: 0 },
    { ...document, revision: Infinity }, { ...document, revision: 1.1 }, { ...document, savedAt: "tomorrow" },
    { format: document.format, version: 1, revision: 1, savedAt: stamp }]) {
    assert.equal(isStoredJournalDocument(value), false);
  }
});

test("invalid expected revisions cannot create a document", () => {
  for (const revision of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => makeJournalDocument({}, revision, stamp), JournalStorageError);
  }
  assert.throws(() => makeJournalDocument({}, 0, "not a date"), JournalStorageError);
});

test("unsupported environments fail explicitly instead of silently using session state", async () => {
  const storage = createJournalStorage("unit-tests-do-not-open-a-browser-db");
  await assert.rejects(storage.read((value): value is string => typeof value === "string"),
    (error: unknown) => error instanceof JournalStorageError && error.code === "unavailable");
});

test("invalid payload is rejected before opening browser storage", async () => {
  const storage = createJournalStorage();
  await assert.rejects(storage.write("bad", 0, (value): value is string => value === "valid"),
    (error: unknown) => error instanceof JournalStorageError && error.code === "invalid");
});
test("restore rejects invalid payloads and revisions before opening storage", async () => {
  const storage = createJournalStorage();
  const valid = (value: unknown): value is string => value === "valid";
  await assert.rejects(storage.restore("invalid", 1, valid), (error: unknown) => error instanceof JournalStorageError && error.code === "invalid");
  await assert.rejects(storage.restore("valid", -1, valid), (error: unknown) => error instanceof JournalStorageError && error.code === "invalid");
});
