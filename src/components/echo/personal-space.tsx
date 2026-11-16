"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useJournalState } from "@/components/mock-product-state";
import { constellationPosition, memoryBooks } from "@/lib/personal-space";
import { BackIcon, BookIcon, PlusIcon, SettingsIcon } from "./icons";
import { MemoryBook } from "./memory-book";
import { MomentEditor } from "./moment-editor";
import { SpaceSettings } from "./space-settings";
import { JournalStorageStatus } from "./journal-storage-status";
import { BookCover, BookDesigner } from "./book-designer";
import { isPreviewExample } from "@/lib/mock-messenger";
import { findMoments } from "@/lib/journal-tools";
import { momentDay } from "@/lib/local-date";
import { defaultBook, orderedPages } from "@/lib/journal-features";
import { PlaylistCard } from "./playlist-card";
import { AccountPill } from "./account-pill";
import { JOURNAL_SYNC_COPY } from "@/lib/journal-sync";

export function PersonalSpace({ onClose, initialMomentId, initialCreate = false }: {
  onClose: () => void; initialMomentId?: string; initialCreate?: boolean;
}) {
  const { moments, activeIdentity, journalSnapshot, updateJournal, journalSync } = useJournalState();
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [designing, setDesigning] = useState<string>();
  const [draftId, setDraftId] = useState<string>();
  const [selected, setSelected] = useState<string | undefined>(initialMomentId);
  const [adding, setAdding] = useState(initialCreate);
  const [settings, setSettings] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const returnSettingsFocus = useRef(false);
  useEffect(() => {
    if (!settings && returnSettingsFocus.current) {
      settingsButton.current?.focus();
      returnSettingsFocus.current = false;
    }
  }, [settings]);
  const [selectedYear, setSelectedYear] = useState<string>();
  const books = useMemo(() => memoryBooks(moments).map((book) => ({ ...book, moments: orderedPages(book.moments, journalSnapshot.books?.[book.year]?.order) })), [moments, journalSnapshot.books]);
  const matches = useMemo(() => findMoments(moments, query, yearFilter, monthFilter).toSorted((a, b) => momentDay(b).localeCompare(momentDay(a))), [moments, query, yearFilter, monthFilter]);
  const filtering = Boolean(query.trim() || yearFilter || monthFilter);
  const moment = moments.find((item) => item.id === selected);
  const ordered = books.flatMap((book) => book.moments);
  const stars = [...moments].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const points = stars.map((item) => ({ ...constellationPosition(item.id), id: item.id, title: item.title ?? "A moment worth keeping" }));

  if (designing) return <BookDesigner year={designing} onClose={() => setDesigning(undefined)} />;
  if (adding) return <MomentEditor draftId={draftId} hideTemplates={initialCreate} moment={draftId ? moments.find((m) => m.id === draftId) : undefined} onClose={() => { setAdding(false); setDraftId(undefined); }} onSaved={(id) => { setAdding(false); setDraftId(undefined); setSelected(id); }} />;
  if (moment) return <MemoryBook key={moment.id} moment={moment} entries={ordered} onSelect={setSelected} onClose={() => setSelected(undefined)} />;
  if (settings) return <SpaceSettings onClose={() => { returnSettingsFocus.current = true; setSettings(false); }} />;

  return <section className="echo-personal-space">
    <header className="echo-space-header"><button className="echo-icon-button" aria-label="Return to conversation" onClick={onClose}><BackIcon /></button><h1>Your Space</h1><div className="echo-header-end"><AccountPill /><button ref={settingsButton} className="echo-icon-button" aria-label="Space settings" aria-expanded={settings} onClick={() => setSettings(!settings)}><SettingsIcon /></button></div></header>
    <div className="echo-space-scroll">
      <section className="memory-search" aria-label="Find your moments"><label>Search saved moments<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="A word, a feeling, a little title…" /></label><div className="memory-search-filters"><label>Year<select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setMonthFilter(""); }}><option value="">All years</option>{books.map((book) => <option key={book.year} value={book.year}>{book.year}</option>)}</select></label><label>Jump to month<input type="month" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setYearFilter(""); }} /></label></div>{filtering && <div className="memory-results"><p role="status">{matches.length} matching moments</p><button className="echo-text-button" onClick={() => { setQuery(""); setYearFilter(""); setMonthFilter(""); }}>Clear search and dates</button>{matches.map((item) => <button key={item.id} onClick={() => setSelected(item.id)}><time>{momentDay(item)}</time><span>{item.title || "A moment worth keeping"}</span></button>)}{!matches.length && <p className="echo-muted">Nothing here matches yet. Your other pages are still below.</p>}</div>}</section>
      <section className="echo-constellation" aria-label="Your saved moments constellation">
        <p>{moments.length ? "Moments you chose to keep" : "A little space for what matters"}</p>
        {points.length ? <div className="constellation-map">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} /></svg>
          {points.map((point, index) => <button key={point.id} className={`constellation-star ${index % 2 ? "lilac-star" : ""}`} style={{ left: `${point.x}%`, top: `${point.y}%` }} aria-label={`Open moment: ${point.title}`} onClick={() => setSelected(point.id)}><i /><span>{point.title}</span></button>)}
        </div> : <div className="constellation-empty"><p>Each moment you choose to save becomes a star.<br />There is no pace to keep up with.</p></div>}
      </section>
      <Link href={activeIdentity ? "/future-self" : "/onboarding"} className="echo-direction"><div><span>My direction</span><p>{activeIdentity?.definition ?? "Choose a possible future"}</p></div><BackIcon className="turn-around" /></Link>
      {!!journalSnapshot.drafts?.length && <section className="journal-drafts"><h2>Still becoming</h2><p>Private drafts · no stars until you choose Done.</p>{journalSnapshot.drafts.map((draft) => <div key={draft.id}><button onClick={() => { setDraftId(draft.id); setAdding(true); }}><span>{draft.value.title || "An unfinished page"}</span><small>Continue writing ↗</small></button><button className="echo-icon-button" aria-label={`Discard draft ${draft.value.title || "An unfinished page"}`} onClick={() => { if (window.confirm("Discard this unfinished draft? Saved moments stay unchanged.")) updateJournal((current) => ({ ...current, drafts: current.drafts?.filter((d) => d.id !== draft.id) })); }}>×</button></div>)}</section>}
      {books.length ? <section className="echo-books" aria-label="Your memory books">
        <h2 className="sr-only">Your memory books</h2>
        <div className="echo-book-carousel">{books.map((book) => {
          const photo = book.moments.flatMap((item) => item.photos ?? [])[0];
          return <div key={book.year} className="journal-book-tile"><button className="journal-open-cover" aria-label={`Open ${book.year} memory book`} onClick={() => { setSelectedYear(book.year); setSelected(book.moments[0].id); }}><BookCover year={book.year} style={journalSnapshot.books?.[book.year] ?? { ...defaultBook(book.year), photo: photo?.src }} /></button><button className="echo-text-button" onClick={() => setDesigning(book.year)}>Customize {book.year} book</button></div>;
        })}</div>
      </section> : <section className="echo-empty-books"><BookIcon /><h2>Your first page can be anything.</h2><p>A photo. A conversation. An ordinary day you want to keep.</p></section>}
      <div className="echo-space-actions"><button className="echo-button white" onClick={() => setAdding(true)} disabled={!activeIdentity}><PlusIcon />Add a moment</button>{books.length > 0 && <button className="echo-button outline" onClick={() => setSelected((books.find((book) => book.year === selectedYear) ?? books[0]).moments[0].id)}><BookIcon />Open book</button>}</div>
      {!activeIdentity && <p className="echo-muted"><Link href="/onboarding">Choose a direction</Link> to add new moments. Your previous moments are still here.</p>}
      <p className="echo-preview-note">Your chosen moments · {JOURNAL_SYNC_COPY[journalSync.status]}{moments.some(isPreviewExample) ? " · Includes examples kept from an earlier preview" : ""}</p>
      {!!Object.keys(journalSnapshot.bookDrafts ?? {}).length && <p className="echo-muted">Unfinished covers: {Object.keys(journalSnapshot.bookDrafts ?? {}).join(", ")}. Open Customize to continue.</p>}
      <JournalStorageStatus />
      {!!journalSnapshot.playlists?.length && <section className="echo-saved-playlists"><h2>Music you kept</h2><p className="echo-muted">A separate collection. No stars, streaks or AI memory.</p>{journalSnapshot.playlists.map((playlist) => <details key={playlist.id}><summary>{playlist.title}</summary><PlaylistCard playlist={playlist} messageId={playlist.sourceMessageId} saved={playlist} /></details>)}</section>}
      {ordered.length > 0 && <details className="echo-moment-index"><summary>All saved moments · {ordered.length}</summary>{books.map((book) => <div key={book.year}><h3>{book.year}</h3>{book.moments.map((item) => <button key={item.id} onClick={() => setSelected(item.id)}><time>{new Date(`${momentDay(item)}T12:00:00Z`).toLocaleDateString("en-US", { day: "numeric", month: "short", timeZone: "UTC" })}</time><span>{item.title || "A moment worth keeping"}</span></button>)}</div>)}</details>}
    </div>
  </section>;
}
