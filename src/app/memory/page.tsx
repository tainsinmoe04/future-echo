"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Trash } from "@/components/icons";
import type { SavedMoment } from "@/lib/domain";
import { identityById, savedMoments } from "@/lib/mock-data";

const fmt = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function Memory() {
  const [moments, setMoments] = useState<readonly SavedMoment[]>(savedMoments);
  const [selected, setSelected] = useState<string | undefined>(savedMoments[0]?.id);
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(savedMoments.map((moment) => [moment.id, moment.myNote ?? ""])));
  const active = moments.find((moment) => moment.id === selected) ?? moments[0];
  const grouped = useMemo(() => {
    const map = new Map<string, SavedMoment[]>();
    for (const moment of moments) {
      const key = new Date(moment.occurredAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
      map.set(key, [...(map.get(key) || []), moment]);
    }
    return [...map];
  }, [moments]);
  const removeInterpretation = () => active && setMoments((items) => items.map((moment) => moment.id === active.id ? { ...moment, aiInterpretation: undefined } : moment));
  const del = () => {
    if (!active) return;
    const next = moments.find((moment) => moment.id !== active.id);
    setMoments((items) => items.filter((moment) => moment.id !== active.id));
    setSelected(next?.id);
  };
  const identity = active ? identityById.get(active.identityVersionId) : undefined;

  const contents = <>
    <div className="flex items-baseline justify-between"><h2 className="font-display text-3xl font-bold">2026</h2><span className="text-xs text-muted">{moments.length} saved moments</span></div>
    <div className="mt-7 space-y-8">{grouped.map(([month, items]) => <section key={month}>
      <h3 className="eyebrow">{month}</h3>
      <div className="mt-3 space-y-1">{items.map((moment) => <button key={moment.id} onClick={() => setSelected(moment.id)} className={`w-full border-l px-4 py-3 text-left ${selected === moment.id ? "border-sun bg-sun/8" : "border-transparent hover:border-line"}`}>
        <span className="block text-sm font-semibold">{moment.title}</span>
        <span className="mt-1 block text-xs text-muted">{fmt(moment.occurredAt)} · Future Self v{identityById.get(moment.identityVersionId)?.version}</span>
      </button>)}</div>
    </section>)}</div>
    <p className="mt-9 text-xs leading-5 text-muted">Months without saved moments stay quietly folded away.</p>
  </>;

  return <AppShell><main className="shell py-9 sm:py-16">
    <header className="mx-auto max-w-4xl text-center"><p className="eyebrow">Memory · through July 16, 2026</p><h1 className="display mt-4 text-4xl sm:text-6xl">The moments you chose to keep.</h1><p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-muted">Conversation history can expire. Saved Moments remain until you delete them and keep the Future Self version under which they were saved.</p></header>
    <details className="mx-auto mt-10 max-w-3xl border-y border-line py-4 lg:hidden"><summary className="cursor-pointer list-none text-sm font-semibold">2026 · {moments.length} saved moments</summary><div className="pt-6">{contents}</div></details>
    <div className="mx-auto mt-10 grid max-w-6xl items-start lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-px lg:overflow-hidden lg:rounded-2xl lg:border lg:border-line lg:bg-line lg:shadow-[var(--shadow)]">
      <aside className="hidden min-h-[680px] bg-canvas-soft p-8 lg:block">{contents}</aside>
      {active ? <article className="min-w-0 bg-surface px-6 py-9 sm:px-10 sm:py-12 lg:min-h-[680px] lg:px-14">
        <header className="border-b border-line pb-8"><p className="eyebrow text-sun">Original excerpt · {fmt(active.occurredAt)}</p><h2 className="display mt-3 text-3xl sm:text-4xl">{active.title}</h2><p className="mt-3 text-xs leading-5 text-muted">Saved under Future Self v{identity?.version} · Horizon {identity?.horizon.label}<br />“{identity?.definition}”</p></header>
        <blockquote className="mt-10 border-l border-peach pl-5 font-display text-2xl leading-9 sm:pl-7 sm:text-3xl sm:leading-10">“{active.originalExcerpt}”</blockquote>
        {active.relatedAiReply ? <div className="mt-10 border-l border-sun pl-5 sm:ml-12 sm:pl-7"><p className="eyebrow text-sun">Related AI reply</p><p className="mt-3 text-sm leading-6 text-muted">{active.relatedAiReply}</p></div> : null}
        <div className="soft-rule my-10" />
        {active.aiInterpretation ? <details><summary className="cursor-pointer list-none text-sm font-semibold">AI interpretation · frozen</summary><div className="mt-4 border-l border-line pl-5"><p className="text-sm leading-6 text-muted">{active.aiInterpretation}</p><button onClick={removeInterpretation} className="quiet-link mt-4 text-xs">Remove AI interpretation</button></div></details> : <p className="text-xs text-muted">AI interpretation removed. Your original excerpt remains unchanged.</p>}
        <label className="mt-10 block border-t border-line pt-8 text-sm"><span className="mb-2 block font-semibold">My Note</span><textarea className="field min-h-28 resize-y" value={notes[active.id] || ""} onChange={(event) => setNotes((items) => ({ ...items, [active.id]: event.target.value }))} placeholder="Add what this moment means to you now." /></label>
        <details className="mt-7 border-t border-line pt-6"><summary className="cursor-pointer list-none text-sm font-semibold">AI memory context: {active.consent.useInAiContext ? "Allowed" : "Off"}</summary><p className="mt-3 text-xs leading-5 text-muted">Consent recorded {fmt(active.consent.recordedAt)}. My Note context is {active.consent.includeMyNoteInAiContext ? "allowed" : "off"}.</p></details>
        <div className="mt-10 border-t border-line pt-6"><button onClick={del} className="inline-flex items-center gap-2 text-xs text-danger hover:underline"><Trash className="size-4" />Delete saved moment</button></div>
      </article> : <div className="bg-surface p-9 lg:min-h-[680px]"><p className="eyebrow text-peach">Memory is empty</p><h2 className="display mt-4 text-3xl">Nothing has been carried forward yet.</h2><p className="mt-4 text-sm leading-6 text-muted">Saved Moments appear only after you select real conversation text and confirm it.</p></div>}
    </div>
  </main></AppShell>;
}
