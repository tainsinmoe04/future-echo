"use client";
import { useState } from "react";
import { useMockProductState } from "@/components/mock-product-state";
import type { JourneyMoment } from "@/lib/domain";
import { isPreviewExample } from "@/lib/mock-messenger";
import { momentDay } from "@/lib/local-date";
import { MAX_NOTE_LENGTH } from "@/lib/redaction";
import { BackIcon, MoreIcon } from "./icons";
import { MomentEditor } from "./moment-editor";
import { MomentPaper } from "./moment-paper";
import { JournalStorageStatus } from "./journal-storage-status";

export function MemoryBook({ moment, entries, onSelect, onClose }: {
  moment: JourneyMoment; entries: readonly JourneyMoment[];
  onSelect: (id: string) => void; onClose: () => void;
}) {
  const { identityVersions, saveJourneyMoment, deleteMoment, setMomentConsent } = useMockProductState();
  const [editing, setEditing] = useState(false);
  const [controls, setControls] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reflection, setReflection] = useState(moment.reflection ?? "");
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [hideStickers, setHideStickers] = useState(false);
  const [plainReading, setPlainReading] = useState(false);
  const identity = identityVersions.find((item) => item.id === moment.identityVersionId);
  const index = entries.findIndex((item) => item.id === moment.id);
  const [openedAt] = useState(() => Date.now());
  const readyToRevisit = openedAt >= Date.parse(moment.revisitAt);
  if (editing) return <MomentEditor moment={moment} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />;

  return <section className="echo-book-view">
    <header className="echo-space-header"><button className="echo-icon-button" aria-label="Back to Your Space" onClick={onClose}><BackIcon /></button><h2>{momentDay(moment).slice(0, 4)} / My book</h2><button className="echo-icon-button" aria-label="Record details and controls" aria-expanded={controls} onClick={() => setControls(!controls)}><MoreIcon /></button></header>
    <div className="echo-book-scroll">
      {isPreviewExample(moment) && <p className="echo-muted">Example from an earlier preview, not your personal history. Kept unchanged so no local pages are removed without your choice.</p>}
      {Boolean(moment.stickerPlacements?.length ?? moment.stickers?.length) && <div className="echo-page-view-controls"><button className="echo-text-button" aria-pressed={hideStickers} onClick={() => setHideStickers(!hideStickers)}>{hideStickers ? "Show stickers" : "Hide stickers to read"}</button></div>}
      {moment.pageTransforms && <button className="echo-text-button" aria-pressed={plainReading} onClick={() => setPlainReading(!plainReading)}>{plainReading ? "Show my layout" : "Read without layout"}</button>}
      <MomentPaper moment={plainReading ? { ...moment, pageTransforms: undefined } : moment} placements={hideStickers || plainReading ? [] : undefined} />
      {controls && <section className="echo-record-controls" aria-label="Record controls">
        <h2>Kept with its original context</h2>
        <fieldset className="echo-consent"><legend>Memory permission · change anytime</legend><label><input type="checkbox" checked={moment.consent.useInAiContext} onChange={(e) => setMomentConsent(moment.id, e.target.checked, moment.consent.includeMyNoteInAiContext)} />Allow saved words in future AI context</label><label><input type="checkbox" disabled={!moment.consent.useInAiContext || !moment.myNote?.trim()} checked={moment.consent.includeMyNoteInAiContext} onChange={(e) => setMomentConsent(moment.id, moment.consent.useInAiContext, e.target.checked)} />Also allow My Note</label><p>Only up to the first 2,000 characters of a long page and first 500 of a permitted note can enter model context. Turning permission off does not delete your moment or recall text already sent.</p></fieldset>
        <p>Future Self v{identity?.version ?? "—"} · {identity?.horizon.label ?? "Original horizon"}{identity?.status === "past" ? " · Past direction" : ""}</p>
        <p>Saved words: {moment.consent.useInAiContext ? "allowed in future AI context" : "not shared as AI context"}. My Note: {moment.consent.includeMyNoteInAiContext ? "allowed" : "not shared"}. Photos, stickers, and interpretations never enter model context.</p>
        {moment.aiInterpretation && <div className="echo-interpretation"><h3>AI interpretation · frozen</h3><p>{moment.aiInterpretation}</p><button className="echo-text-button" onClick={() => saveJourneyMoment({ ...moment, aiInterpretation: undefined })}>Remove AI interpretation</button></div>}
        {!deleting ? <button className="echo-text-button danger" onClick={() => setDeleting(true)}>Delete saved moment</button> : <div role="group" aria-label="Confirm deletion"><p>Delete this moment, its photos, and its star?</p><div className="echo-form-actions"><button className="echo-button outline" onClick={() => setDeleting(false)}>Keep it</button><button className="echo-button danger" onClick={() => { deleteMoment(moment.id); onClose(); }}>Delete moment</button></div></div>}
      </section>}
      {readyToRevisit && <section className="echo-revisit"><h2>What feels clearer now than it did then?</h2><p>A thought, a different feeling, or nothing yet. There is no result to prove.</p><label className="sr-only" htmlFor="moment-reflection">Your reflection</label><textarea id="moment-reflection" value={reflection} maxLength={MAX_NOTE_LENGTH} onChange={(event) => { setReflection(event.target.value); setReflectionSaved(false); }} placeholder="A thought from where you are now…" rows={3} /><div className="echo-form-actions"><button className="echo-text-button" onClick={onClose}>Not now</button><button className="echo-button outline" disabled={!reflection.trim()} onClick={() => { saveJourneyMoment({ ...moment, reflection: reflection.trim() }); setReflectionSaved(true); }}>Keep reflection</button></div>{reflectionSaved && <p role="status">Your reflection is kept separately from the original moment.</p>}</section>}
      <JournalStorageStatus />
    </div>
    <footer className="echo-book-footer"><button className="echo-icon-button" aria-label="Previous moment" disabled={index <= 0} onClick={() => onSelect(entries[index - 1].id)}><BackIcon /></button><button className="echo-button white" onClick={() => setEditing(true)}>Photo, sticker & note</button><button className="echo-icon-button" aria-label="Next moment" disabled={index >= entries.length - 1} onClick={() => onSelect(entries[index + 1].id)}><BackIcon className="turn-around" /></button></footer>
  </section>;
}
