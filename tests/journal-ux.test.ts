import assert from "node:assert/strict";
import test from "node:test";
import { isVerbatimRedaction, MAX_JOURNAL_LENGTH } from "../src/lib/redaction";
import { localDate, momentDay } from "../src/lib/local-date";
import { changeMomentConsent, keepMoment, memoryBooks, horizonDistance } from "../src/lib/personal-space";
import { DEFAULT_CROP, findMoments, moveLayer, normalizeCrop } from "../src/lib/journal-tools";
import { isJournalSnapshot } from "../src/lib/journal-snapshot";
import { parseJournalBackup, serializeJournalBackup } from "../src/lib/journal-backup";
import { activeIdentityVersion } from "../src/lib/mock-data";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";
import { buildAIContext } from "../src/server/ai-context-builder";
import type { JourneyMoment } from "../src/lib/domain";
const moment: JourneyMoment = { id: "personal", identityVersionId: activeIdentityVersion.id, kind: "personal", originalExcerpt: "I walked home.", occurredAt: "2026-12-31T18:30:00.000Z", calendarDate: "2027-01-01", revisitAt: "2027-07-01T00:00:00.000Z", myNote: "A quiet morning", consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: "2026-12-31T18:30:00.000Z" } };
const snapshot = () => ({ version: 1 as const, identityVersions: [activeIdentityVersion], moments: [moment], preferences: DEFAULT_PREFERENCES });
test("horizon distance uses calendar years/months, never decimal years", () => {
  assert.equal(horizonDistance("2029-04", "2026-11-05"), "2 years, 5 months ahead");
  assert.equal(horizonDistance("2029-11", "2026-11-05"), "3 years ahead");
  assert.equal(horizonDistance("2027-12", "2026-11-05"), "1 year, 1 month ahead");
  assert.equal(horizonDistance("2027-05", "2026-11-05"), "6 months ahead");
  assert.equal(horizonDistance("2026-11", "2026-11-05"), "Your horizon is here");
});
test("Myanmar deletion works without spaces, without inserting, reordering or splitting graphemes", () => {
  assert.ok(isVerbatimRedaction("ဒီနေ့စာမေးပွဲအောင်တယ်ဒါပေမယ့်စိတ်ပင်ပန်းတယ်", "ဒီနေ့စာမေးပွဲအောင်တယ်"));
  assert.equal(isVerbatimRedaction("မင်္ဂလာပါ", "င်"), false);
  assert.equal(isVerbatimRedaction("မင်္ဂလာပါ", "ကောင်းပါတယ်"), false);
  assert.equal(isVerbatimRedaction("စာ အောင်", "အောင် စာ"), false);
  assert.equal(isVerbatimRedaction("catapult မြန်မာစာ", "cat မြန်မာစာ"), false);
});
test("calendar day is stable across stored UTC instants and year grouping", () => {
  assert.equal(localDate(new Date(2026, 9, 15, 1, 0)), "2026-10-15");
  assert.equal(momentDay(moment), "2027-01-01"); assert.equal(memoryBooks([moment])[0].year, "2027");
  const changed = keepMoment([moment], { ...moment, calendarDate: "2030-01-01", occurredAt: "2030-01-01T00:00:00Z" })[0];
  assert.equal(changed.calendarDate, moment.calendarDate); assert.equal(changed.occurredAt, moment.occurredAt);
});
test("permission changes preserve original evidence and keep note consent separate", () => {
  const allowed = changeMomentConsent(moment, true, true, "2026-10-15T00:00:00.000Z"); assert.ok(allowed.consent.includeMyNoteInAiContext); assert.equal(allowed.originalExcerpt, moment.originalExcerpt);
  const revoked = changeMomentConsent(allowed, false, true, "2026-10-15T00:00:00.000Z"); assert.deepEqual([revoked.consent.useInAiContext, revoked.consent.includeMyNoteInAiContext], [false, false]);
  assert.equal(changeMomentConsent({ ...moment, myNote: "" }, true, true, "2026-10-15T00:00:00.000Z").consent.includeMyNoteInAiContext, false);
});
test("long personal pages round-trip while conversation limits and model context stay bounded", () => {
  const long = { ...moment, originalExcerpt: "x".repeat(MAX_JOURNAL_LENGTH), myNote: "n".repeat(2000), consent: { ...moment.consent, useInAiContext: true, includeMyNoteInAiContext: true } };
  const value = { ...snapshot(), moments: [long] }; assert.ok(isJournalSnapshot(value)); assert.deepEqual(parseJournalBackup(serializeJournalBackup(value)).snapshot.moments, [long]);
  assert.equal(isJournalSnapshot({ ...value, moments: [{ ...long, kind: "conversation" }] }), false);
  assert.equal(isJournalSnapshot({ ...value, moments: [{ ...long, originalExcerpt: long.originalExcerpt + "x" }] }), false);
  const context = buildAIContext({ currentMessage: "Hello", recentMessages: [], activeIdentityVersion, relevantSavedMoments: [long] }); assert.equal(context.savedMoments[0].originalExcerpt.length, 2000); assert.equal(context.savedMoments[0].myNote?.length, 500);
});
test("search and calendar filters do not invent or include deleted moments", () => {
  assert.equal(findMoments([moment], "quiet", "2027", "2027-01").length, 1);
  assert.equal(findMoments([moment], "quiet", "2026").length, 0);
  assert.equal(findMoments([{ ...moment, deletedAt: "2026-10-15T00:00:00Z" }], "").length, 0);
});
test("crop/layer metadata validates and stays outside provider context", () => {
  assert.deepEqual(normalizeCrop({ x: -1, y: Infinity, zoom: 20, aspect: "square" }), { x: 0, y: 50, zoom: 3, aspect: "square" });
  assert.deepEqual(moveLayer([], ["words", "photo:p", "sticker:s"], "words", "front"), ["photo:p", "sticker:s", "words"]);
  assert.deepEqual(moveLayer(["words", "photo:p"], ["words", "photo:p"], "photo:p", "back"), ["photo:p", "words"]);
  const decorated = { ...moment, photos: [{ id: "p", src: "/scrapbook/study.png", caption: "", crop: DEFAULT_CROP }], pageLayers: ["photo:p", "words"] };
  assert.ok(isJournalSnapshot({ ...snapshot(), moments: [decorated] }));
  assert.equal(isJournalSnapshot({ ...snapshot(), moments: [{ ...decorated, pageLayers: ["words", "words"] }] }), false);
  assert.equal(isJournalSnapshot({ ...snapshot(), moments: [{ ...decorated, photos: [{ ...decorated.photos[0], crop: { ...DEFAULT_CROP, zoom: 100 } }] }] }), false);
});
test("setup drafts and Horizon Day choices persist without becoming memory or exported drafts", () => {
  const value = { ...snapshot(), onboardingDraft: { definition: "Still writing", reason: "", anchor: "", months: 36, custom: "", step: 1, updatedAt: "2026-10-15T00:00:00.000Z" }, horizonReflections: { [activeIdentityVersion.id]: { choice: "I want to reach further", recordedAt: "2026-10-15T00:00:00.000Z" } } };
  assert.ok(isJournalSnapshot(value)); const backup = parseJournalBackup(serializeJournalBackup(value)).snapshot; assert.equal(backup.onboardingDraft, undefined); assert.deepEqual(backup.horizonReflections, value.horizonReflections); assert.equal(backup.moments.length, 1);
  assert.equal(isJournalSnapshot({ ...value, horizonReflections: { unknown: value.horizonReflections[activeIdentityVersion.id] } }), false);
});
