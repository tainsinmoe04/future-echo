import assert from "node:assert/strict";
import test from "node:test";
import { createJournalSession } from "../src/lib/journal-session";
import { JournalStorageError, makeJournalDocument } from "../src/lib/journal-storage";
import type { JournalSnapshot } from "../src/lib/journal-snapshot";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";
const initial: JournalSnapshot = { version: 1, identityVersions: [], moments: [], preferences: DEFAULT_PREFERENCES };
const stamp = "2026-10-15T04:06:00.000Z";
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("hydration is single-flight and never writes over a saved document", async () => {
  let reads = 0, writes = 0;
  const stored = { ...initial, preferences: { ...DEFAULT_PREFERENCES, readingSize: "large" as const } };
  const session = createJournalSession(initial, { read: async () => { reads++; return makeJournalDocument(stored, 4, stamp); },
    write: async (value, revision) => { writes++; return makeJournalDocument(value, revision, stamp); } });
  session.update(() => stored);
  assert.equal(session.getSnapshot().snapshot, initial);
  await Promise.all([session.load(), session.load()]);
  assert.equal(reads, 1); assert.equal(writes, 0);
  assert.equal(session.getSnapshot().snapshot, stored);
});
test("a failed read blocks initialization and leaves existing storage untouched", async () => {
  let writes = 0;
  const session = createJournalSession(initial, { read: async () => { throw new JournalStorageError("invalid", "Unknown data"); },
    write: async (value, revision) => { writes++; return makeJournalDocument(value, revision, stamp); } });
  await session.load();
  assert.equal(session.getSnapshot().ready, false);
  assert.equal(session.getSnapshot().status, "error");
  assert.equal(writes, 0);
});
test("confirmed empty store initializes once", async () => {
  let writes = 0;
  const session = createJournalSession(initial, { read: async () => null, write: async (value, revision) => {
    writes++; assert.equal(revision, 0); return makeJournalDocument(value, revision, stamp);
  } });
  await session.load(); await session.load();
  assert.equal(writes, 1); assert.equal(session.getSnapshot().status, "saved");
});
test("rapid updates serialize writes and finish with the latest snapshot", async () => {
  const releases: (() => void)[] = [];
  const writes: { value: JournalSnapshot; revision: number }[] = [];
  const session = createJournalSession(initial, { read: async () => makeJournalDocument(initial, 0, stamp),
    write: async (value, revision) => { writes.push({ value, revision }); await new Promise<void>((resolve) => releases.push(resolve)); return makeJournalDocument(value, revision, stamp); } });
  await session.load();
  const first = { ...initial, preferences: { ...DEFAULT_PREFERENCES, readingSize: "large" as const } };
  const last = { ...first, preferences: { ...first.preferences, motion: "reduced" as const } };
  session.update(() => first); session.update(() => last);
  assert.equal(writes.length, 1); releases.shift()!(); await tick();
  assert.equal(writes.length, 2); assert.equal(writes[1].revision, 2); assert.equal(writes[1].value, last);
  releases.shift()!(); await tick(); assert.equal(session.getSnapshot().status, "saved");
});
test("conflicts retain unsaved data and never adopt another tab's revision", async () => {
  const revisions: number[] = [];
  const session = createJournalSession(initial, { read: async () => makeJournalDocument(initial, 2, stamp),
    write: async (_, revision) => { revisions.push(revision); throw new JournalStorageError("conflict", "Other tab changed"); } });
  await session.load();
  const next = { ...initial, preferences: { ...DEFAULT_PREFERENCES, motion: "reduced" as const } };
  session.update(() => next); await tick();
  assert.equal(session.getSnapshot().status, "error"); assert.equal(session.getSnapshot().snapshot, next);
  session.retry(); await tick(); assert.deepEqual(revisions, [3, 3]);
});

test("an update queued by a saved-state subscriber is persisted after the write lock releases", async () => {
  const writes: JournalSnapshot[] = [];
  const session = createJournalSession(initial, {
    read: async () => makeJournalDocument(initial, 0, stamp),
    write: async (value, revision) => { writes.push(value); return makeJournalDocument(value, revision, stamp); },
  });
  await session.load();
  const first = { ...initial, preferences: { ...DEFAULT_PREFERENCES, readingSize: "large" as const } };
  const second = { ...first, preferences: { ...first.preferences, motion: "reduced" as const } };
  let queued = false;
  session.subscribe(() => {
    if (!queued && session.getSnapshot().status === "saved") {
      queued = true;
      session.update(() => second);
    }
  });
  session.update(() => first);
  await tick();
  assert.deepEqual(writes, [first, second]);
  assert.equal(session.getSnapshot().snapshot, second);
  assert.equal(session.getSnapshot().status, "saved");
});

test("restore is exclusive, adopts only a completed transaction and retains state on failure", async () => {
  let release: () => void = () => {}; let fail = false;
  const target = { ...initial, preferences: { ...DEFAULT_PREFERENCES, readingSize: "large" as const } };
  const session = createJournalSession(initial, { read: async () => makeJournalDocument(initial, 0, stamp), write: async (value, revision) => makeJournalDocument(value, revision, stamp),
    restore: async (value, revision) => { await new Promise<void>((resolve) => { release = resolve; }); if (fail) throw new Error("Aborted"); return makeJournalDocument(value, revision, stamp); } });
  await session.load(); const pending = session.restore(target);
  assert.equal(session.getSnapshot().snapshot, initial); assert.equal(session.getSnapshot().status, "saving");
  session.update(() => target); await assert.rejects(session.restore(target), /Wait/);
  release(); await pending; assert.equal(session.getSnapshot().snapshot, target);
  fail = true; const failed = session.restore(initial); release(); await assert.rejects(failed, /Aborted/);
  assert.equal(session.getSnapshot().snapshot, target); assert.equal(session.getSnapshot().status, "error");
});
