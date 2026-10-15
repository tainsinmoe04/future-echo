"use client";
import { useRef, useState } from "react";
import type { StickerName, StickerPlacement } from "@/lib/domain";
import { DECORATIONS } from "@/lib/journal-features";
import { readRasterFile } from "@/lib/journal-media";
import { newSticker } from "@/lib/scrapbook";
import { Sticker } from "./sticker";

export function DecorationPicker({ count, onAdd, onBusyChange }: { count: number; onAdd: (sticker: StickerPlacement) => void; onBusyChange?: (busy: boolean) => void }) {
  const [category, setCategory] = useState("Stickers"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const items = DECORATIONS.filter((name) => category === "Tapes" ? name.startsWith("tape-") : category === "Clips" ? name.startsWith("clip-") : !name.startsWith("tape-") && !name.startsWith("clip-"));
  const add = (name: StickerName, src?: string) => onAdd({ ...newSticker(crypto.randomUUID(), name, count), ...(src ? { src } : {}) });
  return <div className="journal-decoration-picker"><div className="journal-tabs" aria-label="Decoration categories">{["Stickers", "Tapes", "Clips"].map((tab) => <button key={tab} aria-pressed={category === tab} onClick={() => setCategory(tab)}>{tab}</button>)}</div>
    <div className="echo-sticker-picker" aria-label="Choose a sticker">{items.map((name) => <button key={name} type="button" aria-label={`Add ${name} sticker`} disabled={busy || count >= 12} onClick={() => add(name)}><span className="journal-decoration-preview"><Sticker name={name} /></span><span>{name.replace(/-/g, " ")}</span></button>)}</div>
    <input type="file" className="sr-only" tabIndex={-1} aria-label={category === "Tapes" ? "Upload custom tape" : "Upload custom sticker"} accept="image/png,image/jpeg,image/webp" ref={file} onChange={async (e) => { const image = e.target.files?.[0]; const kind = category === "Tapes" ? "custom-tape" : "custom"; e.target.value = ""; if (!image || count >= 12) return; setBusy(true); onBusyChange?.(true); setError(""); try { add(kind, await readRasterFile(image)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); onBusyChange?.(false); } }} />
    <div className="journal-decoration-upload"><button className="echo-button outline" disabled={busy || count >= 12} onClick={() => file.current?.click()}>{busy ? "Opening image…" : category === "Tapes" ? "Upload your own tape" : "Upload your own sticker"}</button><p className="echo-muted">{category === "Tapes" ? "Your image becomes a tape strip. Move, resize and turn it on the page." : "PNG keeps transparency · JPG / WebP also work · up to 5 MiB"}</p></div>{error && <p role="alert" className="echo-error">{error}</p>}
  </div>;
}
