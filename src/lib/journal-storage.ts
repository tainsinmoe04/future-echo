/** Browser-local storage only. No network, provider context, or automatic initialization. */
export interface StoredJournalDocument<T> {
  format: "future-echo-local";
  version: 1;
  revision: number;
  savedAt: string;
  value: T;
}

export class JournalStorageError extends Error {
  constructor(public readonly code: "unavailable" | "blocked" | "invalid" | "conflict" | "write-failed", message: string) {
    super(message);
    this.name = "JournalStorageError";
  }
}

export function isStoredJournalDocument(value: unknown): value is StoredJournalDocument<unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.format === "future-echo-local" && record.version === 1
    && typeof record.revision === "number" && Number.isSafeInteger(record.revision) && record.revision > 0
    && typeof record.savedAt === "string" && /^\d{4}-\d{2}-\d{2}T/.test(record.savedAt)
    && Number.isFinite(Date.parse(record.savedAt)) && Object.hasOwn(record, "value");
}

export function makeJournalDocument<T>(value: T, expectedRevision: number, savedAt: string): StoredJournalDocument<T> {
  const document: StoredJournalDocument<T> = { format: "future-echo-local", version: 1, revision: expectedRevision + 1, savedAt, value };
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || !isStoredJournalDocument(document)) {
    throw new JournalStorageError("invalid", "The local document revision or timestamp is invalid.");
  }
  return document;
}

const DATABASE = "future-echo-journal-v1";
const STORE = "documents";
const KEY = "journal";
const RECOVERY_KEY = "before-last-restore";

/** Injectable database name isolates browser QA from real local records. */
export function createJournalStorage(databaseName = DATABASE) {
  function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new JournalStorageError("unavailable", "Local storage is unavailable in this environment."));
        return;
      }
      let settled = false;
      let request: IDBOpenDBRequest;
      const fail = (error: Error) => { if (!settled) { settled = true; reject(error); } };
      try { request = indexedDB.open(databaseName, 1); }
      catch { fail(new JournalStorageError("unavailable", "This browser did not allow local storage.")); return; }
      request.onupgradeneeded = () => {
        if (settled) { request.transaction?.abort(); return; }
        request.result.createObjectStore(STORE);
      };
      request.onerror = () => fail(new JournalStorageError("unavailable", "Local storage could not be opened. Existing records were not replaced."));
      request.onblocked = () => fail(new JournalStorageError("blocked", "Close other Future Echo tabs before retrying local storage."));
      request.onsuccess = () => {
        const database = request.result;
        if (settled) { database.close(); return; }
        settled = true;
        database.onversionchange = () => database.close();
        resolve(database);
      };
    });
  }

  async function readRecord<T>(key: string, validate: (value: unknown) => value is T): Promise<StoredJournalDocument<T> | null> {
    const database = await open();
    try {
      return await new Promise<StoredJournalDocument<T> | null>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readonly");
        const request = transaction.objectStore(STORE).get(key);
        let result: StoredJournalDocument<T> | null = null;
        let error: Error | undefined;
        request.onsuccess = () => {
          const record: unknown = request.result;
          if (record === undefined) return;
          try {
            if (!isStoredJournalDocument(record) || !validate(record.value)) {
              throw new JournalStorageError("invalid", "The saved journal format is not supported. The original record has been left untouched.");
            }
            result = record as StoredJournalDocument<T>;
          } catch (cause) {
            error = cause instanceof Error ? cause : new JournalStorageError("invalid", "The saved journal could not be validated.");
            transaction.abort();
          }
        };
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(error ?? new JournalStorageError("unavailable", "The local journal could not be read."));
        transaction.onerror = () => { /* onabort reports the terminal failure. */ };
      });
    } finally { database.close(); }
  }

  /** Compare-and-swap in one transaction: stale tabs may not silently overwrite newer data. */
  async function writeDocument<T>(value: T, expectedRevision: number, validate: (value: unknown) => value is T, preserveCurrent: boolean): Promise<StoredJournalDocument<T>> {
    if (!validate(value)) throw new JournalStorageError("invalid", "The journal was not saved because its data is invalid.");
    // Clone before waiting for the database, so callers cannot mutate a pending write.
    const document = makeJournalDocument(structuredClone(value), expectedRevision, new Date().toISOString());
    const database = await open();
    try {
      return await new Promise<StoredJournalDocument<T>>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        const request = store.get(KEY);
        let error: Error | undefined;
        request.onsuccess = () => {
          const current: unknown = request.result;
          try {
            if (current !== undefined && (!isStoredJournalDocument(current) || !validate(current.value))) {
              throw new JournalStorageError("invalid", "Existing local data is not supported and was not overwritten.");
            }
            const revision = current === undefined ? 0 : (current as StoredJournalDocument<T>).revision;
            if (revision !== expectedRevision) {
              throw new JournalStorageError("conflict", "Another tab saved a newer journal. Reload or export your changes before continuing.");
            }
            if (!preserveCurrent) { store.put(document, KEY); return; }
            if (current === undefined) {
              throw new JournalStorageError("invalid", "Save the current journal before restoring a backup so a recovery copy can be kept.");
            }
            const recovery = store.get(RECOVERY_KEY);
            recovery.onsuccess = () => {
              try {
                const previous: unknown = recovery.result;
                if (previous !== undefined && (!isStoredJournalDocument(previous) || !validate(previous.value))) {
                  throw new JournalStorageError("invalid", "An existing recovery copy is unsupported. Nothing was replaced.");
                }
                // Both puts share this transaction. If either fails, neither is committed.
                store.put(current, RECOVERY_KEY);
                store.put(document, KEY);
              } catch (cause) {
                error = cause instanceof Error ? cause : new JournalStorageError("write-failed", "The recovery copy could not be saved.");
                transaction.abort();
              }
            };
          } catch (cause) {
            error = cause instanceof Error ? cause : new JournalStorageError("write-failed", "The journal could not be saved.");
            transaction.abort();
          }
        };
        transaction.oncomplete = () => resolve(document);
        transaction.onabort = () => reject(error ?? new JournalStorageError("write-failed", "The journal was not saved. Browser storage may be full or unavailable. Keep this tab open and export a backup."));
        transaction.onerror = () => { /* Quota/request failures abort atomically; no success is reported early. */ };
      });
    } finally { database.close(); }
  }

  return {
    deleteRecovery: async (expectedRevision: number): Promise<void> => {
      const database = await open();
      try { await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite"), store = transaction.objectStore(STORE);
        let error: Error | undefined;
        const request = store.get(KEY);
        request.onsuccess = () => {
          if (!isStoredJournalDocument(request.result) || request.result.revision !== expectedRevision) { error = new JournalStorageError("conflict", "Another tab changed the journal. Reload before deleting recovery."); transaction.abort(); return; }
          store.delete(RECOVERY_KEY);
        };
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(error ?? new JournalStorageError("write-failed", "The recovery copy could not be deleted."));
        transaction.onerror = () => {};
      }); } finally { database.close(); }
    },
    read: <T>(validate: (value: unknown) => value is T) => readRecord(KEY, validate),
    readRecovery: <T>(validate: (value: unknown) => value is T) => readRecord(RECOVERY_KEY, validate),
    write: <T>(value: T, revision: number, validate: (value: unknown) => value is T) => writeDocument(value, revision, validate, false),
    /** Call only after explicit user confirmation. Retains one pre-restore copy until the next confirmed restore. */
    restore: <T>(value: T, revision: number, validate: (value: unknown) => value is T) => writeDocument(value, revision, validate, true),
  };
}
