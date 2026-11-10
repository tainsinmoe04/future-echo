import type { JourneyMoment } from "./domain";

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
