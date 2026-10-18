"use client";
import { useEffect, useRef, useState } from "react";
import type { JourneyMoment, PageTransform } from "@/lib/domain";
import { keepMoment } from "@/lib/personal-space";
import { stickersForMoment } from "@/lib/scrapbook";
import { addMonths, buildSavedMomentConsent } from "@/lib/moment-lifecycle";
import { safeMusicUrl } from "@/lib/journal-features";
import { MAX_EXCERPT_LENGTH, MAX_JOURNAL_LENGTH, MAX_JOURNAL_NOTE_LENGTH } from "@/lib/redaction";
import { PhotoFraming, FramedPhoto } from "./photo-framing";
import { moveLayer, pageObjectIds } from "@/lib/journal-tools";
import { localDate, momentDay } from "@/lib/local-date";
import { useMockProductState } from "@/components/mock-product-state";
import { BackIcon, CloseIcon, StarIcon } from "./icons";
import { PhotoPicker } from "./photo-picker";
import { FontPicker } from "./font-picker";
import { MomentPaper } from "./moment-paper";
import { DecorationPicker } from "./decoration-picker";
import { JournalStorageStatus } from "./journal-storage-status";

export function MomentEditor({ moment, draftId, onClose, onSaved }: { moment?: JourneyMoment; draftId?: string; onClose: () => void; onSaved: (id: string) => void }) {
  const { activeIdentity, preferences, journalSnapshot, updateJournal } = useMockProductState();
  const [key] = useState(() => draftId ?? moment?.id ?? `new-${activeIdentity?.id ?? "journal"}`);
  const [initial] = useState(() => journalSnapshot.drafts?.find((d) => d.id === key)?.value ?? moment ?? {
    id: crypto.randomUUID(), identityVersionId: activeIdentity?.id ?? "", kind: "personal" as const,
    title: "", originalExcerpt: "", calendarDate: localDate(), occurredAt: `${localDate()}T00:00:00.000Z`, revisitAt: addMonths(new Date().toISOString(), 6),
    noteFont: preferences.defaultNoteFont, consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: new Date().toISOString() },
  });
  const [value, setValue] = useState<JourneyMoment>({ ...initial, stickerPlacements: stickersForMoment(initial), pageTransforms: initial.pageTransforms ?? {} });
  const [baseline] = useState(() => JSON.stringify({ ...initial, stickerPlacements: stickersForMoment(initial), pageTransforms: initial.pageTransforms ?? {} }));
  const [hadDraft] = useState(() => Boolean(journalSnapshot.drafts?.some((d) => d.id === key)));
  type HistoryEntry = { value: JourneyMoment; musicTitle: string; musicUrl: string };
  const [history, setHistory] = useState<HistoryEntry[]>([]); const [future, setFuture] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [framing, setFraming] = useState<string>();
  const [mode, setMode] = useState<"write" | "arrange" | "fonts" | "extras">("write");
  const [context, setContext] = useState(false); const [noteContext, setNoteContext] = useState(false);
  const [musicTitle, setMusicTitle] = useState(() => journalSnapshot.drafts?.find((d) => d.id === key)?.musicTitle ?? initial.music?.title ?? ""); const [musicUrl, setMusicUrl] = useState(() => journalSnapshot.drafts?.find((d) => d.id === key)?.musicUrl ?? initial.music?.url ?? "");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState(""); const [discarding, setDiscarding] = useState(false);
  const finished = useRef(false); const noteRef = useRef<HTMLTextAreaElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const currentEntry = () => ({ value, musicTitle, musicUrl });
  const typingGroup = useRef({ field: "", time: 0 });
  const remember = (field = "") => { const now = performance.now(); if (!field || field !== typingGroup.current.field || now - typingGroup.current.time > 750) setHistory((h) => [...h.slice(-29), currentEntry()]); typingGroup.current = { field, time: now }; setFuture([]); };
  const change = (patch: Partial<JourneyMoment>) => { const keys = Object.keys(patch); remember(keys.length === 1 && ["title", "originalExcerpt", "myNote"].includes(keys[0]) ? keys[0] : ""); setValue({ ...value, ...patch }); };
  const applyEntry = (entry: HistoryEntry) => { setValue(entry.value); setMusicTitle(entry.musicTitle); setMusicUrl(entry.musicUrl); };
  const draft = JSON.stringify(value);
  useEffect(() => {
    if (finished.current) return;
    if (!hadDraft && draft === baseline && musicTitle === (initial.music?.title ?? "") && musicUrl === (initial.music?.url ?? "")) {
      updateJournal((current) => current.drafts?.some((d) => d.id === key) ? { ...current, drafts: current.drafts.filter((d) => d.id !== key) } : current);
      return;
    }
    const next = JSON.parse(draft) as JourneyMoment;
    // Drafts never grant memory permission, even when a confirmation checkbox is checked.
    next.consent = { ...next.consent, useInAiContext: false, includeMyNoteInAiContext: false };
    updateJournal((current) => ({ ...current, drafts: [...(current.drafts ?? []).filter((d) => d.id !== key), { id: key, value: next, musicTitle, musicUrl, updatedAt: new Date().toISOString() }] }));
  }, [draft, key, updateJournal, musicTitle, musicUrl, baseline, hadDraft, initial.music?.title, initial.music?.url]);
  const removeDraft = () => updateJournal((current) => ({ ...current, drafts: (current.drafts ?? []).filter((d) => d.id !== key) }));
  const switchMode = (next: typeof mode) => { setMode(next); requestAnimationFrame(() => { if (body.current) body.current.scrollTop = 0; }); };
  const placements = value.stickerPlacements ?? [];
  const selection = placements.find((p) => `sticker:${p.id}` === selected);
  const transform = (id: string, next: PageTransform) => change({ pageTransforms: { ...value.pageTransforms, [id]: next } });
  const save = () => {
    if (finished.current) return;
    if (!value.originalExcerpt.trim() || !Number.isFinite(Date.parse(value.occurredAt)) || momentDay(value) > localDate()) { setError("Add your words and choose today or an earlier date."); return; }
    if (!moment && !activeIdentity) { setError("Choose a direction before keeping this moment."); return; }
    if ((musicTitle.trim() || musicUrl.trim()) && (!safeMusicUrl(musicUrl.trim()) || !musicTitle.trim())) { setError("Add a song title and a supported HTTPS music link, or clear both fields."); return; }
    const stamp = new Date().toISOString();
    const next: JourneyMoment = { ...value, title: value.title?.trim() || "An ordinary moment", originalExcerpt: value.originalExcerpt.trim(), myNote: value.myNote?.trim() || undefined,
      music: musicUrl.trim() ? { title: musicTitle.trim(), url: musicUrl.trim() } : undefined,
      revisitAt: moment?.revisitAt ?? addMonths(value.occurredAt, 6), stickers: undefined,
      consent: moment?.consent ?? buildSavedMomentConsent({ useInAiContext: context, includeMyNoteInAiContext: noteContext, note: value.myNote }, stamp) };
    finished.current = true;
    updateJournal((current) => ({ ...current, moments: keepMoment(current.moments, next), drafts: current.drafts?.filter((d) => d.id !== key) }));
    onSaved(next.id);
  };
  const editable = !moment || moment.kind === "personal";
  return <section className="echo-editor">
    <header className="echo-space-header"><button className="echo-icon-button" aria-label="Keep draft and go back" disabled={mediaBusy} onClick={onClose}><BackIcon /></button><h2>{moment ? "Make it yours" : "A page of your own"}</h2><button className="echo-button lilac compact" onClick={save} disabled={mediaBusy || !value.originalExcerpt.trim()}>Done</button></header>
    <div className="journal-editor-history"><button className="echo-text-button" disabled={!history.length} onClick={() => { const previous = history.at(-1); if (previous) { setFuture([...future, currentEntry()]); applyEntry(previous); setHistory(history.slice(0, -1)); } }}>Undo</button><button className="echo-text-button" disabled={!future.length} onClick={() => { const next = future.at(-1); if (next) { setHistory([...history, currentEntry()]); applyEntry(next); setFuture(future.slice(0, -1)); } }}>Redo</button><span>Draft stays private</span></div>
    <div ref={body} className={`echo-editor-body ${mode === "arrange" ? "echo-layout-preview" : ""}`}>
      {mode === "fonts" && <div className="echo-editor-options"><FontPicker value={value.noteFont ?? "handwritten"} onChange={(noteFont) => change({ noteFont })} /><p className="echo-muted">Notes and captions use your chosen style. Original conversation text keeps its readable type.</p></div>}
      {mode === "arrange" && <div className="echo-placement-tools"><h3>Arrange your page</h3><p>Drag to move. Pinch and twist with two fingers, or use the corner and round handles. Keyboard: arrows · + / − · [ / ] · Escape.</p><DecorationPicker onBusyChange={setMediaBusy} count={placements.length} onAdd={(item) => { change({ stickerPlacements: [...placements, item] }); setSelected(`sticker:${item.id}`); }} />
        {selection && <button className="echo-text-button danger" onClick={() => { change({ stickerPlacements: placements.filter((p) => p.id !== selection.id), pageTransforms: Object.fromEntries(Object.entries(value.pageTransforms ?? {}).filter(([id]) => id !== selected)) }); setSelected(null); }}>Remove sticker</button>}
        {selected && <div className="journal-tabs"><button type="button" onClick={() => change({ pageLayers: moveLayer(value.pageLayers ?? [], pageObjectIds(value), selected, "front") })}>Bring to front</button><button type="button" onClick={() => change({ pageLayers: moveLayer(value.pageLayers ?? [], pageObjectIds(value), selected, "back") })}>Send to back</button></div>}{selected && <button className="echo-text-button" onClick={() => transform(selected, { x: 0, y: 0, scale: 1, rotation: 0 })}>Reset selected position</button>}<button className="echo-text-button" onClick={() => change({ pageTransforms: {} })}>Reset page layout</button><p>{placements.length} / 12 decorations</p></div>}
      {mode === "extras" && <div className="journal-extras"><h3>A little atmosphere</h3><fieldset><legend>Paper</legend><div className="journal-tabs">{(["plain", "ruled", "grid", "blush"] as const).map((paper) => <button key={paper} aria-pressed={(value.paper ?? "plain") === paper} onClick={() => change({ paper })}>{paper}</button>)}</div></fieldset><label>Song title<input maxLength={120} value={musicTitle} onChange={(e) => { remember(); setMusicTitle(e.target.value); }} placeholder="A song that belongs here" /></label><label>Music link<input type="url" value={musicUrl} maxLength={2048} onChange={(e) => { remember(); setMusicUrl(e.target.value); }} placeholder="https://open.spotify.com/…" /></label><p>Spotify, YouTube, Apple Music, SoundCloud or Bandcamp. Opens only when you choose; no autoplay.</p><button className="echo-button outline" onClick={() => { if (!musicTitle.trim() || !safeMusicUrl(musicUrl.trim())) { setError("Use a song title and a supported HTTPS music link."); return; } change({ music: { title: musicTitle.trim(), url: musicUrl.trim() } }); setError(""); }}>Keep song on page</button><button className="echo-text-button" onClick={() => { setMusicTitle(""); setMusicUrl(""); change({ music: undefined }); }}>Remove song</button></div>}
      {mode === "arrange" || mode === "fonts" ? <MomentPaper moment={{ ...value, title: value.title || "Your page", originalExcerpt: value.originalExcerpt || "Your words will appear here." }} pageEditing={mode === "arrange" ? { selected, onSelect: setSelected, onChange: transform } : undefined} /> : mode === "write" ? <div className={`echo-paper editor-paper paper-${value.paper ?? "plain"}`} data-note-font={value.noteFont}>
        <label className="sr-only" htmlFor="moment-title">Moment title</label><input id="moment-title" className="paper-title-input" placeholder="Give this moment a name" maxLength={80} value={value.title ?? ""} onChange={(e) => change({ title: e.target.value })} />
        {!moment ? <label className="paper-date-label">Date<input aria-label="Moment date" type="date" value={momentDay(value)} max={localDate()} onChange={(e) => { if (e.target.value) change({ calendarDate: e.target.value, occurredAt: `${e.target.value}T00:00:00.000Z` }); }} /></label> : <p className="paper-date">{new Date(value.occurredAt).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" })}</p>}
        <div className="paper-photos">{value.photos?.map((photo) => <figure key={photo.id} className="paper-polaroid"><FramedPhoto src={photo.src} alt={photo.caption || "Photo in this moment"} crop={photo.crop} /><button type="button" className="echo-text-button" onClick={() => setFraming(framing === photo.id ? undefined : photo.id)}>Frame photo</button>{framing === photo.id && <PhotoFraming src={photo.src} value={photo.crop} onChange={(crop) => change({ photos: value.photos?.map((p) => p.id === photo.id ? { ...p, crop } : p) })} />}<input className="note-styled" aria-label="Photo caption" placeholder="A little caption…" maxLength={120} value={photo.caption} onChange={(e) => change({ photos: value.photos?.map((p) => p.id === photo.id ? { ...p, caption: e.target.value } : p) })} /><button className="photo-remove" aria-label="Remove photo" onClick={() => change({ photos: value.photos?.filter((p) => p.id !== photo.id), pageTransforms: Object.fromEntries(Object.entries(value.pageTransforms ?? {}).filter(([id]) => id !== `photo:${photo.id}`)) })}><CloseIcon /></button></figure>)}</div>
        <label className="paper-label">My words{editable ? <textarea className="paper-writing" placeholder="What happened? What do you want to remember?" rows={4} maxLength={editable ? MAX_JOURNAL_LENGTH : MAX_EXCERPT_LENGTH} value={value.originalExcerpt} onChange={(e) => change({ originalExcerpt: e.target.value })} /> : <p className="paper-original">{value.originalExcerpt}</p>}</label>
        {value.relatedAiReply && <div className="paper-reply"><span>From our conversation</span><p>{value.relatedAiReply}</p></div>}
        <label className="paper-label">My Note · optional<textarea ref={noteRef} className="paper-writing note-styled" rows={2} maxLength={MAX_JOURNAL_NOTE_LENGTH} value={value.myNote ?? ""} onChange={(e) => { change({ myNote: e.target.value }); if (!e.target.value.trim()) setNoteContext(false); }} placeholder="A thought to keep alongside it…" /></label>
      </div> : null}
      {!moment && <fieldset className="echo-consent"><legend>Your choice</legend><p>A draft is private. Only Done confirms a moment. A long page shares at most its first 2,000 characters with the model; a permitted note at most 500.</p><label><input type="checkbox" checked={context} onChange={(e) => { setContext(e.target.checked); if (!e.target.checked) setNoteContext(false); }} />Allow my saved words in future AI context</label>{context && value.myNote?.trim() && <label><input type="checkbox" checked={noteContext} onChange={(e) => setNoteContext(e.target.checked)} />Also allow My Note</label>}</fieldset>}
      {moment && <p className="echo-muted editor-provenance">{editable ? "Your journal words can be edited. Dates and permissions stay with this moment." : "Original conversation words and reply stay unchanged."}</p>}
      <p className="echo-muted">{value.originalExcerpt.length.toLocaleString()} / {editable ? "20,000" : "2,000"} characters · notes up to 2,000. Conversation evidence stays unchanged.</p>{error && <p role="alert" className="echo-error">{error}</p>}<JournalStorageStatus /><p className="echo-preview-note">Draft saves on this device. Done keeps the finished page. Back keeps the draft.</p>
      {!discarding ? <button className="echo-text-button danger" onClick={() => setDiscarding(true)}>Discard draft</button> : <div className="journal-confirm"><p>Discard these unfinished changes? An existing saved moment stays unchanged.</p><button className="echo-button danger" onClick={() => { finished.current = true; removeDraft(); onClose(); }}>Confirm discard draft</button><button className="echo-text-button" onClick={() => setDiscarding(false)}>Keep writing</button></div>}
    </div>
    <footer className="echo-editor-toolbar"><PhotoPicker onBusyChange={setMediaBusy} photos={value.photos ?? []} onChange={(photos) => { change({ photos }); switchMode("write"); }} /><button className="echo-toolbar-button" aria-pressed={mode === "arrange"} onClick={() => switchMode(mode === "arrange" ? "write" : "arrange")}><StarIcon /><span>Arrange</span></button><button className="echo-toolbar-button" aria-pressed={mode === "fonts"} onClick={() => switchMode(mode === "fonts" ? "write" : "fonts")}><span className="note-glyph" aria-hidden="true">Aa</span><span>Font</span></button><button className="echo-toolbar-button" aria-pressed={mode === "extras"} onClick={() => switchMode(mode === "extras" ? "write" : "extras")}><span className="note-glyph" aria-hidden="true">♫</span><span>Paper & song</span></button><button className="echo-toolbar-button" onClick={() => { switchMode("write"); requestAnimationFrame(() => noteRef.current?.focus()); }}><span className="note-glyph" aria-hidden="true">✎</span><span>Note</span></button></footer>
  </section>;
}
