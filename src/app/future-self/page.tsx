"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useMockProductState } from "@/components/mock-product-state";
import { pastIdentityVersion } from "@/lib/mock-data";

const fmt = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const horizonChoices = ["I arrived somewhere meaningful", "I want to keep going", "I want to reach further", "I want something different"];

export default function FutureSelf() {
  const { activeIdentity, archiveActiveIdentity, activateMockIdentity } = useMockProductState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(activeIdentity?.definition ?? "");
  const [archive, setArchive] = useState(false);
  const [horizonDay, setHorizonDay] = useState(false);
  const [choice, setChoice] = useState<string>();

  if (horizonDay) return <AppShell><main className="shell flex min-h-[calc(100vh-5rem)] items-center py-12 sm:py-20"><section className="mx-auto w-full max-w-3xl text-center">
    <p className="eyebrow text-sun">Horizon Day · Future Self v{pastIdentityVersion.version}</p>
    <h1 className="display mt-5 text-6xl sm:text-8xl">The future is now.</h1>
    <p className="mx-auto mt-7 max-w-xl text-base leading-7 text-muted">The horizon you chose was {pastIdentityVersion.horizon.label}. This is a reflection point, not a result or a judgment.</p>
    {choice ? <div className="mt-12 border-y border-line py-10"><p className="eyebrow text-peach">Your choice</p><h2 className="display mt-4 text-3xl">{choice}</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted">You can keep, adjust, or replace the direction. The old path stays readable, and no memories move automatically.</p><button className="button-secondary mt-7" onClick={() => setChoice(undefined)}>Choose again</button></div> : <div className="mx-auto mt-12 grid max-w-2xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">{horizonChoices.map((item) => <button key={item} onClick={() => setChoice(item)} className="min-h-28 bg-surface p-6 text-left font-display text-xl hover:text-sun">{item}</button>)}</div>}
    <button className="quiet-link mt-10 text-sm" onClick={() => { setHorizonDay(false); setChoice(undefined); }}>Return to Future Self history</button>
  </section></main></AppShell>;

  return <AppShell><main className="shell py-10 sm:py-16">
    <header className="max-w-3xl"><p className="eyebrow">Future Self paths</p><h1 className="display mt-4 text-4xl sm:text-6xl">A direction can change without erasing where it began.</h1></header>
    {activeIdentity ? <div className="mt-14 grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-20">
      <section className="border-y border-line py-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="eyebrow text-sun">Current Horizon · Future Self v{activeIdentity.version}</p><button onClick={() => setEditing((value) => !value)} className="button-secondary">{editing ? "Cancel" : "Edit direction"}</button></div>
        {editing ? <><textarea className="field mt-7 min-h-36 text-xl" value={draft} onChange={(event) => setDraft(event.target.value)} /><p className="mt-3 text-xs leading-5 text-muted">Saving identity, horizon, or principle changes creates Future Self v{activeIdentity.version + 1}. Existing records keep v{activeIdentity.version}.</p><button className="button-primary mt-5" onClick={() => setEditing(false)}>Save as new version</button></> : <h2 className="display mt-8 max-w-3xl text-4xl leading-tight sm:text-5xl">{activeIdentity.definition}</h2>}
        <dl className="mt-12 grid gap-8 border-t border-line pt-8 sm:grid-cols-2"><div><dt className="eyebrow">Horizon</dt><dd className="mt-2">{activeIdentity.horizon.label}</dd></div><div><dt className="eyebrow">Version began</dt><dd className="mt-2">{fmt(activeIdentity.createdAt)}</dd></div><div className="sm:col-span-2"><dt className="eyebrow">Principles</dt><dd className="mt-3 flex flex-wrap gap-2">{activeIdentity.principles.map((principle) => <span key={principle} className="rounded-xl border border-line px-3 py-2 text-xs">{principle}</span>)}</dd></div></dl>
      </section>
      <aside className="lg:pt-8"><details open className="border-t border-line pt-5"><summary className="cursor-pointer list-none font-display text-2xl font-bold">One active path</summary><p className="mt-4 text-sm leading-6 text-muted">Archive the current path before starting another. Its conversations and moments remain readable; chat and memory transfer do not continue automatically.</p><button onClick={() => setArchive(true)} className="button-secondary mt-6 border-danger text-danger">Archive current path</button></details></aside>
    </div> : <section className="panel mt-12 p-7 sm:p-10"><p className="eyebrow text-peach">No active Future Self</p><h2 className="display mt-4 text-4xl sm:text-5xl">Your past paths are still here.</h2><p className="mt-5 max-w-2xl text-sm leading-6 text-muted">There is no current perspective to chat with. Past conversations and Saved Moments remain readable. A new journey starts empty unless you explicitly carry moments forward.</p><div className="mt-7 flex flex-wrap gap-3"><Link href="/onboarding" className="button-primary">Start a new direction</Link><button onClick={activateMockIdentity} className="button-secondary">Restore current mock path</button></div></section>}
    <section className="mt-20 border-t border-line pt-10"><div className="flex flex-wrap items-end justify-between gap-6"><div><p className="eyebrow">Past Horizons</p><h2 className="display mt-3 max-w-2xl text-3xl sm:text-4xl">Readable history, with its original provenance.</h2></div><button onClick={() => setHorizonDay(true)} className="button-secondary">Open Horizon Day</button></div>
      <article className="mt-10 grid gap-8 border-l border-peach bg-canvas-soft px-6 py-7 md:grid-cols-[1fr_.7fr] md:px-8"><div><p className="eyebrow text-peach">Future Self v{pastIdentityVersion.version} · Past</p><h3 className="display mt-3 text-2xl">{pastIdentityVersion.definition}</h3><p className="mt-4 text-sm text-muted">Created {fmt(pastIdentityVersion.createdAt)} · Closed {pastIdentityVersion.supersededAt ? fmt(pastIdentityVersion.supersededAt) : "—"}</p></div><dl className="border-l-0 border-line md:border-l md:pl-6"><dt className="eyebrow">Original horizon</dt><dd className="mt-2 text-xl">{pastIdentityVersion.horizon.label}</dd><dt className="eyebrow mt-5">Conversation access</dt><dd className="mt-2 text-sm text-muted">Readable only · cannot continue</dd></dl></article>
    </section>
    {archive ? <div className="fixed inset-0 z-50 grid place-items-center bg-[#080d14]/80 p-4" role="dialog" aria-modal="true"><div className="panel w-full max-w-lg p-7"><p className="eyebrow text-peach">Archive current path</p><h2 className="display mt-3 text-3xl">Close this chapter without erasing it?</h2><p className="mt-5 text-sm leading-6 text-muted">Its conversations and Saved Moments stay readable. No other Future Self becomes active automatically.</p><div className="mt-7 flex justify-end gap-3"><button className="button-secondary" onClick={() => setArchive(false)}>Keep active</button><button className="button-primary" onClick={() => { archiveActiveIdentity(); setArchive(false); }}>Archive path</button></div></div></div> : null}
  </main></AppShell>;
}
