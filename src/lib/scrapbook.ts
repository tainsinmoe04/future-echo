import type { JourneyMoment, NoteFont, StickerName, StickerPlacement } from "./domain";

export const MAX_STICKERS = 12;
export const NOTE_FONTS: readonly { id: NoteFont; label: string; description: string }[] = [
  { id: "clean", label: "Clear", description: "Manrope · simple & readable" },
  { id: "soft", label: "Soft", description: "Nunito Sans · warm & rounded" },
  { id: "handwritten", label: "Handwritten", description: "Caveat · a personal touch" },
  { id: "book", label: "Bookish", description: "Lora · a little literary" },
];

export interface SpacePreferences {
  defaultNoteFont: NoteFont;
  readingSize: "regular" | "large";
  motion: "system" | "reduced";
}
export const DEFAULT_PREFERENCES: SpacePreferences = {
  defaultNoteFont: "handwritten", readingSize: "regular", motion: "system",
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;

export function normalizeSticker(item: StickerPlacement): StickerPlacement {
  return { ...item, x: clamp(finite(item.x, 50), 0, 100), y: clamp(finite(item.y, 50), 0, 100),
    size: clamp(finite(item.size, 18), 12, 28), rotation: clamp(finite(item.rotation, 0), -30, 30) };
}

/** Keep the entire rotated sticker inside the page, including on narrow screens. */
export function boundSticker(item: StickerPlacement, width: number, height: number): StickerPlacement {
  const next = normalizeSticker(item);
  if (width <= 0 || height <= 0) return next;
  const angle = Math.abs(next.rotation) * Math.PI / 180;
  const half = width * next.size / 200 * (Math.cos(angle) + Math.sin(angle));
  const xMargin = Math.min(50, half / width * 100 + 1);
  const yMargin = Math.min(50, half / height * 100 + 1);
  return { ...next, x: clamp(next.x, xMargin, 100 - xMargin), y: clamp(next.y, yMargin, 100 - yMargin) };
}

export function moveSticker(item: StickerPlacement, dx: number, dy: number, width: number, height: number) {
  if (width <= 0 || height <= 0) return normalizeSticker(item);
  return boundSticker({ ...item, x: item.x + dx / width * 100, y: item.y + dy / height * 100 }, width, height);
}

export function newSticker(id: string, name: StickerName, index: number): StickerPlacement {
  return { id, name, x: 28 + (index % 3) * 22, y: 32 + (index % 4) * 10, size: 18, rotation: index % 2 ? -8 : 8 };
}

/** Old fixture stickers are migrated only in the editor; saved placements take precedence. */
export function stickersForMoment(moment?: Pick<JourneyMoment, "stickers" | "stickerPlacements">) {
  return moment?.stickerPlacements?.map(normalizeSticker)
    ?? moment?.stickers?.map((name, index) => ({ ...newSticker(`legacy-${name}-${index}`, name, index), x: 76 - index * 20, y: 48 }))
    ?? [];
}
