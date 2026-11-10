/* eslint-disable @next/next/no-img-element -- Local user raster images must not use an external optimizer. */
import type { StickerName } from "@/lib/domain";
export function Sticker({ name, className = "", src }: { name: StickerName; className?: string; src?: string }) {
  const artwork: Partial<Record<StickerName, string>> = { "ribbon-key": "/journal/ribbon-key.png", "antique-frame": "/journal/antique-frame.png", "lace-trim": "/journal/ivory-lace.png" };
  if (artwork[name]) return <span className={`echo-sticker custom-sticker sticker-${name} ${className}`} aria-hidden="true"><img src={artwork[name]} alt="" draggable={false} /></span>;
  if ((name === "custom" || name === "custom-tape") && src) return <span className={`echo-sticker custom-sticker sticker-${name} ${className}`} aria-hidden="true"><img src={src} alt="" draggable={false} /></span>;
  if (name.startsWith("clip-")) return <span aria-hidden="true" className={`echo-sticker journal-decoration sticker-${name} ${className}`}><svg viewBox="0 0 80 100" fill="none" width="100%" height="100%"><path d={name === "clip-heart" ? "M40 78 15 47C-6 21 26 1 40 25 54 1 86 21 65 47L40 78 23 49C8 26 30 16 40 36 50 16 72 26 57 49L40 70" : "M25 35v42c0 25 37 25 37 0V23c0-30-50-30-50 0v53c0 16 25 16 25 0V31"} stroke="#5c5564" strokeWidth="8" strokeLinecap="round" transform="translate(1 2)" /><path d={name === "clip-heart" ? "M40 78 15 47C-6 21 26 1 40 25 54 1 86 21 65 47L40 78 23 49C8 26 30 16 40 36 50 16 72 26 57 49L40 70" : "M25 35v42c0 25 37 25 37 0V23c0-30-50-30-50 0v53c0 16 25 16 25 0V31"} stroke="currentColor" strokeWidth="5" strokeLinecap="round" /></svg></span>;
  const symbols: Partial<Record<StickerName, string>> = { daisy: "✿", moon: "☾", sparkle: "✦", leaf: "❧", cherry: "🍒", bow: "🎀", stamp: "POST", ticket: "a little memory", "clip-silver": "⌇", "clip-gold": "⌇", "clip-heart": "♡" };
  if (symbols[name] || name.startsWith("tape-")) return <span aria-hidden="true" className={`echo-sticker journal-decoration sticker-${name} ${className}`}>{symbols[name] ?? ""}</span>;
  return <span aria-hidden="true" className={`echo-sticker sticker-${name} ${className}`} />;
}
