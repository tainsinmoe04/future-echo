import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { FutureSelfIdentityVersion } from "../src/lib/domain";
import {
  addMonths,
  buildSavedMomentConsent,
  createJourneyMoment,
  formatHorizonLabel,
  horizonFromMonths,
  horizonMonthsAhead,
} from "../src/lib/moment-lifecycle";
import { activeIdentityVersion, MOCK_TODAY, pastIdentityVersion } from "../src/lib/mock-data";
import { MAX_NOTE_LENGTH } from "../src/lib/redaction";

const identityVersions: readonly FutureSelfIdentityVersion[] = [
  pastIdentityVersion,
  activeIdentityVersion,
];

describe("buildSavedMomentConsent", () => {
  it("records moment consent without note consent", () => {
    const consent = buildSavedMomentConsent(
      { useInAiContext: true, includeMyNoteInAiContext: false },
      "2026-07-16T00:00:00Z",
    );
    assert.deepEqual(consent, {
      useInAiContext: true,
      includeMyNoteInAiContext: false,
      recordedAt: "2026-07-16T00:00:00Z",
    });
  });

  it("never allows My Note context without moment-level consent", () => {
    const consent = buildSavedMomentConsent(
      { useInAiContext: false, includeMyNoteInAiContext: true, note: "a note" },
      "2026-07-16T00:00:00Z",
    );
    assert.equal(consent.includeMyNoteInAiContext, false);
  });

  it("ignores note consent when the note is blank", () => {
    const consent = buildSavedMomentConsent(
      { useInAiContext: true, includeMyNoteInAiContext: true, note: "   " },
      "2026-07-16T00:00:00Z",
    );
    assert.equal(consent.includeMyNoteInAiContext, false);
  });
});

describe("createJourneyMoment", () => {
  const baseInput = {
    id: "journey-1",
    identityVersionId: activeIdentityVersion.id,
    occurredAt: "2026-07-16T23:40:00Z",
    revisitAt: "2027-01-16T23:40:00Z",
    excerpt: "I stopped working early.",
    relatedAiReply: "Rest did not make the work disappear.",
    note: "  Stopping was a choice.  ",
    aiInterpretation: "One possible reading.",
    useInAiContext: true,
    includeMyNoteInAiContext: true,
    consentRecordedAt: "2026-07-16T23:44:00Z",
  };

  it("trims text and normalizes the optional note", () => {
    const moment = createJourneyMoment(baseInput);
    assert.ok(moment);
    assert.equal(moment.originalExcerpt, "I stopped working early.");
    assert.equal(moment.myNote, "Stopping was a choice.");
    assert.equal(moment.relatedAiReply, baseInput.relatedAiReply);
    assert.equal(moment.consent.includeMyNoteInAiContext, true);
  });

  it("omits an empty note and its context consent", () => {
    const moment = createJourneyMoment({ ...baseInput, note: "" });
    assert.ok(moment);
    assert.equal(moment.myNote, undefined);
    assert.equal(moment.consent.includeMyNoteInAiContext, false);
  });

  it("rejects an empty excerpt", () => {
    assert.equal(createJourneyMoment({ ...baseInput, excerpt: "   " }), null);
  });

  it("rejects excerpts over the length limit", () => {
    assert.equal(
      createJourneyMoment({ ...baseInput, excerpt: "a".repeat(2001) }),
      null,
    );
  });

  it("rejects notes over the length limit", () => {
    assert.equal(
      createJourneyMoment({ ...baseInput, note: "a".repeat(MAX_NOTE_LENGTH + 1) }),
      null,
    );
  });

  it("produces a moment compatible with SavedMoment consumers", () => {
    const moment = createJourneyMoment(baseInput);
    assert.ok(moment);
    assert.ok(identityVersions.some((version) => version.id === moment.identityVersionId));
    assert.ok(!("possibleFutureReply" in moment));
    assert.ok(!("originalMessage" in moment));
  });
});

describe("horizon helpers", () => {
  it("adds months across a year boundary", () => {
    assert.equal(addMonths("2026-07-16T00:00:00Z", 6), "2027-01-16T00:00:00.000Z");
  });

  it("clamps end-of-month dates", () => {
    assert.equal(addMonths("2026-01-31T00:00:00Z", 1), "2026-02-28T00:00:00.000Z");
  });

  it("enforces the six-month minimum for preset horizons", () => {
    assert.deepEqual(horizonFromMonths(3, MOCK_TODAY).targetMonth, horizonFromMonths(6, MOCK_TODAY).targetMonth);
    const sixMonths = horizonFromMonths(6, MOCK_TODAY);
    assert.equal(sixMonths.label, formatHorizonLabel(sixMonths.targetMonth));
  });

  it("formats horizon labels as month and year", () => {
    assert.equal(formatHorizonLabel("2029-04"), "April 2029");
  });

  it("counts whole months between today and the target month", () => {
    assert.equal(horizonMonthsAhead("2029-04", MOCK_TODAY), 33);
    assert.equal(horizonMonthsAhead("2026-01", MOCK_TODAY), 0);
  });
});
