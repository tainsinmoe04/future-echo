"use client";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { StickerPlacement } from "@/lib/domain";
import { boundSticker, moveSticker } from "@/lib/scrapbook";
import { Sticker } from "./sticker";

export interface StickerEditing {
  selected: string | null;
  onSelect: (id: string) => void;
  onChange: (next: readonly StickerPlacement[]) => void;
}

export function StickerLayer({ page, placements, editing, onPointerStart }: {
  page: RefObject<HTMLElement | null>; placements: readonly StickerPlacement[]; editing?: StickerEditing; onPointerStart?: () => void;
}) {
  const instructions = useId();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [announcement, setAnnouncement] = useState("");
  const drag = useRef<{ pointer: number; item: StickerPlacement; x: number; y: number; next: StickerPlacement } | null>(null);
  useEffect(() => {
    const element = page.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [page]);

  const commit = (next: StickerPlacement) => {
    editing?.onChange(placements.map((item) => item.id === next.id ? next : item));
    setAnnouncement(`${next.name} placed. ${Math.round(next.x)} percent across, ${Math.round(next.y)} percent down.`);
  };
  const resetDrag = (element: HTMLButtonElement, cancel: boolean) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    element.style.transform = `translate(-50%, -50%) rotate(${current.item.rotation}deg)`;
    element.removeAttribute("data-dragging");
    if (element.hasPointerCapture(current.pointer)) element.releasePointerCapture(current.pointer);
    if (!cancel) commit(current.next);
    else setAnnouncement("Move cancelled.");
  };

  return <div className={`echo-sticker-layer ${editing ? "is-editing" : ""}`}>
    {editing && <span id={instructions} className="sr-only">Drag to move. Or use arrow keys; hold Shift for larger steps. Delete removes the sticker. Escape cancels a drag. You can also select a sticker and tap the page to place it.</span>}
    {placements.map((raw) => {
      const item = boundSticker(raw, size.width, size.height);
      const style = { left: `${item.x}%`, top: `${item.y}%`, width: `${item.size}%`, transform: `translate(-50%, -50%) rotate(${item.rotation}deg)` };
      return editing ? <button key={item.id} type="button" className="placed-sticker" style={style}
        aria-label={`${item.name} sticker`} aria-pressed={editing.selected === item.id} aria-describedby={instructions}
        onClick={(event) => { event.stopPropagation(); editing.onSelect(item.id); }}
        onFocus={() => editing.onSelect(item.id)}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0 || drag.current) return;
          event.preventDefault(); event.stopPropagation();
          onPointerStart?.();
          event.currentTarget.focus({ preventScroll: true });
          editing.onSelect(item.id);
          drag.current = { pointer: event.pointerId, item, next: item, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.setAttribute("data-dragging", "true");
        }}
        onPointerMove={(event) => {
          const current = drag.current;
          if (!current || current.pointer !== event.pointerId) return;
          current.next = moveSticker(current.item, event.clientX - current.x, event.clientY - current.y, size.width, size.height);
          const dx = (current.next.x - current.item.x) / 100 * size.width;
          const dy = (current.next.y - current.item.y) / 100 * size.height;
          event.currentTarget.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${item.rotation}deg)`;
        }}
        onPointerUp={(event) => { if (drag.current?.pointer === event.pointerId) resetDrag(event.currentTarget, false); }}
        onPointerCancel={(event) => { if (drag.current?.pointer === event.pointerId) resetDrag(event.currentTarget, true); }}
        onLostPointerCapture={(event) => { if (drag.current?.pointer === event.pointerId) resetDrag(event.currentTarget, true); }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && drag.current) { event.preventDefault(); event.stopPropagation(); resetDrag(event.currentTarget, true); return; }
          if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); editing.onChange(placements.filter((other) => other.id !== item.id)); setAnnouncement(`${item.name} removed. Undo is available.`); return; }
          const direction: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
          const delta = direction[event.key];
          if (!delta) return;
          event.preventDefault();
          const step = event.shiftKey ? 10 : 2;
          commit(moveSticker(item, delta[0] * step, delta[1] * step, size.width, size.height));
        }}><Sticker name={item.name} src={item.src} /></button>
        : <span key={item.id} className="placed-sticker" style={style}><Sticker name={item.name} src={item.src} /></span>;
    })}
    {editing && <span className="sr-only" role="status">{announcement}</span>}
  </div>;
}
