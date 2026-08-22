import type { ISODateTime, JourneyMoment, SavedMomentConsent } from "./domain";
import { MAX_EXCERPT_LENGTH, MAX_NOTE_LENGTH } from "./redaction";

const MONTHS_IN_YEAR = 12;

/**
 * Consent is recorded once at save time. My Note may only enter model context
 * when moment-level memory consent is also granted and the note is non-empty.
 */
export function buildSavedMomentConsent(
  input: {
    useInAiContext: boolean;
    includeMyNoteInAiContext: boolean;
    note?: string;
  },
  recordedAt: ISODateTime,
): SavedMomentConsent {
  const hasNote = Boolean(input.note?.trim());
  return {
    useInAiContext: input.useInAiContext,
    includeMyNoteInAiContext:
      input.useInAiContext && hasNote && input.includeMyNoteInAiContext,
    recordedAt,
  };
}

export interface CreateJourneyMomentInput {
  id: string;
  identityVersionId: string;
  occurredAt: ISODateTime;
  revisitAt: ISODateTime;
  excerpt: string;
  relatedAiReply: string;
  note?: string;
  aiInterpretation?: string;
  useInAiContext: boolean;
  includeMyNoteInAiContext: boolean;
  consentRecordedAt: ISODateTime;
}

/** Creates a Journey Moment, normalizing empty optional text to undefined. */
export function createJourneyMoment(
  input: CreateJourneyMomentInput,
): JourneyMoment | null {
  const excerpt = input.excerpt.trim();
  const note = input.note?.trim();

  if (!excerpt || excerpt.length > MAX_EXCERPT_LENGTH) return null;
  if (note && note.length > MAX_NOTE_LENGTH) return null;

  return {
    id: input.id,
    identityVersionId: input.identityVersionId,
    occurredAt: input.occurredAt,
    revisitAt: input.revisitAt,
    originalExcerpt: excerpt,
    relatedAiReply: input.relatedAiReply,
    myNote: note || undefined,
    aiInterpretation: input.aiInterpretation,
    consent: buildSavedMomentConsent(
      {
        useInAiContext: input.useInAiContext,
        includeMyNoteInAiContext: input.includeMyNoteInAiContext,
        note,
      },
      input.consentRecordedAt,
    ),
  };
}

export function addMonths(isoDate: string, months: number): ISODateTime {
  const date = new Date(isoDate);
  const day = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() !== day) date.setUTCDate(0);
  return date.toISOString();
}

export function formatHorizonLabel(targetMonth: string): string {
  const [year, month] = targetMonth.split("-").map(Number);
  const name = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return `${name} ${year}`;
}

/** Resolves a horizon of at least six months from a mock today (YYYY-MM-DD). */
export function horizonFromMonths(months: number, today: string) {
  const safeMonths = Math.max(months, 6);
  const targetMonth = addMonths(today, safeMonths).slice(0, 7);
  return {
    targetMonth,
    label: formatHorizonLabel(targetMonth),
  };
}

export function horizonMonthsAhead(targetMonth: string, today: string): number {
  const [targetYear, targetMonthNumber] = targetMonth.split("-").map(Number);
  const [todayYear, todayMonth] = today.split("-").map(Number);
  return Math.max(
    (targetYear - todayYear) * MONTHS_IN_YEAR + (targetMonthNumber - todayMonth),
    0,
  );
}
