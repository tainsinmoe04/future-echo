import { isJournalSnapshot, type JournalSnapshot } from "./journal-snapshot";

export const MAX_BACKUP_BYTES = 40 * 1024 * 1024;
export interface JournalBackup {
  format: "future-echo-backup";
  version: 1;
  exportedAt: string;
  snapshot: JournalSnapshot;
}

export class JournalBackupError extends Error {
  constructor(public readonly code: "too-large" | "invalid" | "read-failed", message: string) {
    super(message);
    this.name = "JournalBackupError";
  }
}

/** Pure validation only: parsing never writes storage or replaces current records. */
export function parseJournalBackup(source: string): JournalBackup {
  if (source.length > MAX_BACKUP_BYTES || new TextEncoder().encode(source).byteLength > MAX_BACKUP_BYTES) {
    throw new JournalBackupError("too-large", "Choose a backup no larger than 40 MiB.");
  }
  let value: unknown;
  try { value = JSON.parse(source); }
  catch { throw new JournalBackupError("invalid", "This file is not valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new JournalBackupError("invalid", "This is not a Future Echo backup.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 4 || !Object.keys(record).every((key) => ["format", "version", "exportedAt", "snapshot"].includes(key))
    || record.format !== "future-echo-backup" || record.version !== 1
    || typeof record.exportedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(record.exportedAt)
    || !Number.isFinite(Date.parse(record.exportedAt)) || new Date(record.exportedAt).toISOString() !== record.exportedAt
    || !isJournalSnapshot(record.snapshot)) {
    throw new JournalBackupError("invalid", "This backup is unsupported or contains invalid records. Nothing has been changed.");
  }
  return { format: "future-echo-backup", version: 1, exportedAt: record.exportedAt, snapshot: record.snapshot };
}

/** Check the browser file's byte size BEFORE allocating its text or parsing JSON. */
export async function readJournalBackup(file: Pick<Blob, "size" | "text">): Promise<JournalBackup> {
  if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_BACKUP_BYTES) {
    throw new JournalBackupError("too-large", "Choose a backup no larger than 40 MiB.");
  }
  let source: string;
  try { source = await file.text(); }
  catch { throw new JournalBackupError("read-failed", "The backup could not be read. Your current records have not changed."); }
  return parseJournalBackup(source);
}

/** Unencrypted local JSON; callers must disclose that before offering a download. */
export function serializeJournalBackup(snapshot: JournalSnapshot, exportedAt = new Date().toISOString()): string {
  if (!isJournalSnapshot(snapshot)) throw new JournalBackupError("invalid", "The current records cannot be exported safely.");
  const source = JSON.stringify({ format: "future-echo-backup", version: 1, exportedAt, snapshot: { ...snapshot, drafts: undefined, bookDrafts: undefined, onboardingDraft: undefined } });
  parseJournalBackup(source);
  return source;
}
