import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isVerbatimRedaction,
  MAX_EXCERPT_LENGTH,
  MAX_IDENTITY_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NOTE_LENGTH,
} from "../src/lib/redaction";

const original = "I stopped working early because I was exhausted.";

describe("isVerbatimRedaction", () => {
  it("accepts the unchanged message", () => {
    assert.equal(isVerbatimRedaction(original, original), true);
  });

  it("accepts a subsequence that removes words", () => {
    assert.equal(isVerbatimRedaction(original, "I working early because I was exhausted."), true);
  });

  it("accepts reordered whitespace and surrounding blank lines", () => {
    assert.equal(
      isVerbatimRedaction(original, "\n\n  I   stopped   working early because I was exhausted. \n "),
      true,
    );
  });

  it("rejects inserted words that were not in the original", () => {
    assert.equal(isVerbatimRedaction(original, "I happily stopped working early."), false);
  });

  it("rejects reordering", () => {
    assert.equal(isVerbatimRedaction(original, "exhausted was I because early working"), false);
  });

  it("rejects changed tokens including punctuation edits", () => {
    assert.equal(isVerbatimRedaction(original, "I stopped working early because I was tired!"), false);
  });

  it("rejects an empty or whitespace-only candidate", () => {
    assert.equal(isVerbatimRedaction(original, ""), false);
    assert.equal(isVerbatimRedaction(original, "   "), false);
  });

  it("rejects any candidate when the original is empty", () => {
    assert.equal(isVerbatimRedaction("", "anything"), false);
  });

  it("rejects candidates with more occurrences of a repeated token than the original holds", () => {
    const repeated = "go go";
    assert.equal(isVerbatimRedaction(repeated, "go go go"), false);
  });

  it("exposes input length limits", () => {
    assert.ok(MAX_MESSAGE_LENGTH > 0);
    assert.ok(MAX_EXCERPT_LENGTH > 0);
    assert.ok(MAX_NOTE_LENGTH > 0);
    assert.ok(MAX_IDENTITY_LENGTH > 0);
  });
});
