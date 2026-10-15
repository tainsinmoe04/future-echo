import assert from "node:assert/strict";
import test from "node:test";
import { isJournalImageSource, isJournalSnapshot } from "../src/lib/journal-snapshot";
import { activeIdentityVersion, pastIdentityVersion } from "../src/lib/mock-data";
import { sampleMoments } from "../src/lib/mock-messenger";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";

const fixture = () => structuredClone({ version: 1, identityVersions: [pastIdentityVersion, activeIdentityVersion],
  moments: sampleMoments, preferences: DEFAULT_PREFERENCES });

test("existing saved evidence round-trips without mutation or consent changes", () => {
  const value = fixture();
  const before = JSON.stringify(value);
  assert.equal(isJournalSnapshot(value), true);
  assert.equal(isJournalSnapshot(JSON.parse(before)), true);
  assert.equal(JSON.stringify(value), before);
});

test("snapshot rejects unsupported versions, extra keys, chat and malformed draft state", () => {
  for (const bad of [null, [], { ...fixture(), version: 2 }, { ...fixture(), threads: {} },
    { ...fixture(), drafts: [{}] }, { ...fixture(), preferences: { ...DEFAULT_PREFERENCES, useInAiContext: true } }]) {
    assert.equal(isJournalSnapshot(bad), false);
  }
});

test("ownership, unique versions and one-active identity are enforced", () => {
  const original = fixture();
  for (const identities of [[activeIdentityVersion, activeIdentityVersion],
    [activeIdentityVersion, { ...activeIdentityVersion, id: "other" }],
    [activeIdentityVersion, { ...pastIdentityVersion, status: "active", supersededAt: undefined }]]) {
    assert.equal(isJournalSnapshot({ ...original, identityVersions: identities }), false);
  }
  assert.equal(isJournalSnapshot({ ...original, identityVersions: [] }), false);
  assert.equal(isJournalSnapshot({ ...original, moments: [original.moments[0], original.moments[0]] }), false);
});

test("invalid consent and impossible timestamps fail closed", () => {
  const source = fixture();
  for (const patch of [{ occurredAt: "2026-02-30T12:00:00Z" }, { originalExcerpt: "x".repeat(2001) },
    { consent: { ...source.moments[0].consent, useInAiContext: "true" } },
    { consent: { ...source.moments[0].consent, useInAiContext: false, includeMyNoteInAiContext: true } },
    { myNote: " ", consent: { ...source.moments[0].consent, useInAiContext: true, includeMyNoteInAiContext: true } }]) {
    assert.equal(isJournalSnapshot({ ...source, moments: [{ ...source.moments[0], ...patch }] }), false);
  }
});

test("unsafe assets, nonfinite placement and prototype keys are rejected", () => {
  for (const src of ["https://example.com/photo.png", "//example.com/a", "blob:local", "data:image/svg+xml;base64,PHN2Zz4=",
    "/scrapbook/../secret", "data:image/png;base64,aGVsbG8=", "data:image/png;base64,!!!!"]) {
    assert.equal(isJournalImageSource(src), false);
  }
  const source = fixture();
  assert.equal(isJournalSnapshot({ ...source, moments: [{ ...source.moments[0],
    stickerPlacements: [{ id: "sticker", name: "star", x: Infinity, y: 50, size: 18, rotation: 0 }] }] }), false);
  assert.equal(isJournalSnapshot(JSON.parse(JSON.stringify(source).replace('"version":1', '"__proto__":{},"version":1'))), false);
});

test("local raster signatures are checked against the declared media type", () => {
  const png = "\x89PNG\r\n\x1a\n" + "\0".repeat(16);
  assert.equal(isJournalImageSource(`data:image/png;base64,${btoa(png)}`), true);
  assert.equal(isJournalImageSource(`data:image/jpeg;base64,${btoa(png)}`), false);
  assert.equal(isJournalImageSource("/scrapbook/study.png"), true);
});
test("page transforms are bounded presentation data with an explicit key vocabulary", () => {
  const source = fixture();
  const layout = { words: { x: 10, y: 5, scale: 1.2, rotation: 30 } };
  const next = { ...source, moments: [{ ...source.moments[0], pageTransforms: layout }] };
  assert.equal(isJournalSnapshot(next), true);
  assert.equal(isJournalSnapshot({ ...next, moments: [{ ...next.moments[0], pageTransforms: { arbitrary: layout.words } }] }), false);
  assert.equal(isJournalSnapshot({ ...next, moments: [{ ...next.moments[0], pageTransforms: { words: { ...layout.words, scale: 10 } } }] }), false);
});
