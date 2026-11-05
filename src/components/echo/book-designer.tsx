"use client";
/* eslint-disable @next/next/no-img-element -- Local uploaded media has no external image service. */
import { useEffect, useRef, useState } from "react";
import type { BookStyle } from "@/lib/journal-features";
import { COVER_THEMES, defaultBook, orderedPages } from "@/lib/journal-features";
import { readRasterFile } from "@/lib/journal-media";
import { useMockProductState } from "@/components/mock-product-state";
import { PhotoFraming } from "./photo-framing";
import { moveLayer } from "@/lib/journal-tools";
import { momentDay } from "@/lib/local-date";
import { BackIcon } from "./icons";
import { FontPicker } from "./font-picker";
import { Sticker } from "./sticker";
import { PageObject, type PageEditing } from "./page-object";
import { DecorationPicker } from "./decoration-picker";
import { JournalStorageStatus } from "./journal-storage-status";

export function BookCover({ year, style, editing }: { year: string; style: BookStyle; editing?: PageEditing }) {
  const page = useRef<HTMLDivElement>(null);
  useEffect(() => { const element = page.current; if (!element) return; const resize = new ResizeObserver(() => { element.style.setProperty("--page-width", `${element.clientWidth}px`); element.style.setProperty("--page-height", `${element.clientHeight}px`); }); resize.observe(element); return () => resize.disconnect(); }, []);
  const fullPhoto = Boolean(style.photo && style.photoMode === "full");
  const layerOrder = [...new Set([...(style.layers ?? []), "words", ...(style.photo && !fullPhoto ? ["photo:cover"] : []), ...style.placements.map((s) => `sticker:${s.id}`)])];
  return <div ref={page} className={`journal-cover theme-${style.theme} ${fullPhoto ? "has-full-photo" : ""}`} data-note-font={style.noteFont}>
    {fullPhoto && <><img className="journal-cover-background" src={style.photo} alt="Chosen cover photograph filling the book cover" draggable={false} style={{ objectPosition: `${style.photoCrop?.x ?? 50}% ${style.photoCrop?.y ?? 50}%`, transform: `scale(${style.photoCrop?.zoom ?? 1})`, transformOrigin: `${style.photoCrop?.x ?? 50}% ${style.photoCrop?.y ?? 50}%` }} /><span className="journal-cover-photo-shade" aria-hidden="true" /></>}
    <span className="journal-cover-spine" /><span className="journal-cover-year">{year}</span>
    <PageObject page={page} id="words" label="Cover title" layer={2 + layerOrder.indexOf("words")} editing={editing} value={style.transforms.words}><strong className="journal-cover-title">{style.title}</strong></PageObject>
    <span className="journal-cover-subtitle">{style.subtitle}</span>
    {style.photo && !fullPhoto && <PageObject page={page} id="photo:cover" label="Cover photo" layer={2 + layerOrder.indexOf("photo:cover")} editing={editing} value={style.transforms["photo:cover"]}><span className="journal-cover-photo"><img src={style.photo} alt="Chosen cover photograph" draggable={false} style={{ objectPosition: `${style.photoCrop?.x ?? 50}% ${style.photoCrop?.y ?? 50}%`, transform: `scale(${style.photoCrop?.zoom ?? 1})`, transformOrigin: `${style.photoCrop?.x ?? 50}% ${style.photoCrop?.y ?? 50}%` }} /></span></PageObject>}
    <div className="echo-sticker-layer direct-stickers">{style.placements.map((s) => <PageObject key={s.id} page={page} id={`sticker:${s.id}`} label={`${s.name} cover sticker`} layer={2 + layerOrder.indexOf(`sticker:${s.id}`)} editing={editing} value={style.transforms[`sticker:${s.id}`]} className="direct-sticker" style={{ position: "absolute", left: `${s.x}%`, top: `${s.y}%`, width: `${s.size}%` }}><Sticker name={s.name} src={s.src} /></PageObject>)}</div>
  </div>;
}

export function BookDesigner({ year, onClose }: { year: string; onClose: () => void }) {
  const { journalSnapshot, updateJournal } = useMockProductState();
  const [value, setValue] = useState<BookStyle>(() => journalSnapshot.bookDrafts?.[year] ?? journalSnapshot.books?.[year] ?? defaultBook(year));
  const [baseline] = useState(() => JSON.stringify(value));
  const [hadDraft] = useState(() => Boolean(journalSnapshot.bookDrafts?.[year]));
  const finished = useRef(false);
  useEffect(() => {
    if (finished.current) return;
    if (!hadDraft && JSON.stringify(value) === baseline) { updateJournal((current) => current.bookDrafts?.[year] ? { ...current, bookDrafts: Object.fromEntries(Object.entries(current.bookDrafts).filter(([key]) => key !== year)) } : current); return; }
    updateJournal((current) => ({ ...current, bookDrafts: { ...current.bookDrafts, [year]: value } }));
  }, [value, year, updateJournal, baseline, hadDraft]);
  const [history, setHistory] = useState<BookStyle[]>([]); const [future, setFuture] = useState<BookStyle[]>([]);
  const [selected, setSelected] = useState<string | null>(null); const [tab, setTab] = useState("Cover"); const [error, setError] = useState("");
  const file = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false);
  const pages = orderedPages(journalSnapshot.moments.filter((m) => !m.deletedAt && momentDay(m).startsWith(year)), value.order);
  const change = (patch: Partial<BookStyle>) => { setHistory([...history.slice(-29), value]); setFuture([]); setValue({ ...value, ...patch }); };
  const removeObject = (id: string) => {
    if (!id.startsWith("sticker:") && id !== "photo:cover") return;
    change({ ...(id === "photo:cover" ? { photo: undefined, photoCrop: undefined } : { placements: value.placements.filter(item => `sticker:${item.id}` !== id) }), transforms: Object.fromEntries(Object.entries(value.transforms).filter(([key]) => key !== id)), layers: value.layers?.filter(key => key !== id) });
    setSelected(null);
  };
  const move = (id: string, amount: number) => { const order = pages.map((m) => m.id), i = order.indexOf(id), next = i + amount; if (next < 0 || next >= order.length) return; [order[i], order[next]] = [order[next], order[i]]; change({ order }); };
  return <section className="echo-editor"><header className="echo-space-header"><button className="echo-icon-button" aria-label="Keep cover draft and go back" disabled={busy} onClick={onClose}><BackIcon /></button><h2>Your {year} book</h2><button className="echo-button lilac compact" disabled={busy || !value.title.trim()} onClick={() => { finished.current = true; updateJournal((current) => ({ ...current, books: { ...current.books, [year]: { ...value, title: value.title.trim() } }, bookDrafts: Object.fromEntries(Object.entries(current.bookDrafts ?? {}).filter(([key]) => key !== year)) })); onClose(); }}>Done</button></header>
    <div className="journal-editor-history"><button className="echo-text-button" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { setFuture([...future, value]); setValue(previous); setHistory(history.slice(0, -1)); } }}>Undo</button><button className="echo-text-button" disabled={!future.length} onClick={() => { const next = future.at(-1); if (next) { setHistory([...history, value]); setValue(next); setFuture(future.slice(0, -1)); } }}>Redo</button></div>
    <div className="echo-editor-body journal-book-designer"><div className="journal-tabs">{["Cover", "Decorate", "Pages"].map((t) => <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Pages" ? <section className="journal-page-order"><h3>A sequence that feels like yours.</h3><p>Change reading order within this year. Original dates stay on every page.</p>{pages.map((page, index) => <div key={page.id}><span><small>{momentDay(page)}</small><strong>{page.title ?? "A moment"}</strong></span><button className="echo-icon-button" aria-label={`Move ${page.title ?? "moment"} earlier`} disabled={index === 0} onClick={() => move(page.id, -1)}>↑</button><button className="echo-icon-button" aria-label={`Move ${page.title ?? "moment"} later`} disabled={index === pages.length - 1} onClick={() => move(page.id, 1)}>↓</button></div>)}<button className="echo-text-button" onClick={() => change({ order: [] })}>Restore chronological order</button></section> : <>
        {tab === "Cover" ? <div className="journal-cover-form"><label>Book title<input value={value.title} maxLength={80} onChange={(e) => change({ title: e.target.value })} /></label><label>A little line underneath<input value={value.subtitle} maxLength={120} onChange={(e) => change({ subtitle: e.target.value })} /></label><fieldset><legend>Cover material</legend><div className="journal-cover-swatches">{COVER_THEMES.map((theme) => <button key={theme} className={`theme-${theme}`} aria-label={`${theme} cover`} aria-pressed={value.theme === theme} onClick={() => change({ theme })}><span>{theme}</span></button>)}</div></fieldset><FontPicker value={value.noteFont} onChange={(noteFont) => change({ noteFont })} /><input type="file" className="sr-only" tabIndex={-1} ref={file} aria-label="Choose cover photo" accept="image/png,image/jpeg,image/webp" onChange={async (e) => { const image = e.target.files?.[0]; e.target.value = ""; if (!image) return; setBusy(true); setError(""); try { change({ photo: await readRasterFile(image), photoMode: "full" }); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }} /><button className="echo-button outline" disabled={busy} onClick={() => file.current?.click()}>{busy ? "Opening photo…" : "Choose cover photo"}</button>{value.photo && <fieldset><legend>How your photo sits</legend><PhotoFraming src={value.photo} value={value.photoCrop} ratio="340/440" onChange={(photoCrop) => change({ photoCrop })} /><div className="journal-tabs"><button aria-pressed={value.photoMode === "full"} onClick={() => change({ photoMode: "full" })}>Fill the cover</button><button aria-pressed={value.photoMode !== "full"} onClick={() => change({ photoMode: "inset" })}>Photo on cover</button></div><p className="echo-muted">{value.photoMode === "full" ? "Your photo fills the whole cover. Its edges may be cropped to fit." : "A small photo on your chosen cover material."}</p><button className="echo-text-button" onClick={() => change({ photo: undefined })}>Remove cover photo</button></fieldset>}</div> : <><DecorationPicker onBusyChange={setBusy} count={value.placements.length} onAdd={(s) => { change({ placements: [...value.placements, s] }); setSelected(`sticker:${s.id}`); }} /><p className="echo-muted">Move, resize and turn your cover details directly.</p>{selected && <div className="journal-tabs"><button onClick={() => change({ layers: moveLayer(value.layers ?? [], ["words", ...(value.photo && value.photoMode !== "full" ? ["photo:cover"] : []), ...value.placements.map((p) => `sticker:${p.id}`)], selected, "front") })}>Bring to front</button><button onClick={() => change({ layers: moveLayer(value.layers ?? [], ["words", ...(value.photo && value.photoMode !== "full" ? ["photo:cover"] : []), ...value.placements.map((p) => `sticker:${p.id}`)], selected, "back") })}>Send to back</button></div>}{selected?.startsWith("sticker:") && <button className="echo-text-button danger" onClick={() => { change({ placements: value.placements.filter((s) => `sticker:${s.id}` !== selected), transforms: Object.fromEntries(Object.entries(value.transforms).filter(([key]) => key !== selected)) }); setSelected(null); }}>Remove selected decoration</button>}<button className="echo-text-button" onClick={() => change({ transforms: {} })}>Reset cover positions</button></>}
        <BookCover year={year} style={value} editing={tab === "Decorate" ? { selected, onSelect: setSelected, onRemove: removeObject, onChange: (id, transform) => change({ transforms: { ...value.transforms, [id]: transform } }) } : undefined} />
      </>}{error && <p role="alert" className="echo-error">{error}</p>}<JournalStorageStatus /><p className="echo-preview-note">Cover draft saves on this device. Choose Done to apply it.</p><button className="echo-text-button danger" onClick={() => { if (!window.confirm("Discard this cover draft? Your saved cover stays unchanged.")) return; finished.current = true; updateJournal((current) => ({ ...current, bookDrafts: Object.fromEntries(Object.entries(current.bookDrafts ?? {}).filter(([key]) => key !== year)) })); onClose(); }}>Discard cover draft</button></div></section>;
}
