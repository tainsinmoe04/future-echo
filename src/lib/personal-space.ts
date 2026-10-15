import type { JourneyMoment, MomentPhoto, StickerName } from "./domain";
import { addMonths, buildSavedMomentConsent } from "./moment-lifecycle";
import { MAX_EXCERPT_LENGTH, MAX_NOTE_LENGTH } from "./redaction";
import { DECORATIONS } from "./journal-features";

export const STICKERS: readonly StickerName[] = DECORATIONS;
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhoto(file: { type: string; size: number }): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) return "Choose a JPG, PNG, or WebP photo.";
  if (file.size > MAX_PHOTO_BYTES) return "Choose a photo smaller than 5 MB.";
  return null;
}

export function keepMoment(moments: readonly JourneyMoment[], moment: JourneyMoment) {
  const index = moments.findIndex((item) => item.id === moment.id);
  if (index < 0) return [...moments, moment];
  const existing = moments[index];
  // Decorations and notes can change. The saved evidence and provenance cannot.
  return moments.map((item) => item.id === moment.id ? {
    ...moment,
    originalExcerpt: existing.kind === "personal" ? moment.originalExcerpt : existing.originalExcerpt,
    relatedAiReply: existing.relatedAiReply,
    identityVersionId: existing.identityVersionId,
    occurredAt: existing.occurredAt,
    revisitAt: existing.revisitAt,
    deletedAt: existing.deletedAt,
    kind: existing.kind,
    aiInterpretation: existing.aiInterpretation && moment.aiInterpretation
      ? existing.aiInterpretation : undefined,
    consent: {
      ...existing.consent,
      includeMyNoteInAiContext: Boolean(
        existing.consent.useInAiContext && existing.consent.includeMyNoteInAiContext && moment.myNote?.trim(),
      ),
    },
  } : item);
}

export function createPersonalMoment(input: {
  id: string; identityVersionId: string; title: string; text: string;
  occurredAt: string; savedAt: string; note?: string;
  photos: readonly MomentPhoto[]; stickers: readonly StickerName[];
  useInAiContext: boolean; includeMyNoteInAiContext: boolean;
}): JourneyMoment | null {
  const text = input.text.trim();
  if (!text || text.length > MAX_EXCERPT_LENGTH || input.title.trim().length > 80) return null;
  if ((input.note?.trim().length ?? 0) > MAX_NOTE_LENGTH) return null;
  if (!Number.isFinite(Date.parse(input.occurredAt)) || Date.parse(input.occurredAt) > Date.parse(input.savedAt)) return null;
  if (input.photos.length > MAX_PHOTOS || input.stickers.some((sticker) => !STICKERS.includes(sticker))) return null;
  return {
    id: input.id, identityVersionId: input.identityVersionId,
    title: input.title.trim() || "An ordinary moment", kind: "personal",
    occurredAt: input.occurredAt, revisitAt: addMonths(input.occurredAt, 6),
    originalExcerpt: text, myNote: input.note?.trim() || undefined,
    photos: input.photos, stickers: [...new Set(input.stickers)],
    consent: buildSavedMomentConsent(input, input.savedAt),
  };
}

export function memoryBooks(moments: readonly JourneyMoment[]) {
  const sorted = moments.filter((moment) => !moment.deletedAt)
    .toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const books = new Map<string, JourneyMoment[]>();
  for (const moment of sorted) {
    const year = moment.occurredAt.slice(0, 4);
    books.set(year, [...(books.get(year) ?? []), moment]);
  }
  return [...books].map(([year, entries]) => ({ year, moments: entries }));
}

/** Stable positions depend on IDs, never how often the user opens the app. */
export function constellationPosition(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const unsigned = hash >>> 0;
  return { x: 12 + (unsigned % 77), y: 14 + ((unsigned >>> 8) % 70) };
}

export function horizonDistance(targetMonth: string, today: string) {
  const [year, month] = targetMonth.split("-").map(Number);
  const [nowYear, nowMonth] = today.split("-").map(Number);
  const distance = (year - nowYear) * 12 + month - nowMonth;
  if (distance <= 0) return "Your horizon is here";
  if (distance < 12) return `${distance} ${distance === 1 ? "month" : "months"} ahead`;
  const years = Math.round(distance / 12 * 10) / 10;
  return `${years} ${years === 1 ? "year" : "years"} ahead`;
}
