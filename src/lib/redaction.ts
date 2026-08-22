export const MAX_IDENTITY_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_EXCERPT_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 500;

/**
 * A candidate excerpt may only remove or keep whole whitespace-delimited
 * tokens from the original message, in their original order. Inserting new
 * words, reordering, or changing punctuation-attached tokens fails.
 */
export function isVerbatimRedaction(original: string, candidate: string) {
  if (!candidate.trim()) return false;

  const originalTokens = original.trim().split(/\s+/);
  if (originalTokens.length === 0) return false;

  let cursor = 0;

  return candidate
    .trim()
    .split(/\s+/)
    .every((token) => {
      const index = originalTokens.indexOf(token, cursor);
      if (index < 0) return false;
      cursor = index + 1;
      return true;
    });
}
