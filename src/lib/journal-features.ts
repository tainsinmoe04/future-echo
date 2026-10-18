import type { JourneyMoment, NoteFont, PageTransform, StickerPlacement, PhotoCrop } from "./domain";

export const DECORATIONS = ["flower", "shoes", "hearts", "star", "daisy", "moon", "sparkle", "leaf", "cherry", "bow", "stamp", "ticket", "tape-butter", "tape-lilac", "tape-grid", "tape-rose", "clip-silver", "clip-gold", "clip-heart"] as const;
export const COVER_THEMES = ["butter", "cobalt", "rose", "sage", "ink", "gingham"] as const;
export interface BookStyle {
  photoCrop?: PhotoCrop;
  layers?: readonly string[];
  photoMode?: "full" | "inset";
  title: string;
  subtitle: string;
  theme: typeof COVER_THEMES[number];
  noteFont: NoteFont;
  photo?: string;
  placements: readonly StickerPlacement[];
  transforms: Readonly<Record<string, PageTransform>>;
  order: readonly string[];
}
export interface JournalDraft { id: string; value: JourneyMoment; updatedAt: string; musicTitle?: string; musicUrl?: string }
export const defaultBook = (year: string): BookStyle => ({ title: "little things, big feelings", subtitle: year, theme: "butter", noteFont: "book", placements: [], transforms: {}, order: [] });

/** Navigation only; never fetch or embed a remote player automatically. */
export function safeMusicUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && (["open.spotify.com", "music.apple.com", "www.youtube.com", "youtube.com", "youtu.be", "music.youtube.com", "soundcloud.com", "www.soundcloud.com", "bandcamp.com"].includes(host) || /^[a-z0-9-]+\.bandcamp\.com$/.test(host));
  } catch { return false; }
}

export function orderedPages(moments: readonly JourneyMoment[], order: readonly string[] = []) {
  const ranks = new Map(order.map((id, index) => [id, index]));
  return [...moments].sort((a, b) => (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity) || b.occurredAt.localeCompare(a.occurredAt));
}
