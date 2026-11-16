import assert from "node:assert/strict";
import test from "node:test";
import {
  cloudJournalPayload, isBlankJournal, JOURNAL_SYNC_COPY, mergeJournalCloud, sameJournal,
  MAX_JOURNAL_SYNC_BYTES, type JournalSyncStatus,
} from "../src/lib/journal-sync";
import { isJournalSnapshot, type JournalSnapshot } from "../src/lib/journal-snapshot";
import { activeIdentityVersion, pastIdentityVersion } from "../src/lib/mock-data";
import { sampleMoments } from "../src/lib/mock-messenger";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";
import type { BookStyle } from "../src/lib/journal-features";

const fixture = (): JournalSnapshot => structuredClone({
  version: 1, identityVersions: [pastIdentityVersion, activeIdentityVersion],
  moments: sampleMoments, preferences: DEFAULT_PREFERENCES,
});
const book = (order: string[]): BookStyle => ({ title: "Little things", subtitle: "2026", theme: "butter", noteFont: "book", placements: [], transforms: {}, order });
const statuses: JournalSyncStatus[] = ["local", "pulling", "idle", "syncing", "synced", "too-large", "error"];

test("every sync status has truthful user-facing copy", () => {
  for (const status of statuses) assert.equal(typeof JOURNAL_SYNC_COPY[status], "string");
  assert.deepEqual(Object.keys(JOURNAL_SYNC_COPY).toSorted(), statuses.toSorted());
  assert.match(JOURNAL_SYNC_COPY.local, /sign in to sync/);
  assert.doesNotMatch(JOURNAL_SYNC_COPY.synced, /encrypted|E2EE|backup/i);
});

test("structural comparison ignores key order and undefined fields", () => {
  assert.equal(sameJournal({ a: 1, b: undefined }, { b: 1, a: 1 }), false);
  assert.equal(sameJournal({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }), true);
  assert.equal(sameJournal(null, null), true);
});

test("only saved records reach the account; drafts, playlists and setup stay local", () => {
  const source: JournalSnapshot = { ...fixture(),
    drafts: [{ id: "draft", updatedAt: "2026-11-16T10:00:00.000Z", value: { ...sampleMoments[0], originalExcerpt: "unfinished" } }],
    playlists: [], onboardingDraft: { definition: "d", reason: "r", anchor: "a", months: 12, custom: "", step: 1, updatedAt: "2026-11-16T10:00:00.000Z" },
    removals: { "moment-exam": "2026-11-16T10:00:00.000Z" },
  };
  const payload = cloudJournalPayload(source);
  assert.ok(payload);
  assert.equal(isJournalSnapshot(payload), true);
  assert.equal(payload.drafts, undefined);
  assert.equal(payload.playlists, undefined);
  assert.equal(payload.onboardingDraft, undefined);
  assert.equal(payload.removals?.["moment-exam"], "2026-11-16T10:00:00.000Z");
  assert.equal(payload.moments.length, source.moments.length);
});

test("an oversized journal is refused instead of silently losing its photographs", () => {
  const png = "\x89PNG\r\n\x1a\n" + "\0".repeat(1_100_000);
  const src = `data:image/png;base64,${btoa(png)}`;
  const photo = (id: string) => ({ id, src, caption: "" });
  const heavy = { ...fixture(), moments: [{ ...sampleMoments[0], photos: [photo("a"), photo("b"), photo("c"), photo("d")] }] };
  assert.equal(isJournalSnapshot(heavy), true);
  assert.equal(cloudJournalPayload(heavy), null);
  const light = { ...fixture(), moments: [{ ...sampleMoments[0], photos: [photo("a")] }] };
  assert.ok(cloudJournalPayload(light));
  assert.ok(MAX_JOURNAL_SYNC_BYTES > 0);
});

test("a device with nothing adopts the account document but keeps its own drafts", () => {
  const remote = fixture();
  const local: JournalSnapshot = { ...structuredClone({ version: 1, identityVersions: [], moments: [], preferences: DEFAULT_PREFERENCES }),
    drafts: [{ id: "draft", updatedAt: "2026-11-16T10:00:00.000Z", value: { ...sampleMoments[0], identityVersionId: activeIdentityVersion.id, originalExcerpt: "unfinished" } }] };
  assert.equal(isBlankJournal({ ...structuredClone({ version: 1, identityVersions: [], moments: [], preferences: DEFAULT_PREFERENCES }) }), true);
  const merged = mergeJournalCloud({ snapshot: local, savedAt: "2026-11-16T09:00:00.000Z" },
    { snapshot: remote, savedAt: "2026-11-16T10:00:00.000Z" });
  assert.ok(merged);
  assert.equal(isJournalSnapshot(merged), true);
  assert.equal(merged.moments.length, remote.moments.length);
  assert.equal(merged.drafts?.[0]?.id, "draft");
});

test("two devices that edited different pages both keep their work", () => {
  const base = fixture();
  const extra = { ...base, moments: [...base.moments, { ...sampleMoments[0], id: "moment-only-local", originalExcerpt: "Written here." }] };
  // The device without the new page adopts it; the device that already holds it
  // has nothing to write.
  const merged = mergeJournalCloud({ snapshot: base, savedAt: "2026-11-16T10:00:00.000Z" },
    { snapshot: extra, savedAt: "2026-11-16T10:05:00.000Z" });
  assert.ok(merged);
  assert.equal(isJournalSnapshot(merged), true);
  assert.equal(merged.moments.length, extra.moments.length);
  assert.equal(mergeJournalCloud({ snapshot: extra, savedAt: "2026-11-16T10:05:00.000Z" },
    { snapshot: base, savedAt: "2026-11-16T10:00:00.000Z" }), null);
});

test("the later document wins a shared record and a blank account copy never wipes local work", () => {
  const older = { ...fixture(), preferences: { ...DEFAULT_PREFERENCES, readingSize: "large" as const } };
  const newer = { ...fixture(), preferences: { ...DEFAULT_PREFERENCES, motion: "reduced" as const } };
  const merged = mergeJournalCloud({ snapshot: older, savedAt: "2026-11-16T10:00:00.000Z" },
    { snapshot: newer, savedAt: "2026-11-16T11:00:00.000Z" });
  assert.ok(merged);
  assert.equal(merged.preferences.motion, "reduced");
  // A stale local copy of the same document needs no write of its own.
  assert.equal(mergeJournalCloud({ snapshot: newer, savedAt: "2026-11-16T11:00:00.000Z" },
    { snapshot: older, savedAt: "2026-11-16T10:00:00.000Z" }), null);
  assert.equal(mergeJournalCloud({ snapshot: newer, savedAt: "2026-11-16T11:00:00.000Z" },
    { snapshot: { ...structuredClone({ version: 1, identityVersions: [], moments: [], preferences: DEFAULT_PREFERENCES }) }, savedAt: "2026-11-16T12:00:00.000Z" }), null);
});

test("a deletion recorded after another device's save removes that page everywhere", () => {
  const source = fixture();
  const older: JournalSnapshot = { ...source, moments: source.moments.filter((m) => m.id !== "moment-exam") };
  const deleting: JournalSnapshot = { ...source, moments: source.moments.filter((m) => m.id !== "moment-exam"),
    removals: { "moment-exam": "2026-11-16T10:00:00.000Z" } };
  // The stale device still carries the page and last saved before the deletion.
  const merged = mergeJournalCloud({ snapshot: source, savedAt: "2026-11-16T09:30:00.000Z" },
    { snapshot: deleting, savedAt: "2026-11-16T10:00:00.000Z" });
  assert.ok(merged);
  assert.equal(isJournalSnapshot(merged), true);
  assert.equal(merged.moments.some((m) => m.id === "moment-exam"), false);
  assert.equal(merged.removals?.["moment-exam"], "2026-11-16T10:00:00.000Z");
  assert.equal(older.moments.some((m) => m.id === "moment-exam"), false);
});

test("a page saved after the deletion survives, and its reading order stays valid", () => {
  const source = fixture();
  const withBook: JournalSnapshot = { ...source, books: { "2026": book(source.moments.map((m) => m.id)) } };
  const deleting: JournalSnapshot = { ...source, moments: source.moments.filter((m) => m.id !== "moment-exam"),
    removals: { "moment-exam": "2026-11-16T10:00:00.000Z" } };
  const merged = mergeJournalCloud({ snapshot: withBook, savedAt: "2026-11-16T10:30:00.000Z" },
    { snapshot: deleting, savedAt: "2026-11-16T10:00:00.000Z" });
  assert.ok(merged);
  assert.equal(isJournalSnapshot(merged), true);
  assert.equal(merged.moments.some((m) => m.id === "moment-exam"), true);
  assert.equal(merged.books?.["2026"].order.includes("moment-exam"), true);

  // The same deletion does reach an older copy of the book.
  const stale = mergeJournalCloud({ snapshot: withBook, savedAt: "2026-11-16T09:00:00.000Z" },
    { snapshot: deleting, savedAt: "2026-11-16T10:00:00.000Z" });
  assert.ok(stale);
  assert.equal(isJournalSnapshot(stale), true);
  assert.equal(stale.moments.some((m) => m.id === "moment-exam"), false);
  assert.equal(stale.books?.["2026"].order.includes("moment-exam"), false);
});
