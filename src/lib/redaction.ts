export const MAX_IDENTITY_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_EXCERPT_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 2000;
export const MAX_JOURNAL_LENGTH = 20000;
export const MAX_JOURNAL_NOTE_LENGTH = MAX_NOTE_LENGTH;

/** Marks text containing Myanmar script so screen readers use the right voice. */
export const myanmarLang = (value: string): "my" | undefined => /\p{Script=Myanmar}/u.test(value) ? "my" : undefined;

function redactionUnits(value: string): string[] {
  // Keep Latin words intact, while Myanmar can be redacted at complete grapheme
  // boundaries even without spaces. Never normalize, insert or reorder text.
  if (!/\p{Script=Myanmar}/u.test(value)) return value.trim().split(/\s+/);
  const result: string[] = [];
  let other = "";
  const flush = () => { if (other) { result.push(other); other = ""; } };
  for (const { segment } of new Intl.Segmenter("my", { granularity: "grapheme" }).segment(value)) {
    if (/^\s+$/u.test(segment)) { flush(); continue; }
    if (/\p{Script=Myanmar}/u.test(segment)) { flush(); result.push(segment); }
    else other += segment;
  }
  flush(); return result;
}

/**
 * English keeps whole whitespace-delimited tokens; Myanmar uses complete
 * graphemes so spaces are not required. Original order and exact units are
 * preserved. No insertion, normalization or rewritten source text is allowed.
 */
export function isVerbatimRedaction(original: string, candidate: string) {
  if (!candidate.trim()) return false;

  const originalTokens = redactionUnits(original);
  if (originalTokens.length === 0) return false;

  let cursor = 0;

  return redactionUnits(candidate)
    .every((token) => {
      const index = originalTokens.indexOf(token, cursor);
      if (index < 0) return false;
      cursor = index + 1;
      return true;
    });
}
