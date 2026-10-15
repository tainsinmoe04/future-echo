"use client";
import { useEffect, useRef } from "react";
import type { JourneyMoment, StickerPlacement } from "@/lib/domain";
import { boundSticker, stickersForMoment } from "@/lib/scrapbook";
import { StickerLayer, type StickerEditing } from "./sticker-layer";
import { PageObject, type PageEditing } from "./page-object";
import { Sticker } from "./sticker";

export function MomentPaper({ moment, placements = stickersForMoment(moment), editing, pageEditing }: {
  moment: JourneyMoment; placements?: readonly StickerPlacement[]; editing?: StickerEditing; pageEditing?: PageEditing;
}) {
  const page = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      element.style.setProperty("--page-width", `${element.clientWidth}px`);
      element.style.setProperty("--page-height", `${element.clientHeight}px`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const objectProps = (id: string, label: string) => ({ id, label, editing: pageEditing, value: moment.pageTransforms?.[id] });
  const suppressPlacementClick = useRef(false);
  return <article ref={page} className={`echo-paper paper-${moment.paper ?? "plain"} ${editing ? "arranging-stickers" : ""}`} data-note-font={moment.noteFont ?? "handwritten"} aria-label={moment.title || "Saved moment"}
    onPointerDownCapture={() => { suppressPlacementClick.current = false; }}
    onClickCapture={(event) => {
      // A released/cancelled drag can dispatch a click on the page, not the sticker.
      // Do not mistake that synthetic click for the separate tap-to-place action.
      if (suppressPlacementClick.current && event.detail > 0) {
        event.preventDefault(); event.stopPropagation(); suppressPlacementClick.current = false;
      }
    }}
    onClick={(event) => {
      if (!editing?.selected || (event.target as Element).closest(".placed-sticker")) return;
      const rect = event.currentTarget.getBoundingClientRect();
      editing.onChange(placements.map((item) => item.id === editing.selected ? boundSticker({ ...item, x: (event.clientX - rect.left) / rect.width * 100, y: (event.clientY - rect.top) / rect.height * 100 }, rect.width, rect.height) : item));
    }}>
    <div className="paper-rings" aria-hidden="true">{[0, 1, 2, 3, 4].map((ring) => <i key={ring} />)}</div>
    <header className="paper-heading"><h1>{moment.title || "A moment worth keeping"}</h1><time dateTime={moment.occurredAt}>{new Date(moment.occurredAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time></header>
    <div className="paper-photos">{moment.photos?.map((photo) => <PageObject page={page} key={photo.id} {...objectProps(`photo:${photo.id}`, "Photo")}><figure className="paper-polaroid">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={photo.caption || "A photo chosen for this moment"} draggable={false} />
      {photo.caption && <figcaption className="note-styled">{photo.caption}</figcaption>}
    </figure></PageObject>)}</div>
    <PageObject page={page} {...objectProps("words", "My words")}><section className="paper-text"><h2>My words</h2><p className="paper-original">{moment.originalExcerpt}</p></section></PageObject>
    {moment.relatedAiReply && <PageObject page={page} {...objectProps("reply", "Conversation reply")}><section className="paper-reply"><h2>From our conversation</h2><p>{moment.relatedAiReply}</p></section></PageObject>}
    {moment.myNote && <PageObject page={page} {...objectProps("note", "My Note")}><section className="paper-note"><h2>My Note</h2><p className="note-styled">{moment.myNote}</p></section></PageObject>}
    <p className="paper-footnote">Kept by you · {moment.consent.useInAiContext ? "Saved words allowed in AI context" : "Not shared as AI context"}</p>
    {moment.music && <a className="journal-music-link" href={moment.music.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><span aria-hidden="true">♫</span><span><small>A song for this page · opens music site</small><strong>{moment.music.title}</strong></span><span aria-hidden="true">↗</span></a>}
    {pageEditing || moment.pageTransforms ? <div className="echo-sticker-layer direct-stickers">{placements.map((item) => <PageObject page={page} key={item.id} {...objectProps(`sticker:${item.id}`, `${item.name} sticker`)} className="direct-sticker" style={{ position: "absolute", left: `${item.x}%`, top: `${item.y}%`, width: `${item.size}%` }}><span style={{ display: "block", width: "100%", height: "100%", transform: `rotate(${item.rotation}deg)` }}><Sticker name={item.name} src={item.src} /></span></PageObject>)}</div>
      : <StickerLayer page={page} placements={placements} editing={editing} onPointerStart={() => { suppressPlacementClick.current = true; }} />}
  </article>;
}
