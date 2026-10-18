"use client";
/* eslint-disable @next/next/no-img-element -- Private local raster images, never a remote optimizer. */
import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { PhotoCrop } from "@/lib/domain";
import { cropRatio, DEFAULT_CROP, normalizeCrop } from "@/lib/journal-tools";

export function FramedPhoto({ src, alt, crop, ratio }: { src: string; alt: string; crop?: PhotoCrop; ratio?: string }) {
  const value = crop ?? DEFAULT_CROP;
  return <span className={`photo-frame ${value.aspect === "original" && !ratio ? "original" : ""}`} style={{ aspectRatio: ratio ?? cropRatio(value) }}><img src={src} alt={alt} draggable={false} style={{ objectPosition: `${value.x}% ${value.y}%`, transform: `scale(${value.zoom})`, transformOrigin: `${value.x}% ${value.y}%` }} /></span>;
}

export function PhotoFraming({ src, value = DEFAULT_CROP, onChange, ratio }: { src: string; value?: PhotoCrop; onChange: (crop: PhotoCrop) => void; ratio?: string }) {
  const [preview, setPreview] = useState<PhotoCrop>();
  const points = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ value: PhotoCrop; x: number; y: number; distance: number; width: number; height: number; next: PhotoCrop } | undefined>(undefined);
  const distance = () => { const p = [...points.current.values()]; return p.length === 2 ? Math.hypot(p[1].x - p[0].x, p[1].y - p[0].y) : 0; };
  function finish(cancel = false) { const active = gesture.current; points.current.clear(); gesture.current = undefined; setPreview(undefined); if (active && !cancel) onChange(active.next); }
  return <section className="photo-framing" aria-label="Photo framing"><h3>Find the part you want to keep.</h3><p>Drag the photo to frame it. Pinch to zoom, or use the buttons. Your original image stays unchanged.</p><div className="photo-framing-stage" role="group" aria-label="Drag photo focal point" tabIndex={0}
    style={{ touchAction: "none" } as CSSProperties}
    onPointerDown={(event) => { if (event.button !== 0 || points.current.size >= 2) return; event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); points.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); const rect = event.currentTarget.getBoundingClientRect(), current = preview ?? value; gesture.current = { value: current, next: current, x: event.clientX, y: event.clientY, distance: distance(), width: rect.width, height: rect.height }; }}
    onPointerMove={(event) => { const active = gesture.current; if (!active || !points.current.has(event.pointerId)) return; points.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); active.next = normalizeCrop(points.current.size === 2 ? { ...active.value, zoom: active.value.zoom * distance() / Math.max(active.distance, 1) } : { ...active.value, x: active.value.x - (event.clientX - active.x) / active.width * 100, y: active.value.y - (event.clientY - active.y) / active.height * 100 }); setPreview(active.next); }}
    onPointerUp={() => finish()} onPointerCancel={() => finish(true)}
    onKeyDown={(event) => { const delta: Record<string, Partial<PhotoCrop>> = { ArrowLeft: { x: value.x - 5 }, ArrowRight: { x: value.x + 5 }, ArrowUp: { y: value.y - 5 }, ArrowDown: { y: value.y + 5 }, "+": { zoom: value.zoom + .1 }, "-": { zoom: value.zoom - .1 } }; if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(true); } else if (delta[event.key]) { event.preventDefault(); onChange(normalizeCrop({ ...value, ...delta[event.key] })); } }}>
      <FramedPhoto src={src} alt="Photo framing preview" crop={preview ?? value} ratio={ratio} />
    </div><div className="journal-tabs">{!ratio && (["portrait", "square", "landscape", "original"] as const).map((aspect) => <button type="button" key={aspect} aria-pressed={value.aspect === aspect} onClick={() => onChange({ ...value, aspect })}>{aspect}</button>)}<button type="button" aria-label="Zoom photo in" disabled={value.zoom >= 3} onClick={() => onChange(normalizeCrop({ ...value, zoom: value.zoom + .1 }))}>＋</button><button type="button" aria-label="Zoom photo out" disabled={value.zoom <= 1} onClick={() => onChange(normalizeCrop({ ...value, zoom: value.zoom - .1 }))}>−</button><button type="button" onClick={() => onChange({ ...DEFAULT_CROP })}>Reset photo framing</button></div>
  </section>;
}
