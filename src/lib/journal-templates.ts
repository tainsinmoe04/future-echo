import type { JourneyMoment } from "./domain";
import type { BookStyle } from "./journal-features";

export const JOURNAL_TEMPLATES = [
  { id: "lace", label: "Lace & letters", description: "Ivory lace, quiet paper and a little ribbon." },
  { id: "nocturne", label: "Midnight keepsake", description: "Dark velvet, silver details and room for your words." },
  { id: "poetry", label: "Poetry journal", description: "Warm paper, framed photographs and literary notes." },
] as const;

export type JournalTemplate = typeof JOURNAL_TEMPLATES[number]["id"];

/** Presentation only: never replaces words, photos, dates, identity or consent. */
export function applyJournalTemplate(moment: JourneyMoment, template: JournalTemplate): JourneyMoment {
  return { ...moment, paper: template, noteFont: "book" };
}

/** Template artwork is ordinary editable decoration, not a flattened backdrop. */
export function applyCoverTemplate(book: BookStyle, template: JournalTemplate): BookStyle {
  const personal = book.placements.filter(item => !item.id.startsWith("template-"));
  const ornaments: BookStyle["placements"] = [
    ...(template === "lace" ? [{ id: "template-lace", name: "lace-trim" as const, x: 50, y: 19, size: 28, rotation: 0 }] : []),
    { id: "template-keepsake", name: template === "lace" ? "ribbon-key" : "antique-frame", x: book.photo ? 75 : 50, y: 77, size: 28, rotation: 0 },
  ];
  const added = ornaments.slice(0, Math.max(0, 12 - personal.length));
  const transforms = Object.fromEntries(Object.entries(book.transforms).filter(([id]) => !id.startsWith("sticker:template-")));
  if (added.some(item => item.id === "template-lace")) transforms["sticker:template-lace"] = { x: 0, y: 0, scale: 2, rotation: 0 };
  return { ...book, theme: template, templateVersion: 1, noteFont: "book", ...(book.photo ? { photoMode: "inset" } : {}),
    placements: [...added, ...personal], transforms, ...(book.layers ? { layers: book.layers.filter(id => !id.startsWith("sticker:template-")) } : {}) };
}
