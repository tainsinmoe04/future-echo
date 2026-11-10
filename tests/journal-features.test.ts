import assert from "node:assert/strict";
import test from "node:test";
import { defaultBook, orderedPages, safeMusicUrl } from "../src/lib/journal-features";
import { rasterDimensions } from "../src/lib/journal-media";
import { isJournalSnapshot, type JournalSnapshot } from "../src/lib/journal-snapshot";
import { sampleMoments } from "../src/lib/mock-messenger";
import { activeIdentityVersion, pastIdentityVersion } from "../src/lib/mock-data";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";
import { parseJournalBackup, serializeJournalBackup } from "../src/lib/journal-backup";
import { keepMoment } from "../src/lib/personal-space";
import { applyJournalTemplate, JOURNAL_TEMPLATES } from "../src/lib/journal-templates";
const fixture = (): JournalSnapshot => structuredClone({ version: 1, moments: sampleMoments, identityVersions: [pastIdentityVersion, activeIdentityVersion], preferences: DEFAULT_PREFERENCES });

test("romantic templates preserve evidence and consent through validated backup", () => {
  for (const template of JOURNAL_TEMPLATES) {
    const snapshot = fixture(), original = snapshot.moments[0], before = structuredClone(original);
    const styled = applyJournalTemplate(original, template.id);
    assert.deepEqual(original, before);
    assert.deepEqual(styled, { ...before, paper: template.id, noteFont: "book" });
    snapshot.moments = [styled, ...snapshot.moments.slice(1)];
    const year = styled.occurredAt.slice(0, 4);
    snapshot.books = { [year]: { ...defaultBook(year), theme: template.id, placements: [
      { id: "ribbon", name: "ribbon-key", x: 50, y: 50, size: 18, rotation: 0 },
      { id: "frame", name: "antique-frame", x: 50, y: 50, size: 18, rotation: 0 },
      { id: "lace", name: "lace-trim", x: 50, y: 50, size: 18, rotation: 0 },
    ] } };
    assert.equal(isJournalSnapshot(snapshot), true);
    const restored = parseJournalBackup(serializeJournalBackup(snapshot)).snapshot;
    assert.deepEqual(restored.moments, snapshot.moments);
    assert.deepEqual(restored.books, snapshot.books);
  }
});

test("music accepts only explicit HTTPS destinations without credentials or deceptive subdomains", () => {
  for (const url of ["https://open.spotify.com/track/x", "https://youtu.be/test", "https://artist.bandcamp.com/track/a"]) assert.equal(safeMusicUrl(url), true);
  for (const url of ["javascript:alert(1)", "https://open.spotify.com.evil.test/x", "https://a@open.spotify.com/track/x", "http://youtu.be/x", "https://open.spotify.com:444/x", "//youtu.be/x"]) assert.equal(safeMusicUrl(url), false);
});
test("custom book order changes reading sequence without changing evidence or timestamps", () => {
  const value = fixture(), copy = JSON.stringify(value.moments);
  const order = [...value.moments].reverse().map((m) => m.id);
  assert.deepEqual(orderedPages(value.moments, order).map((m) => m.id), order);
  assert.equal(JSON.stringify(value.moments), copy);
});
test("drafts remain separate and unconsented; backups omit drafts but preserve covers", () => {
  const snapshot = fixture(), page = snapshot.moments[0], year = page.occurredAt.slice(0, 4);
  snapshot.drafts = [{ id: "draft", updatedAt: "2026-10-15T06:00:00.000Z", value: { ...page, originalExcerpt: "", consent: { ...page.consent, useInAiContext: false, includeMyNoteInAiContext: false } } }];
  snapshot.books = { [year]: { ...defaultBook(year), order: [page.id] } };
  snapshot.bookDrafts = { [year]: { ...defaultBook(year), title: "" } };
  assert.equal(isJournalSnapshot(snapshot), true);
  const backup = parseJournalBackup(serializeJournalBackup(snapshot));
  assert.equal(backup.snapshot.drafts, undefined); assert.equal(backup.snapshot.bookDrafts, undefined); assert.deepEqual(backup.snapshot.books, snapshot.books);
  snapshot.drafts[0].value.consent.useInAiContext = true;
  assert.equal(isJournalSnapshot(snapshot), false);
});
test("invalid custom raster sources and cross-year page references fail closed", () => {
  const snapshot = fixture(), page = snapshot.moments[0], year = page.occurredAt.slice(0, 4);
  assert.equal(isJournalSnapshot({ ...snapshot, moments: [{ ...page, stickerPlacements: [{ id: "custom", name: "custom", src: "https://evil.test/photo.png", x: 50, y: 50, size: 18, rotation: 0 }] }] }), false);
  assert.equal(isJournalSnapshot({ ...snapshot, books: { [year]: { ...defaultBook(year), order: ["unknown"] } } }), false);
  for (const malformed of [{ photos: {} }, { stickerPlacements: {} }, { pageTransforms: { bad: {} } }]) assert.equal(isJournalSnapshot({ ...snapshot, moments: [{ ...page, ...malformed }] }), false);
  for (const drafts of [[null], [{}], [5]]) assert.equal(isJournalSnapshot({ ...snapshot, drafts }), false);
  assert.equal(isJournalSnapshot({ ...snapshot, books: { [year]: { ...defaultBook(year), placements: undefined } } }), false);
});

test("full-cover photos and custom tape round-trip without changing saved evidence", () => {
  const snapshot = fixture(), page = snapshot.moments[0], year = page.occurredAt.slice(0, 4);
  const source = `data:image/png;base64,${btoa("\x89PNG\r\n\x1a\n" + "\0".repeat(16))}`;
  snapshot.books = { [year]: { ...defaultBook(year), photo: source, photoMode: "full", placements: [{ id: "my-tape", name: "custom-tape", src: source, x: 50, y: 50, size: 18, rotation: 0 }] } };
  assert.equal(isJournalSnapshot(snapshot), true);
  const restored = parseJournalBackup(serializeJournalBackup(snapshot)).snapshot;
  assert.equal(restored.books?.[year].photoMode, "full");
  assert.equal(restored.books?.[year].placements[0].name, "custom-tape");
  assert.deepEqual(restored.moments, snapshot.moments);
  assert.equal(isJournalSnapshot({ ...snapshot, books: { [year]: { ...snapshot.books[year], photoMode: "unsafe" } } }), false);
  assert.equal(isJournalSnapshot({ ...snapshot, books: { [year]: { ...snapshot.books[year], placements: [{ ...snapshot.books[year].placements[0], src: "https://external.test/pattern.png" }] } } }), false);
});
test("journal-authored words can change, conversation evidence cannot", () => {
  const page = fixture().moments[0];
  assert.equal(keepMoment([page], { ...page, originalExcerpt: "Changed" })[0].originalExcerpt, page.originalExcerpt);
  const personal = { ...page, kind: "personal" as const };
  const changed = keepMoment([personal], { ...personal, originalExcerpt: "My revised journal words", relatedAiReply: "invented" })[0];
  assert.equal(changed.originalExcerpt, "My revised journal words"); assert.equal(changed.relatedAiReply, personal.relatedAiReply);
});
test("raster preflight rejects oversized, truncated and animated sources before browser decoding", () => {
  const bytes = new Uint8Array(24); bytes.set([137,80,78,71,13,10,26,10]); bytes.set([73,72,68,82], 12);
  const view = new DataView(bytes.buffer); view.setUint32(16, 1); view.setUint32(20, 1);
  assert.deepEqual(rasterDimensions(bytes), { width: 1, height: 1 });
  view.setUint32(16, 100000); assert.throws(() => rasterDimensions(bytes), /8192/);
  assert.throws(() => rasterDimensions(new Uint8Array(10)), /header/);
  const animated = new Uint8Array(53); animated.set([137,80,78,71,13,10,26,10]);
  const av = new DataView(animated.buffer); av.setUint32(8, 13); animated.set([73,72,68,82], 12); av.setUint32(16, 1); av.setUint32(20, 1); av.setUint32(33, 8); animated.set([97,99,84,76], 37);
  assert.throws(() => rasterDimensions(animated), /animated PNG/);
  const jpeg = new Uint8Array([255,216,255,192,0,8,8,0,2,0,3,1]);
  assert.deepEqual(rasterDimensions(jpeg), { width: 3, height: 2 });
});
