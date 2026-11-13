"use client";
import { useEffect, useRef, useState } from "react";
import { useJournalState } from "@/components/mock-product-state";
import { readJournalBackup, serializeJournalBackup } from "@/lib/journal-backup";
import { validateJournalMedia } from "@/lib/journal-media";
import type { JournalSnapshot } from "@/lib/journal-snapshot";

function download(source: string, suffix = "") {
  const url = URL.createObjectURL(new Blob([source], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `future-echo${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function JournalStorageStatus({ backup = false }: { backup?: boolean }) {
  const { storageStatus, storageError, retryStorage, exportJournal, restoreJournal, readRecovery, deleteRecovery } = useJournalState();
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [candidate, setCandidate] = useState<JournalSnapshot | null>(null);
  const [recovery, setRecovery] = useState<JournalSnapshot | null>(null);
  const [busy, setBusy] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => { if (backup) void readRecovery().then(setRecovery).catch((e) => setError(e.message)); }, [backup, readRecovery]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(""); setNotice(""); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "The journal could not be updated."); } finally { setBusy(false); } };
  return <section className="echo-local-storage" aria-label="Local journal storage">
    <p role="status" className={`journal-save-line ${storageStatus === "error" ? "has-error" : ""}`}><span aria-hidden="true">{storageStatus === "saved" ? "●" : "○"}</span><span>{storageStatus === "saved" ? "Saved on this device" : storageStatus === "error" ? "Not saved — keep this tab open" : "Saving on this device…"}</span></p>
    {storageError && <p role="alert">{storageError}</p>}{storageStatus === "error" && <button className="echo-text-button" onClick={retryStorage}>Retry saving</button>}
    {(backup || storageStatus === "error") && <>
      <div className="journal-backup-actions"><button className="echo-button butter" disabled={busy} onClick={() => { try { download(exportJournal()); setNotice("Backup downloaded. Keep it somewhere private."); } catch (e) { setError((e as Error).message); } }}>Download backup</button>{backup && <button className="echo-button outline" disabled={busy || storageStatus !== "saved"} onClick={() => file.current?.click()}>Import backup</button>}</div>
      <p>Unencrypted JSON · saved pages, covers and preferences. Conversations and unfinished drafts are excluded.</p>
      <input type="file" ref={file} accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Import journal backup" onChange={(event) => { const selected = event.target.files?.[0]; event.target.value = ""; if (!selected) return; setCandidate(null); void run(async () => { const parsed = await readJournalBackup(selected); await validateJournalMedia(parsed.snapshot); setCandidate({ ...parsed.snapshot, drafts: undefined }); }); }} />
      {candidate && <div className="journal-confirm" role="group" aria-label="Restore preview"><h3>Replace this journal?</h3><p>{candidate.moments.length} saved moments · {Object.keys(candidate.books ?? {}).length} personalized covers · {candidate.identityVersions.length} direction versions.</p><p>This replaces local pages, settings and drafts. The current journal is kept as one recovery copy until you delete it or restore again. Permissions from the file are retained. Download your current backup first if you want a separate copy.</p><div className="echo-form-actions"><button className="echo-button outline" disabled={busy} onClick={() => setCandidate(null)}>Cancel restore</button><button className="echo-button lilac" disabled={busy || storageStatus !== "saved"} onClick={() => void run(async () => { await restoreJournal(candidate); setCandidate(null); setRecovery(await readRecovery()); setNotice("Journal restored. Your previous journal is available below."); })}>{busy ? "Restoring…" : "Replace with this backup"}</button></div></div>}
      {recovery && <details className="journal-recovery"><summary>Previous journal recovery copy</summary><p>A local copy from before your last restore, including drafts. Normal saves keep it. Deleting a page does not delete it from this copy. A new restore replaces it.</p><div className="journal-backup-actions"><button className="echo-button outline" disabled={busy} onClick={() => download(serializeJournalBackup(recovery), "-recovery")}>Download recovery</button><button className="echo-button outline" disabled={busy} onClick={() => void run(async () => { await validateJournalMedia(recovery); setCandidate(recovery); })}>Preview recovery</button><button className="echo-text-button danger" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete recovery copy</button></div>{confirmDelete && <div className="journal-confirm"><p>Delete only the recovery copy? Your current journal stays.</p><button className="echo-button danger" disabled={busy || storageStatus !== "saved"} onClick={() => void run(async () => { await deleteRecovery(); setRecovery(null); setConfirmDelete(false); setNotice("Recovery copy deleted."); })}>Confirm delete recovery</button><button className="echo-text-button" onClick={() => setConfirmDelete(false)}>Keep recovery</button></div>}</details>}
    </>}
    {busy && <p role="status">Checking your journal…</p>}{notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
