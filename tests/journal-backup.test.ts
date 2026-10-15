import assert from "node:assert/strict";
import test from "node:test";
import { JournalBackupError, MAX_BACKUP_BYTES, parseJournalBackup, readJournalBackup, serializeJournalBackup } from "../src/lib/journal-backup";
import { activeIdentityVersion, pastIdentityVersion } from "../src/lib/mock-data";
import { sampleMoments } from "../src/lib/mock-messenger";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";
const snapshot = { version: 1 as const, identityVersions: [pastIdentityVersion, activeIdentityVersion], moments: sampleMoments, preferences: DEFAULT_PREFERENCES };
const stamp = "2026-10-14T13:13:46.764Z";

test("backup round-trip preserves evidence, consent and presentation without references to live state", () => {
  const before = JSON.stringify(snapshot);
  const restored = parseJournalBackup(serializeJournalBackup(snapshot, stamp));
  assert.deepEqual(restored.snapshot, JSON.parse(before));
  assert.notEqual(restored.snapshot, snapshot);
  assert.equal(JSON.stringify(snapshot), before);
  assert.equal(restored.exportedAt, stamp);
});
test("invalid JSON, unsupported backup versions, extra fields and invalid dates fail closed", () => {
  const valid = JSON.parse(serializeJournalBackup(snapshot, stamp));
  for (const source of ["{", "null", "[]", JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, consent: true }),
    JSON.stringify({ ...valid, exportedAt: "2026-02-30T12:00:00.000Z" }), JSON.stringify({ ...valid, snapshot: { ...snapshot, moments: [{ ...sampleMoments[0], identityVersionId: "unknown" }] } })]) {
    assert.throws(() => parseJournalBackup(source), JournalBackupError);
  }
});
test("oversized files are rejected before text is read; read failures are explicit", async () => {
  let called = false;
  await assert.rejects(readJournalBackup({ size: MAX_BACKUP_BYTES + 1, text: async () => { called = true; return ""; } }),
    (e: unknown) => e instanceof JournalBackupError && e.code === "too-large");
  assert.equal(called, false);
  await assert.rejects(readJournalBackup({ size: 1, text: async () => { throw new Error("disk"); } }),
    (e: unknown) => e instanceof JournalBackupError && e.code === "read-failed");
});
test("browser-compatible Blob reading and invalid export validation", async () => {
  assert.deepEqual((await readJournalBackup(new Blob([serializeJournalBackup(snapshot, stamp)]))).snapshot, JSON.parse(JSON.stringify(snapshot)));
  assert.throws(() => serializeJournalBackup({ ...snapshot, identityVersions: [] }, stamp), JournalBackupError);
});
