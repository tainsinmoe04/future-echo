"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useMockProductState } from "@/components/mock-product-state";
import { EchoDialog } from "@/components/echo/dialog";
import { BackIcon, CloseIcon } from "@/components/echo/icons";
import { JournalStorageStatus } from "@/components/echo/journal-storage-status";
import type { FutureSelfIdentityVersion } from "@/lib/domain";
import { localDate, localMonth } from "@/lib/local-date";
import { HORIZON_CHOICES } from "@/lib/journal-tools";
import { addMonths, formatHorizonLabel, horizonMonthsAhead } from "@/lib/moment-lifecycle";
import { MAX_IDENTITY_LENGTH } from "@/lib/redaction";

const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const horizonChoices = HORIZON_CHOICES;

export default function FutureSelf() {
  const { identityVersions, activeIdentity, moments, archiveActiveIdentity, createIdentityVersion, storageStatus, journalSnapshot, updateJournal } = useMockProductState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftMonth, setDraftMonth] = useState("");
  const [draftPrinciples, setDraftPrinciples] = useState("");
  const principles = draftPrinciples.split("\n").map((p) => p.trim()).filter(Boolean);
  const validChange = Boolean(activeIdentity && draft.trim() && horizonMonthsAhead(draftMonth, localDate()) >= 6 && principles.length <= 20 && principles.every((p) => p.length <= 500) && (draft.trim() !== activeIdentity.definition || draftMonth !== activeIdentity.horizon.targetMonth || JSON.stringify(principles) !== JSON.stringify(activeIdentity.principles)));
  const [archive, setArchive] = useState(false);
  const [horizon, setHorizon] = useState<FutureSelfIdentityVersion | null>(() => activeIdentity && activeIdentity.horizon.targetMonth <= localMonth() && !journalSnapshot.horizonReflections?.[activeIdentity.id] ? activeIdentity : null);
  const [choice, setChoice] = useState<string>();
  const [notice, setNotice] = useState("");
  const [openedMonth] = useState(() => localMonth());
  const input = useRef<HTMLTextAreaElement>(null);
  const pastVersions = identityVersions.filter((version) => version.status === "past").toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);

  const openHorizon = (version: FutureSelfIdentityVersion) => { setEditing(false); setHorizon(version); setChoice(journalSnapshot.horizonReflections?.[version.id]?.choice); };
  const beginEdit = (extend = false) => { if (!activeIdentity) return; setDraft(activeIdentity.definition); setDraftMonth(extend || horizonMonthsAhead(activeIdentity.horizon.targetMonth, localDate()) < 6 ? addMonths(localDate(), 12).slice(0, 7) : activeIdentity.horizon.targetMonth); setDraftPrinciples(activeIdentity.principles.join("\n")); setHorizon(null); setEditing(true); setNotice(""); };
  const prepareDirection = (version?: FutureSelfIdentityVersion) => updateJournal((current) => ({ ...current, onboardingDraft: { definition: version?.definition ?? "", reason: version?.reason?.slice(0, 500) ?? "", anchor: version?.anchor?.slice(0, 500) ?? "", months: 36, custom: "", step: 0, updatedAt: new Date().toISOString(), newJourney: true } }));
  const frameHeader = <header className="echo-space-header echo-direction-header">
    {horizon ? <button className="echo-icon-button" aria-label="Return to your direction" onClick={() => { setHorizon(null); setChoice(undefined); }}><BackIcon /></button> : <Link className="echo-icon-button" href="/memory" aria-label="Back to Your Space"><BackIcon /></Link>}
    <h1>{horizon ? "Horizon Day" : "Your direction"}</h1>
    <Link className="echo-icon-button" href="/now" aria-label="Return to conversation"><CloseIcon /></Link>
  </header>;

  return <main className="echo-ui echo-stage"><div className="echo-memory-shell"><section className="echo-direction-page">
    {frameHeader}
    <div className="echo-direction-scroll">
      {horizon ? <section className="echo-horizon-view">
        <span className="journal-eyebrow">{horizon.horizon.targetMonth > openedMonth ? "HORIZON DAY PREVIEW" : "HORIZON DAY"} · VERSION {horizon.version}</span>
        <h2>The future is now.</h2>
        <p className="echo-direction-lead">A place to pause, wherever you find yourself.</p>
        <div className="echo-horizon-context"><span>The horizon you chose</span><strong>{horizon.horizon.label}</strong><p>{horizon.definition}</p></div>
        <p className="echo-direction-support">{horizon.horizon.targetMonth > openedMonth ? "This is a preview of your reflection point. " : ""}There is no result to prove. Your direction can stay, grow or change.</p>
        <div className="echo-horizon-choices" role="group" aria-label="Horizon Day reflection">{horizonChoices.map((item) => <button key={item} aria-pressed={choice === item} onClick={() => setChoice(item)}>{item}<span aria-hidden="true">{choice === item ? "✓" : "↗"}</span></button>)}</div>
        {choice && <div className="echo-horizon-response" role="status"><p>{choice}</p><span>You can take your time with this. Your previous path stays readable, and no memories move automatically.</span><span>Choosing is not a verdict. Keep the reflection or choose your next direction below.</span><button className="echo-button outline" onClick={() => { updateJournal((current) => ({ ...current, horizonReflections: { ...current.horizonReflections, [horizon.id]: { choice, recordedAt: new Date().toISOString() } } })); setNotice("Reflection kept on this device. No moment, star or memory permission was added."); }}>Keep Horizon Day reflection</button>{choice === horizonChoices[2] && activeIdentity?.id === horizon.id && <button className="echo-button lilac" onClick={() => beginEdit(true)}>Choose a new horizon</button>}{choice === horizonChoices[3] && <Link href="/onboarding" className="echo-button lilac" onClick={() => prepareDirection()}>Choose a different direction</Link>}{horizon.status === "past" && <Link href="/onboarding" className="echo-button lilac" onClick={() => prepareDirection(horizon)}>Begin again from these words</Link>}{notice && <p role="status">{notice}</p>}</div>}
        <button className="echo-text-button" onClick={() => { setHorizon(null); setChoice(undefined); }}>Back to your direction</button>
      </section> : <>
        <div className="echo-direction-intro"><span className="journal-eyebrow">THE ROAD YOU CHOSE</span><h2>A little closer<br />to who you want to be.</h2><p>An imagined possible future. A direction that remains yours.</p></div>
        {activeIdentity ? <>
          <section className="echo-current-direction" aria-label="Current direction">
            <div className="echo-direction-meta"><span>YOUR FUTURE SELF</span><span>v{activeIdentity.version} · Current</span></div>
            <p className="echo-direction-definition">{activeIdentity.definition}</p>
            <div className="echo-destination"><span className="echo-destination-year">{activeIdentity.horizon.targetMonth.slice(0, 4)}</span><span><small>Speaking from a possible future</small><strong>{activeIdentity.horizon.label}</strong></span></div>
            {editing ? <form className="echo-direction-form" onSubmit={(event) => { event.preventDefault(); if (!validChange || storageStatus !== "saved") return; createIdentityVersion({ ...activeIdentity, definition: draft, horizon: { targetMonth: draftMonth, label: formatHorizonLabel(draftMonth) }, principles }); setEditing(false); setNotice("Your direction has a new version. Earlier moments keep their original context."); }}>
              <label htmlFor="direction-definition">The person you are becoming</label><textarea id="direction-definition" ref={input} value={draft} maxLength={MAX_IDENTITY_LENGTH} rows={5} onChange={(event) => setDraft(event.target.value)} aria-describedby="direction-edit-detail" />
              <label htmlFor="direction-month">Speaking from month and year</label><input id="direction-month" type="month" min={addMonths(localDate(), 6).slice(0, 7)} value={draftMonth} onChange={(e) => setDraftMonth(e.target.value)} required /><label htmlFor="direction-principles">Your principles · one per line, up to 20</label><textarea id="direction-principles" rows={3} maxLength={10000} value={draftPrinciples} onChange={(e) => setDraftPrinciples(e.target.value)} /><p id="direction-edit-detail">Saving creates a new version. Earlier conversations and saved moments stay with v{activeIdentity.version}; they are not carried forward automatically.</p>
              <div className="echo-form-actions"><button className="echo-button outline" type="button" onClick={() => setEditing(false)}>Cancel changes</button><button className="echo-button lilac" disabled={!validChange || storageStatus !== "saved"} type="submit">Save as new version</button></div>
            </form> : <button className="echo-button outline" onClick={() => beginEdit()}>Edit direction</button>}
          </section>
          {(activeIdentity.reason || activeIdentity.anchor || activeIdentity.principles.length > 0) && <section className="echo-direction-anchors" aria-label="What matters along the way">
            <h2>What you want to keep close</h2>
            {activeIdentity.reason && <div><span>Why this direction matters</span><p>{activeIdentity.reason}</p></div>}
            {activeIdentity.anchor && <div><span>A reminder from you</span><p>{activeIdentity.anchor}</p></div>}
            {activeIdentity.principles.length > 0 && <div><span>Your principles</span><ul>{activeIdentity.principles.map((principle, index) => <li key={`${index}-${principle}`}>{principle}</li>)}</ul></div>}
          </section>}
          <div className="echo-direction-version"><span>This version began</span><time dateTime={activeIdentity.createdAt}>{formatDate(activeIdentity.createdAt)}</time></div>
          <Link href="/now" className="echo-button butter echo-direction-chat">Return to our conversation <span aria-hidden="true">↗</span></Link>
          <details className="echo-direction-archive"><summary>When this direction no longer feels like yours</summary><p>You can close this chapter before choosing another. Its saved moments stay readable. No other Future Self becomes active automatically.</p><button className="echo-text-button danger" disabled={storageStatus !== "saved"} onClick={() => setArchive(true)}>Archive current path</button></details>
        </> : <section className="echo-direction-empty"><span className="echo-direction-empty-mark" aria-hidden="true">↗</span><h2>Room for a new direction.</h2><p>Your past paths are still here. There is no active Future Self to chat with right now.</p><p>A new journey starts without inheriting memories automatically.</p><Link href="/onboarding" className="echo-button lilac">Choose a new direction</Link></section>}
        <section className="echo-direction-history" aria-label="Past directions"><span className="journal-eyebrow">EARLIER CHAPTERS</span><h2>Parts of the road behind you.</h2><p>Still yours. Kept with the context they began in.</p>
          {pastVersions.length ? pastVersions.map((version) => <details key={version.id} className="echo-past-direction"><summary><span><small>Past direction · v{version.version}</small><strong>{version.definition}</strong><em>{version.horizon.label}</em></span><span className="echo-history-chevron" aria-hidden="true">⌄</span></summary>
            <dl><div><dt>Began</dt><dd>{formatDate(version.createdAt)}</dd></div><div><dt>Closed</dt><dd>{version.supersededAt ? formatDate(version.supersededAt) : "—"}</dd></div></dl><p>{moments.filter((moment) => moment.identityVersionId === version.id && !moment.deletedAt).length} chosen moments belong to this version. They stay with their original path.</p>
            <Link href={`/now?past=${encodeURIComponent(version.id)}`} className="echo-text-button">Read earlier conversation <span aria-hidden="true">↗</span></Link><p className="echo-history-note">Read only · replies cannot continue from a past direction. Unsaved conversation history is session-only in this preview.</p>
            <Link href="/onboarding" className="echo-text-button" onClick={() => prepareDirection(version)}>Begin again from these words</Link><button className="echo-text-button" onClick={() => openHorizon(version)}>{version.horizon.targetMonth > openedMonth ? "Preview Horizon Day" : "Open Horizon Day"}</button>
          </details>) : <p className="echo-no-history">Earlier versions will stay here when your direction changes.</p>}
        </section>
        {activeIdentity && <button className="echo-horizon-entry" onClick={() => openHorizon(activeIdentity)}><span><small>WHEN YOUR HORIZON ARRIVES</small><strong>The future is now.</strong><em>{activeIdentity.horizon.targetMonth > openedMonth ? "Preview your reflection point" : "Open your reflection point"}</em></span><span aria-hidden="true">↗</span></button>}
        {notice && <p className="echo-direction-notice" role="status">{notice}</p>}
        <JournalStorageStatus />
      </>}
    </div>
    <EchoDialog open={archive && Boolean(activeIdentity)} onClose={() => setArchive(false)} label="Archive current path" className="echo-direction-archive-dialog">
      <div className="echo-direction-confirm" onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}><span className="journal-eyebrow">A CHAPTER, KEPT</span><h2>Close this chapter<br />without erasing it?</h2><p>Its saved moments and available conversations stay readable. No other Future Self becomes active automatically.</p><p>Unsaved conversation history still resets on refresh in this local preview.</p><div className="echo-form-actions"><button className="echo-button outline" onClick={() => setArchive(false)}>Keep active</button><button className="echo-button lilac" disabled={storageStatus !== "saved"} onClick={() => { archiveActiveIdentity(); setEditing(false); setArchive(false); setNotice("This path is archived. Its chosen moments are still yours."); }}>Archive path</button></div></div>
    </EchoDialog>
  </section></div></main>;
}
