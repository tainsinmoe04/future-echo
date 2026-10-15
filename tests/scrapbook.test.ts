import assert from "node:assert/strict";
import test from "node:test";
import { boundSticker, moveSticker, newSticker, normalizeSticker, stickersForMoment } from "../src/lib/scrapbook";
import { keepMoment, memoryBooks, validatePhoto } from "../src/lib/personal-space";
import { sampleMoments } from "../src/lib/mock-messenger";
import { activeIdentityVersion } from "../src/lib/mock-data";
import { buildAIContext } from "../src/server/ai-context-builder";

test("sticker moves use page-relative coordinates", () => {
  const original = newSticker("flower-1", "flower", 0);
  const moved = moveSticker(original, 40, 80, 400, 800);
  assert.equal(moved.x, original.x + 10);
  assert.equal(moved.y, original.y + 10);
  assert.equal(original.x, 28);
});

test("sticker movement keeps rotated edges inside both mobile and desktop pages", () => {
  for (const [width, height] of [[280, 500], [470, 1000]]) {
    const item = boundSticker({ ...newSticker("edge", "star", 0), x: -10, y: 120, rotation: 30, size: 28 }, width, height);
    const half = width * .28 / 2 * (Math.cos(Math.PI / 6) + Math.sin(Math.PI / 6));
    assert.ok(item.x / 100 * width - half >= 0);
    assert.ok(item.y / 100 * height + half <= height);
  }
});

test("invalid sticker values are finite and bounded", () => {
  const item = normalizeSticker({ ...newSticker("bad", "star", 0), x: NaN, y: Infinity, size: 200, rotation: -90 });
  assert.deepEqual([item.x, item.y, item.size, item.rotation], [50, 50, 28, -30]);
  assert.deepEqual(moveSticker(item, 100, 100, 0, 0), item);
});

test("legacy stickers migrate with stable IDs and explicitly empty placements stay empty", () => {
  const first = stickersForMoment({ stickers: ["flower", "star"] });
  assert.deepEqual(first, stickersForMoment({ stickers: ["flower", "star"] }));
  assert.equal(new Set(first.map((item) => item.id)).size, 2);
  assert.deepEqual(stickersForMoment({ stickers: ["flower"], stickerPlacements: [] }), []);
});

test("decoration changes preserve original evidence, dates, consent, and identity", () => {
  const original = sampleMoments[0];
  const placement = newSticker("custom", "hearts", 0);
  const updated = keepMoment([original], { ...original, originalExcerpt: "overwritten", relatedAiReply: "overwritten", identityVersionId: "wrong", occurredAt: "2036-01-01", revisitAt: "2037-01-01", noteFont: "book", stickerPlacements: [placement], consent: { ...original.consent, useInAiContext: !original.consent.useInAiContext } })[0];
  for (const key of ["originalExcerpt", "relatedAiReply", "identityVersionId", "occurredAt", "revisitAt"] as const) assert.equal(updated[key], original[key]);
  assert.equal(updated.consent.useInAiContext, original.consent.useInAiContext);
  assert.equal(updated.noteFont, "book");
  assert.deepEqual(updated.stickerPlacements, [placement]);
});

test("font and sticker placement metadata never enter provider context", () => {
  const moment = { ...sampleMoments[0], identityVersionId: activeIdentityVersion.id, noteFont: "book" as const,
    stickerPlacements: [newSticker("private-decoration-id", "hearts", 0)], photos: [{ id: "photo", src: "private-photo", caption: "private-caption" }],
    consent: { useInAiContext: true, includeMyNoteInAiContext: false, recordedAt: "2026-10-14" } };
  const context = JSON.stringify(buildAIContext({ currentMessage: "hello", recentMessages: [], activeIdentityVersion, relevantSavedMoments: [moment] }));
  for (const excluded of ["noteFont", "stickerPlacements", "private-decoration-id", "private-photo", "private-caption"]) assert.ok(!context.includes(excluded));
});

test("saved-note clearing revokes note consent and interpretation cannot be rewritten", () => {
  const moment = { ...sampleMoments[0], myNote: "private", aiInterpretation: "frozen", consent: { useInAiContext: true, includeMyNoteInAiContext: true, recordedAt: "2026-10-14" } };
  const next = keepMoment([moment], { ...moment, myNote: "", aiInterpretation: "changed" })[0];
  assert.equal(next.consent.includeMyNoteInAiContext, false);
  assert.equal(next.aiInterpretation, "frozen");
  assert.equal(keepMoment([moment], { ...moment, aiInterpretation: undefined })[0].aiInterpretation, undefined);
});

test("books omit deleted moments and photo input rejects unsupported or oversized files", () => {
  assert.equal(memoryBooks([{ ...sampleMoments[0], deletedAt: "2026-10-14" }]).length, 0);
  assert.equal(validatePhoto({ type: "image/png", size: 2000 }), null);
  assert.ok(validatePhoto({ type: "image/svg+xml", size: 2000 }));
  assert.ok(validatePhoto({ type: "image/png", size: 6 * 1024 * 1024 }));
});
