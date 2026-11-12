import type { FutureSelfIdentityVersion, JourneyMoment } from "./domain";
import type { SpacePreferences } from "./scrapbook";
import { COVER_THEMES, DECORATIONS, safeMusicUrl, type BookStyle, type JournalDraft } from "./journal-features";
import { isSavedPlaylist, type SavedPlaylist } from "./playlist";
import { MAX_JOURNAL_LENGTH, MAX_JOURNAL_NOTE_LENGTH } from "./redaction";
import { momentDay } from "./local-date";
import { HORIZON_CHOICES } from "./journal-tools";
import { MAX_TRANSFORM_SCALE } from "./page-transform";

/** Local document: confirmed records and separately unconsented drafts. Chat stays session-only. */
export interface JournalSnapshot {
  horizonReflections?: Readonly<Record<string, { choice: string; recordedAt: string }>>;
  onboardingDraft?: { definition: string; reason: string; anchor: string; months: number; custom: string; step: number; updatedAt: string; newJourney?: boolean };
  playlists?: readonly SavedPlaylist[];
  bookDrafts?: Readonly<Record<string, BookStyle>>;
  books?: Readonly<Record<string, BookStyle>>;
  drafts?: readonly JournalDraft[];
  version: 1;
  identityVersions: readonly FutureSelfIdentityVersion[];
  moments: readonly JourneyMoment[];
  preferences: SpacePreferences;
}

type RecordValue = Record<string, unknown>;
const object = (v: unknown): v is RecordValue => !!v && typeof v === "object" && !Array.isArray(v)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
const text = (v: unknown, max: number, min = 0): v is string => typeof v === "string" && v.length >= min && v.length <= max;
const id = (v: unknown): v is string => text(v, 160, 1) && /^[a-zA-Z0-9_-]+$/.test(v)
  && !["__proto__", "constructor", "prototype"].includes(v);
const date = (v: unknown): v is string => typeof v === "string"
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v)
  && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === (v.includes(".") ? v : v.replace("Z", ".000Z"));
const keys = (v: RecordValue, allowed: string[]) => Object.keys(v).every((key) => allowed.includes(key));
const optional = (v: unknown, check: (value: unknown) => boolean) => v === undefined || check(v);
const font = (v: unknown) => ["clean", "soft", "handwritten", "book"].includes(v as string);
const sticker = (v: unknown) => [...DECORATIONS, "custom", "custom-tape"].includes(v as typeof DECORATIONS[number]);
const range = (v: unknown, min: number, max: number) => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const uniqueIds = (items: readonly { id: unknown }[]) => new Set(items.map((item) => item.id)).size === items.length;
const crop = (v: unknown) => object(v) && keys(v, ["x", "y", "zoom", "aspect"]) && range(v.x, 0, 100) && range(v.y, 0, 100) && range(v.zoom, 1, 3) && ["square", "portrait", "landscape", "original"].includes(v.aspect as string);
const layers = (v: unknown) => Array.isArray(v) && v.length <= 32 && new Set(v).size === v.length && v.every((s) => typeof s === "string" && /^(title|date|year|subtitle|words|reply|note|(?:photo|sticker):[a-zA-Z0-9_-]{1,160})$/.test(s));

/** No external URLs, SVG, blobs or arbitrary local paths can enter a restored journal. */
export function isJournalImageSource(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (["/scrapbook/study.png", "/scrapbook/coffee.png", "/scrapbook/sunset.png"].includes(value)) return true;
  if (value.length > 7_000_000) return false;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (bytes.length > 5 * 1024 * 1024 || btoa(bytes) !== match[2]) return false;
    if (match[1] === "png") return bytes.startsWith("\x89PNG\r\n\x1a\n") && bytes.length >= 24;
    if (match[1] === "jpeg") return bytes.startsWith("\xff\xd8\xff") && bytes.endsWith("\xff\xd9") && bytes.length >= 12;
    return bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP" && bytes.length >= 20;
  } catch { return false; }
}

function identity(v: unknown): v is FutureSelfIdentityVersion {
  if (!object(v) || !keys(v, ["id", "journeyId", "version", "status", "definition", "horizon", "principles", "reason", "anchor", "createdAt", "supersededAt"])) return false;
  return id(v.id) && id(v.journeyId) && Number.isSafeInteger(v.version) && Number(v.version) > 0
    && ["active", "past"].includes(v.status as string) && text(v.definition, 500, 1)
    && object(v.horizon) && keys(v.horizon, ["targetMonth", "label"])
    && typeof v.horizon.targetMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v.horizon.targetMonth)
    && text(v.horizon.label, 160, 1) && Array.isArray(v.principles) && v.principles.length <= 20
    && v.principles.every((item) => text(item, 500, 1))
    && optional(v.reason, (s) => text(s, 2000)) && optional(v.anchor, (s) => text(s, 2000))
    && date(v.createdAt) && optional(v.supersededAt, date)
    && (v.status !== "active" || v.supersededAt === undefined);
}

function moment(v: unknown): v is JourneyMoment {
  if (!object(v) || !keys(v, ["id", "title", "calendarDate", "identityVersionId", "occurredAt", "originalExcerpt", "relatedAiReply", "myNote", "aiInterpretation", "consent", "deletedAt", "revisitAt", "kind", "photos", "stickers", "stickerPlacements", "noteFont", "reflection", "pageTransforms", "pageLayers", "music", "paper"])) return false;
  if (!optional(v.calendarDate, (d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && date(`${d}T00:00:00.000Z`))) return false;
  if (!optional(v.pageLayers, layers)) return false;
  if (!optional(v.music, (m) => object(m) && keys(m, ["title", "url"]) && text(m.title, 120, 1) && safeMusicUrl(m.url))
    || !optional(v.paper, (p) => ["plain", "ruled", "grid", "blush", "lace", "nocturne", "poetry"].includes(p as string))) return false;
  if (!optional(v.pageTransforms, (layout) => object(layout) && Object.keys(layout).length <= 32 && Object.entries(layout).every(([key, t]) =>
    /^(title|date|year|subtitle|words|reply|note|(?:photo|sticker):[a-zA-Z0-9_-]{1,160})$/.test(key) && object(t) && keys(t, ["x", "y", "scale", "rotation"])
    && range(t.x, -100, 100) && range(t.y, -100, 100) && range(t.scale, 0.5, MAX_TRANSFORM_SCALE) && range(t.rotation, -180, 180)))) return false;
  if (!(id(v.id) && id(v.identityVersionId) && date(v.occurredAt) && date(v.revisitAt)
    && optional(v.deletedAt, date) && text(v.originalExcerpt, v.kind === "personal" ? MAX_JOURNAL_LENGTH : 2000, 1)
    && optional(v.title, (s) => text(s, 200)) && optional(v.relatedAiReply, (s) => text(s, 4000))
    && optional(v.myNote, (s) => text(s, MAX_JOURNAL_NOTE_LENGTH)) && optional(v.aiInterpretation, (s) => text(s, 4000))
    && optional(v.reflection, (s) => text(s, 2000)) && optional(v.noteFont, font)
    && optional(v.kind, (s) => s === "personal" || s === "conversation"))) return false;
  const c = v.consent;
  if (!object(c) || !keys(c, ["useInAiContext", "includeMyNoteInAiContext", "recordedAt"])
    || typeof c.useInAiContext !== "boolean" || typeof c.includeMyNoteInAiContext !== "boolean" || !date(c.recordedAt)
    || (c.includeMyNoteInAiContext && (!c.useInAiContext || typeof v.myNote !== "string" || !v.myNote.trim()))) return false;
  if (!optional(v.photos, (p) => Array.isArray(p) && p.length <= 4 && p.every((photo) => object(photo)
    && keys(photo, ["id", "src", "caption", "crop"]) && id(photo.id) && isJournalImageSource(photo.src) && text(photo.caption, 500) && optional(photo.crop, crop)) && uniqueIds(p))) return false;
  if (!optional(v.stickers, (s) => Array.isArray(s) && s.length <= 12 && s.every((name) => name !== "custom" && name !== "custom-tape" && sticker(name)))) return false;
  return optional(v.stickerPlacements, (s) => Array.isArray(s) && s.length <= 12 && s.every((p) => object(p)
    && keys(p, ["id", "name", "x", "y", "size", "rotation", "src"]) && id(p.id) && sticker(p.name)
    && (p.name === "custom" || p.name === "custom-tape" ? typeof p.src === "string" && p.src.startsWith("data:") && isJournalImageSource(p.src) : p.src === undefined)
    && range(p.x, 0, 100) && range(p.y, 0, 100) && range(p.size, 12, 28) && range(p.rotation, -30, 30)) && uniqueIds(s));
}

/** Validate, never repair: particularly never infer or upgrade memory consent. */
export function isJournalSnapshot(value: unknown): value is JournalSnapshot {
  if (!object(value) || !keys(value, ["version", "identityVersions", "moments", "preferences", "books", "drafts", "bookDrafts", "playlists", "onboardingDraft", "horizonReflections"]) || value.version !== 1) return false;
  if (!optional(value.onboardingDraft, (d) => object(d) && keys(d, ["definition", "reason", "anchor", "months", "custom", "step", "updatedAt", "newJourney"]) && text(d.definition, 500) && text(d.reason, 500) && text(d.anchor, 500) && [6, 12, 36, 60].includes(d.months as number) && text(d.custom, 7) && (d.custom === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(d.custom as string)) && [0, 1, 2].includes(d.step as number) && date(d.updatedAt) && optional(d.newJourney, (v) => typeof v === "boolean"))) return false;
  const { identityVersions: identities, moments, preferences: p } = value;
  // Bound aggregate encoded media before decoding any individual image.
  if (!Array.isArray(moments) || moments.length > 10000) return false;
  let imageCharacters = 0;
  let uniqueCharacters = 0;
  const seenSources = new Set<string>();
  const countSource = (source: string) => { imageCharacters += source.length; if (!seenSources.has(source)) { seenSources.add(source); uniqueCharacters += source.length; } };
  for (const item of moments) {
    if (!object(item)) return false;
    if (item.photos !== undefined) {
      if (!Array.isArray(item.photos) || item.photos.length > 4) return false;
      for (const photo of item.photos) {
        if (!object(photo) || typeof photo.src !== "string") return false;
        countSource(photo.src);
        if (uniqueCharacters > 32 * 1024 * 1024 || imageCharacters > 96 * 1024 * 1024) return false;
      }
    }
  }
  const countImages = (item: unknown) => {
    if (!object(item)) return;
    for (const list of [item.photos, item.stickerPlacements, item.placements]) {
      if (!Array.isArray(list)) continue;
      for (const image of list) { if (object(image) && typeof image.src === "string") countSource(image.src); }
    }
    if (typeof item.photo === "string") countSource(item.photo);
  };
  if (value.drafts !== undefined && (!Array.isArray(value.drafts) || value.drafts.length > 100)) return false;
  if (Array.isArray(value.drafts)) for (const draft of value.drafts) { if (object(draft)) countImages(draft.value); }
  for (const collection of [value.books, value.bookDrafts]) {
    if (collection !== undefined && (!object(collection) || Object.keys(collection).length > 200)) return false;
    if (object(collection)) Object.values(collection).forEach(countImages);
  }
  // Moments' photo sources were counted above; stickers are counted here separately.
  for (const item of moments) if (object(item)) countImages({ stickerPlacements: item.stickerPlacements });
  if (uniqueCharacters > 32 * 1024 * 1024 || imageCharacters > 96 * 1024 * 1024) return false;
  if (!Array.isArray(identities) || identities.length > 1000 || !identities.every(identity) || !uniqueIds(identities)
    || identities.filter((i) => i.status === "active").length > 1
    || new Set(identities.map((i) => `${i.journeyId}:${i.version}`)).size !== identities.length) return false;
  const owners = new Set(identities.map((i) => i.id));
  if (!optional(value.horizonReflections, (v) => object(v) && Object.keys(v).length <= 1000 && Object.entries(v).every(([key, reflection]) => owners.has(key) && object(reflection) && keys(reflection, ["choice", "recordedAt"]) && HORIZON_CHOICES.includes(reflection.choice as typeof HORIZON_CHOICES[number]) && date(reflection.recordedAt)))) return false;
  if (!optional(value.playlists, (p) => Array.isArray(p) && p.length <= 1000 && p.every(isSavedPlaylist) && uniqueIds(p) && p.every((playlist) => owners.has(playlist.identityVersionId)))) return false;
  if (!moments.every(moment)) return false;
  if (!optional(value.drafts, (d) => Array.isArray(d) && d.length <= 100 && d.every((entry) => object(entry)
    && keys(entry, ["id", "value", "updatedAt", "musicTitle", "musicUrl"]) && optional(entry.musicTitle, (s) => text(s, 120)) && optional(entry.musicUrl, (s) => text(s, 2048)) && id(entry.id) && date(entry.updatedAt) && object(entry.value)
    && text(entry.value.originalExcerpt, entry.value.kind === "personal" ? MAX_JOURNAL_LENGTH : 2000) && moment({ ...entry.value, originalExcerpt: entry.value.originalExcerpt || " " })
    && owners.has(entry.value.identityVersionId as string) && object(entry.value.consent) && entry.value.consent.useInAiContext === false && entry.value.consent.includeMyNoteInAiContext === false) && uniqueIds(d))) return false;
  const validBooks = (b: unknown, draft = false) => object(b) && Object.keys(b).length <= 200 && Object.entries(b).every(([year, book]) => /^\d{4}$/.test(year) && object(book)
    && keys(book, ["title", "subtitle", "theme", "noteFont", "photo", "photoMode", "photoCrop", "layers", "placements", "transforms", "order", "templateVersion"])
    && optional(book.templateVersion, version => version === 1)
    && optional(book.photoCrop, crop) && optional(book.layers, layers)
    && optional(book.photoMode, (mode) => mode === "full" || mode === "inset")
    && text(book.title, 80, draft ? 0 : 1) && text(book.subtitle, 120) && COVER_THEMES.includes(book.theme as typeof COVER_THEMES[number]) && font(book.noteFont)
    && optional(book.photo, isJournalImageSource) && Array.isArray(book.placements) && object(book.transforms) && Array.isArray(book.order) && book.order.length <= 10000 && new Set(book.order).size === book.order.length
    && book.order.every((key) => id(key) && moments.some((m) => object(m) && m.id === key && typeof m.occurredAt === "string" && momentDay(m as unknown as JourneyMoment).startsWith(year)))
    && moment({ ...(moments[0] ?? { id: "cover", identityVersionId: "cover", occurredAt: "2026-01-01T00:00:00Z", revisitAt: "2026-07-01T00:00:00Z", originalExcerpt: "cover", consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: "2026-01-01T00:00:00Z" } }), stickerPlacements: book.placements, pageTransforms: book.transforms }));
  if (!optional(value.books, validBooks) || !optional(value.bookDrafts, (b) => validBooks(b, true))) return false;
  // Shared media can appear in a saved page and its draft; charge it once to the
  // unique asset budget, while the separate total cap still bounds duplicate data.
  return Array.isArray(moments) && moments.length <= 10000 && moments.every(moment) && uniqueIds(moments)
    && moments.every((m) => owners.has(m.identityVersionId)) && object(p)
    && keys(p, ["defaultNoteFont", "readingSize", "motion"]) && font(p.defaultNoteFont)
    && ["regular", "large"].includes(p.readingSize as string) && ["system", "reduced"].includes(p.motion as string);
}

export function collectJournalImages(snapshot: JournalSnapshot): string[] {
  const sources: string[] = [];
  const addMoment = (m: JourneyMoment) => { m.photos?.forEach((p) => sources.push(p.src)); m.stickerPlacements?.forEach((s) => { if (s.src) sources.push(s.src); }); };
  snapshot.moments.forEach(addMoment);
  snapshot.drafts?.forEach((d) => addMoment(d.value));
  [...Object.values(snapshot.books ?? {}), ...Object.values(snapshot.bookDrafts ?? {})].forEach((b) => { if (b.photo) sources.push(b.photo); b.placements.forEach((s) => { if (s.src) sources.push(s.src); }); });
  return sources;
}
