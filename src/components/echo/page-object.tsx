"use client";
import { useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import type { PageTransform } from "@/lib/domain";
import { angle, boundTransform, DEFAULT_TRANSFORM, distance, gestureTransform, normalizeTransform, turn, type Point } from "@/lib/page-transform";

export interface PageEditing {
  selected: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, transform: PageTransform) => void;
}

export function PageObject({ id, label, value = DEFAULT_TRANSFORM, page, editing, children, className = "", style }: {
  id: string; label: string; value?: PageTransform; page: RefObject<HTMLElement | null>;
  editing?: PageEditing; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  const node = useRef<HTMLDivElement>(null);
  const points = useRef(new Map<number, Point>());
  const session = useRef<{ original: PageTransform; base: PageTransform; before: Point[]; next: PageTransform;
    mode: string; center: Point; baseCenter: Point; objectWidth: number; objectHeight: number; width: number; height: number } | null>(null);
  const [preview, setPreview] = useState<PageTransform | null>(null);
  const current = preview ?? value;
  const selected = editing?.selected === id;
  const finish = (cancel: boolean) => {
    const active = session.current;
    if (!active) return;
    session.current = null;
    for (const pointer of points.current.keys()) if (node.current?.hasPointerCapture(pointer)) node.current.releasePointerCapture(pointer);
    points.current.clear();
    if (!cancel) editing?.onChange(id, active.next);
    setPreview(null);
  };
  return <div className={`echo-page-object ${className} ${editing ? "editable" : ""} ${selected ? "selected" : ""}`} style={style}>
    <div ref={node} data-object={id} className="echo-object-content" role={editing ? "group" : undefined}
      tabIndex={editing ? 0 : undefined} aria-label={editing ? label : undefined}
      aria-description={editing ? "Drag to move. Pinch and turn with two fingers, or drag the resize and rotate handles. Arrow keys move, plus and minus resize, square brackets rotate. Escape cancels." : undefined}
      style={{ transform: `translate(calc(var(--page-width, 0px) * ${current.x / 100}), calc(var(--page-height, 0px) * ${current.y / 100})) rotate(${current.rotation}deg) scale(${current.scale})`, "--handle-scale": 1 / current.scale } as CSSProperties}
      onFocus={() => editing?.onSelect(id)}
      onClick={(event) => { if (editing) { event.stopPropagation(); editing.onSelect(id); } }}
      onPointerDown={(event) => {
        if (!editing || event.button !== 0 || points.current.size >= 2) return;
        event.preventDefault(); event.stopPropagation();
        editing.onSelect(id); event.currentTarget.focus({ preventScroll: true });
        const rect = page.current?.getBoundingClientRect();
        if (!rect) return;
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const active = session.current;
        const bounds = event.currentTarget.getBoundingClientRect();
        const next = active?.next ?? value;
        session.current = { original: active?.original ?? value, base: next, next,
          before: [...points.current.values()], mode: points.current.size === 2 ? "move" : (event.target as HTMLElement).closest<HTMLElement>("[data-handle]")?.dataset.handle ?? "move",
          center: { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
          baseCenter: { x: bounds.left + bounds.width / 2 - rect.left - next.x / 100 * rect.width, y: bounds.top + bounds.height / 2 - rect.top - next.y / 100 * rect.height },
          objectWidth: event.currentTarget.offsetWidth, objectHeight: event.currentTarget.offsetHeight, width: rect.width, height: rect.height };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const active = session.current;
        if (!active || !points.current.has(event.pointerId)) return;
        points.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const after = [...points.current.values()];
        let next = gestureTransform(active.base, active.before, after, active.width, active.height);
        if (after.length === 1 && active.mode !== "move") {
          next = normalizeTransform({ ...active.base,
            scale: active.mode === "resize" ? active.base.scale * distance(active.center, after[0]) / Math.max(5, distance(active.center, active.before[0])) : active.base.scale,
            rotation: active.mode === "rotate" ? active.base.rotation + turn(angle(active.center, after[0]) - angle(active.center, active.before[0])) : active.base.rotation });
        }
        next = boundTransform(next, active.baseCenter, active.objectWidth, active.objectHeight, active.width, active.height);
        active.next = next; setPreview(next);
      }}
      onPointerUp={(event) => {
        if (!session.current || !points.current.has(event.pointerId)) return;
        // End the whole gesture together; lifting either finger cannot jump the object.
        finish(false);
      }}
      onPointerCancel={() => finish(true)} onLostPointerCapture={() => finish(true)}
      onKeyDown={(event) => {
        if (!editing) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(true); return; }
        const step = event.shiftKey ? 5 : 1;
        const delta: Record<string, Partial<PageTransform>> = { ArrowLeft: { x: value.x - step }, ArrowRight: { x: value.x + step },
          ArrowUp: { y: value.y - step }, ArrowDown: { y: value.y + step }, "+": { scale: value.scale + 0.1 }, "=": { scale: value.scale + 0.1 },
          "-": { scale: value.scale - 0.1 }, "[": { rotation: value.rotation - 5 }, "]": { rotation: value.rotation + 5 } };
        if (delta[event.key]) { event.preventDefault(); event.stopPropagation(); editing.onChange(id, normalizeTransform({ ...value, ...delta[event.key] })); }
      }}>
      {children}
      {editing && selected && <>
        <button type="button" className="echo-transform-handle rotate" data-handle="rotate" aria-label={`Rotate ${label}`} onClick={(e) => { e.stopPropagation(); if (!e.detail) editing.onChange(id, normalizeTransform({ ...value, rotation: value.rotation + 15 })); }}>↻</button>
        <button type="button" className="echo-transform-handle resize" data-handle="resize" aria-label={`Resize ${label}`} onClick={(e) => { e.stopPropagation(); if (!e.detail) editing.onChange(id, normalizeTransform({ ...value, scale: value.scale + 0.1 })); }}>↗</button>
      </>}
    </div>
  </div>;
}
