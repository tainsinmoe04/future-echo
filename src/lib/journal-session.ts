import { isJournalSnapshot, type JournalSnapshot } from "./journal-snapshot";
import { createJournalStorage, type StoredJournalDocument } from "./journal-storage";

interface JournalPersistence {
  restore?: (value: JournalSnapshot, revision: number, validate: typeof isJournalSnapshot) => Promise<StoredJournalDocument<JournalSnapshot>>;
  readRecovery?: (validate: typeof isJournalSnapshot) => Promise<StoredJournalDocument<JournalSnapshot> | null>;
  deleteRecovery?: (revision: number) => Promise<void>;
  read: (validate: typeof isJournalSnapshot) => Promise<StoredJournalDocument<JournalSnapshot> | null>;
  write: (value: JournalSnapshot, revision: number, validate: typeof isJournalSnapshot) => Promise<StoredJournalDocument<JournalSnapshot>>;
}
export interface JournalSessionState {
  snapshot: JournalSnapshot;
  /** Stamp of the stored document; cloud sync compares it to decide which side wins a merge. */
  savedAt: string;
  ready: boolean;
  status: "loading" | "saving" | "saved" | "error";
  error: string;
}

/** One tab's serialized save queue. Never retries conflicts with a newer revision. */
export function createJournalSession(initial: JournalSnapshot, storage: JournalPersistence = createJournalStorage()) {
  let state: JournalSessionState = { snapshot: initial, savedAt: "", ready: false, status: "loading", error: "" };
  let revision = 0;
  let stamp = "";
  let loading: Promise<void> | undefined;
  let writing = false;
  let pending: JournalSnapshot | null = null;
  let restoring = false;
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<JournalSessionState>) => { state = { ...state, ...patch }; listeners.forEach((listener) => listener()); };
  const fail = (error: unknown) => publish({ status: "error", error: error instanceof Error ? error.message : "Local saving failed. Keep this tab open and export your journal." });

  async function flush() {
    if (writing || restoring || !state.ready || state.status === "error") return;
    writing = true;
    try {
      while (pending) {
        const value = pending;
        pending = null;
        publish({ status: "saving", error: "" });
        try { const written = await storage.write(value, revision, isJournalSnapshot); revision = written.revision; stamp = written.savedAt; }
        catch (error) { pending = state.snapshot; fail(error); return; }
      }
    } finally { writing = false; }
    // Release the queue lock before notifying subscribers. A subscriber may
    // synchronously enqueue another edit in response to the saved state.
    publish({ status: "saved", savedAt: stamp });
  }

  const load = () => {
    if (state.ready) return Promise.resolve();
    if (loading) return loading;
    publish({ status: "loading", error: "" });
    loading = (async () => {
      try {
        const stored = await storage.read(isJournalSnapshot);
        // Only a confirmed empty store may receive the existing demo seed.
        const document = stored ?? await storage.write(initial, 0, isJournalSnapshot);
        revision = document.revision;
        stamp = document.savedAt;
        publish({ snapshot: document.value, savedAt: stamp, ready: true, status: "saved", error: "" });
      } catch (error) { fail(error); }
      finally { loading = undefined; }
    })();
    return loading;
  };
  return {
    readRecovery: async () => (await storage.readRecovery?.(isJournalSnapshot))?.value ?? null,
    deleteRecovery: async () => { if (state.status !== "saved" || restoring) throw new Error("Wait until your journal is saved."); await storage.deleteRecovery?.(revision); },
    restore: async (snapshot: JournalSnapshot) => {
      if (!state.ready || state.status !== "saved" || writing || restoring || pending) throw new Error("Wait until your current journal is saved before restoring.");
      if (!storage.restore || !isJournalSnapshot(snapshot)) throw new Error("This backup cannot be restored.");
      restoring = true;
      publish({ status: "saving", error: "" });
      try {
        const document = await storage.restore(snapshot, revision, isJournalSnapshot);
        revision = document.revision;
        stamp = document.savedAt;
        publish({ snapshot: document.value, savedAt: stamp, status: "saved", error: "" });
      } catch (error) { fail(error); throw error; }
      finally { restoring = false; }
    },
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    update: (change: (current: JournalSnapshot) => JournalSnapshot) => {
      if (!state.ready || restoring) return;
      const next = change(state.snapshot);
      if (next === state.snapshot) return;
      pending = next;
      publish({ snapshot: next, status: state.status === "error" ? "error" : "saving" });
      void flush();
    },
    retry: () => {
      if (!state.ready) { void load(); return; }
      if (writing || restoring) return;
      pending = state.snapshot;
      publish({ status: "saving", error: "" });
      void flush();
    },
  };
}
