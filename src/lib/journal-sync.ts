import { collectJournalImages, isJournalSnapshot, type JournalSnapshot } from "./journal-snapshot";
import { DEFAULT_PREFERENCES } from "./scrapbook";
import type { BookStyle } from "./journal-features";
import type { FutureSelfIdentityVersion } from "./domain";

/**
 * Cross-device journal sync for a signed-in account.
 *
 * The local IndexedDB document stays authoritative for saving; the account copy
 * is a bounded mirror of *saved* records only. Unfinished page/cover drafts,
 * playlists and the private onboarding draft stay device-local, exactly as they
 * do for an exported backup, so nothing unconsented travels with the journal.
 *
 * This projection is never read back into the model context builder: `/api/context`
 * keeps its own explicit-consent upload, and no photo, layout or cover reaches a provider.
 */

/**
 * One JSON document must fit inside the platform request/response budget with
 * room for the wrapper. Photographs are the bulk of a journal, so an oversized
 * journal is reported truthfully instead of being silently stripped of media.
 */
export const MAX_JOURNAL_SYNC_BYTES = 4_000_000;

/** Server document read back from `GET /api/journal` for one verified user. */
export interface JournalCloudDocument {
  revision: number;
  savedAt: string | null;
  document: JournalSnapshot | null;
}

export type JournalSyncStatus = "local" | "pulling" | "idle" | "syncing" | "synced" | "too-large" | "error";

export interface JournalSyncState {
  status: JournalSyncStatus;
  /** Set only for failures the reader can act on; never a raw upstream message. */
  message: string;
  lastSyncedAt: string;
}

/** User-facing status copy. "local" also covers a signed-out guest. */
export const JOURNAL_SYNC_COPY: Record<JournalSyncStatus, string> = {
  local: "Saved on this device only · sign in to sync across devices",
  pulling: "Checking your account journal…",
  idle: "Ready to sync with your account",
  syncing: "Syncing to your account…",
  synced: "Synced to your account · saved pages, covers and settings",
  "too-large": "Too large to sync · this journal stays on this device",
  error: "Account sync unavailable · saved on this device",
};

/** Structural comparison; key order and explicitly-undefined fields are irrelevant. */
export function sameJournal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => sameJournal(item, b[index]));
  }
  const left = a as Record<string, unknown>, right = b as Record<string, unknown>;
  const keysOf = (record: Record<string, unknown>) => Object.keys(record).filter((key) => record[key] !== undefined);
  const leftKeys = keysOf(left), rightKeys = keysOf(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => Object.hasOwn(right, key) && sameJournal(left[key], right[key]));
}

function empty(value: Readonly<Record<string, unknown>> | undefined): boolean {
  return !value || Object.keys(value).length === 0;
}

/** A device that holds no records has nothing of its own to protect from a merge. */
export function isBlankJournal(snapshot: JournalSnapshot): boolean {
  return snapshot.identityVersions.length === 0 && snapshot.moments.length === 0
    && (!snapshot.drafts || snapshot.drafts.length === 0)
    && empty(snapshot.books) && empty(snapshot.bookDrafts)
    && (!snapshot.playlists || snapshot.playlists.length === 0)
    && empty(snapshot.horizonReflections) && empty(snapshot.removals)
    && sameJournal(snapshot.preferences, DEFAULT_PREFERENCES);
}

/**
 * The account copy of a journal: saved pages, covers and settings only.
 * Returns `null` when the document would not validate or exceeds the sync budget,
 * so an oversized journal keeps every record on the device it already lives on.
 */
export function cloudJournalPayload(snapshot: JournalSnapshot): JournalSnapshot | null {
  const payload: JournalSnapshot = {
    version: 1,
    identityVersions: snapshot.identityVersions,
    moments: snapshot.moments,
    preferences: snapshot.preferences,
  };
  if (!empty(snapshot.books)) payload.books = snapshot.books;
  if (!empty(snapshot.horizonReflections)) payload.horizonReflections = snapshot.horizonReflections;
  if (!empty(snapshot.removals)) payload.removals = snapshot.removals;
  if (!isJournalSnapshot(payload)) return null;
  // Check the media first: a photo-heavy journal must not be stringified just to be rejected.
  const media = collectJournalImages(payload).reduce((total, source) => total + source.length, 0);
  if (media > MAX_JOURNAL_SYNC_BYTES) return null;
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_JOURNAL_SYNC_BYTES ? null : payload;
}

function mergeById<T extends { id: string }>(base: readonly T[], other: readonly T[]): T[] {
  const merged = [...base];
  const seen = new Set(merged.map((item) => item.id));
  for (const item of other) {
    if (seen.has(item.id)) continue;
    merged.push(item);
    seen.add(item.id);
  }
  return merged;
}

/** Two devices can each hold an active direction; the newer version supersedes the other. */
function singleActive(identities: readonly FutureSelfIdentityVersion[]): readonly FutureSelfIdentityVersion[] {
  const actives = identities.filter((identity) => identity.status === "active");
  if (actives.length <= 1) return identities;
  const kept = actives.reduce((winner, candidate) => (candidate.createdAt > winner.createdAt ? candidate : winner));
  return identities.map((identity) => identity.status === "active" && identity.id !== kept.id
    ? { ...identity, status: "past" as const } : identity);
}

/** A page removed by a merge can no longer sit in any reading order. */
function pruneOrders(snapshot: JournalSnapshot): JournalSnapshot {
  const ids = new Set(snapshot.moments.map((moment) => moment.id));
  const prune = <T extends { order: readonly string[] }>(collection: Readonly<Record<string, T>> | undefined) =>
    collection && Object.values(collection).some((book) => book.order.some((key) => !ids.has(key)))
      ? Object.fromEntries(Object.entries(collection).map(([year, book]) => [year, { ...book, order: book.order.filter((key) => ids.has(key)) }]))
      : collection;
  const books = prune(snapshot.books);
  const bookDrafts = prune(snapshot.bookDrafts);
  if (books === snapshot.books && bookDrafts === snapshot.bookDrafts) return snapshot;
  const next: JournalSnapshot = { ...snapshot };
  if (books !== snapshot.books && books) next.books = books;
  if (bookDrafts !== snapshot.bookDrafts && bookDrafts) next.bookDrafts = bookDrafts;
  return next;
}

/** Fields that never leave this device, so a merge must carry the local copy through. */
function keepDeviceLocal(base: JournalSnapshot, local: JournalSnapshot): JournalSnapshot {
  const merged: JournalSnapshot = { ...base };
  if (local.drafts !== undefined) merged.drafts = local.drafts;
  if (local.bookDrafts !== undefined) merged.bookDrafts = local.bookDrafts;
  if (local.playlists !== undefined) merged.playlists = local.playlists;
  if (local.onboardingDraft !== undefined) merged.onboardingDraft = local.onboardingDraft;
  return merged;
}

/**
 * Merge the account's saved journal with this device's records.
 *
 * A device that holds nothing adopts the account copy whole, so a fresh sign-in
 * loads the existing book instead of starting empty. Otherwise the document with
 * the later `savedAt` wins per record, and records the other side alone still
 * holds are kept — so two devices that edited different pages both keep their work.
 *
 * Deletions travel as tombstones: a page is dropped when the other side recorded
 * its removal *after* the document that still carries the page was saved, so a
 * stale device cannot resurrect a page another device removed. A page edited
 * after that removal survives, and the tombstone is retained to keep filtering
 * older copies.
 *
 * Returns `null` when there is nothing to change, so callers can skip a pointless write.
 */
export function mergeJournalCloud(
  local: { snapshot: JournalSnapshot; savedAt: string },
  remote: { snapshot: JournalSnapshot; savedAt: string | null },
): JournalSnapshot | null {
  if (!isJournalSnapshot(remote.snapshot) || isBlankJournal(remote.snapshot)) return null;

  const adopt = (source: JournalSnapshot): JournalSnapshot | null => {
    const merged = pruneOrders(keepDeviceLocal(source, local.snapshot));
    if (!isJournalSnapshot(merged)) return null;
    return sameJournal(merged, local.snapshot) ? null : merged;
  };
  if (isBlankJournal(local.snapshot)) return adopt(remote.snapshot);

  const remoteWins = String(remote.savedAt ?? "") > String(local.savedAt);
  const base = remoteWins ? remote.snapshot : local.snapshot;
  const other = remoteWins ? local.snapshot : remote.snapshot;
  const baseStamp = String((remoteWins ? remote.savedAt : local.savedAt) ?? "");
  const otherStamp = String((remoteWins ? local.savedAt : remote.savedAt) ?? "");

  const identities = singleActive(mergeById(base.identityVersions, other.identityVersions));

  const tombstones: Record<string, string> = { ...(other.removals ?? {}) };
  for (const [key, stamp] of Object.entries(base.removals ?? {})) {
    if (!(key in tombstones) || stamp > tombstones[key]) tombstones[key] = stamp;
  }
  const removedAfter = (id: string, documentStamp: string) => {
    const stamp = tombstones[id];
    return stamp !== undefined && String(stamp) > documentStamp;
  };
  const moments = base.moments.filter((moment) => !removedAfter(moment.id, baseStamp));
  const present = new Set(moments.map((moment) => moment.id));
  for (const moment of other.moments) {
    if (present.has(moment.id) || removedAfter(moment.id, otherStamp)) continue;
    moments.push(moment);
    present.add(moment.id);
  }
  const books: Record<string, BookStyle> = { ...(base.books ?? {}) };
  for (const [year, book] of Object.entries(other.books ?? {})) if (!Object.hasOwn(books, year)) books[year] = book;
  const reflections: Record<string, { choice: string; recordedAt: string }> = { ...(base.horizonReflections ?? {}) };
  for (const [id, reflection] of Object.entries(other.horizonReflections ?? {})) if (!Object.hasOwn(reflections, id)) reflections[id] = reflection;

  const merged = pruneOrders(keepDeviceLocal({
    version: 1,
    identityVersions: identities,
    moments,
    preferences: base.preferences,
    ...(Object.keys(books).length ? { books } : {}),
    ...(Object.keys(reflections).length ? { horizonReflections: reflections } : {}),
    ...(Object.keys(tombstones).length ? { removals: tombstones } : {}),
  }, local.snapshot));
  if (!isJournalSnapshot(merged)) {
    const fallback = pruneOrders(keepDeviceLocal(base, local.snapshot));
    return isJournalSnapshot(fallback) ? (sameJournal(fallback, local.snapshot) ? null : fallback) : null;
  }
  return sameJournal(merged, local.snapshot) ? null : merged;
}
