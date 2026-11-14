import { test } from "node:test";
import assert from "node:assert/strict";
import { hydrateAccountJournal } from "../src/lib/account-hydration";
import type { JournalSnapshot } from "../src/lib/journal-snapshot";
import { DEFAULT_PREFERENCES } from "../src/lib/scrapbook";

const empty: JournalSnapshot = { version: 1, preferences: DEFAULT_PREFERENCES, identityVersions: [], moments: [] };
const identity = {
  id: "journey-1-v1", journeyId: "journey-1", version: 1, status: "active" as const,
  definition: "Someone who makes things without losing the rest of their life",
  horizon: { targetMonth: "2029-04", label: "April 2029" },
  principles: [], createdAt: "2026-01-01T00:00:00.000Z",
};
const moment = {
  id: "moment-1", identityVersionId: "journey-1-v1",
  occurredAt: "2026-02-01T00:00:00.000Z", revisitAt: "2026-08-01T00:00:00.000Z",
  originalExcerpt: "A moment I chose to keep",
  consent: { useInAiContext: true, includeMyNoteInAiContext: false, recordedAt: "2026-02-01T00:00:00.000Z" },
};

test("a fresh device adopts the account's Future Self instead of starting onboarding again", () => {
  const next = hydrateAccountJournal(empty, {
    directions: [{ id: identity.id, definition: identity, active: true }],
    moments: [{ identityId: identity.id, record: moment }],
  });
  assert.ok(next, "the empty journal is filled from the account record");
  assert.equal(next.identityVersions.length, 1, "exactly one direction, so no duplicate is created");
  assert.equal(next.identityVersions[0].id, identity.id, "the account's own identity id is reused");
  assert.equal(next.identityVersions[0].status, "active");
  assert.equal(next.moments.length, 1);
});

test("a device that already holds a Future Self is never rewritten by the server", () => {
  const local: JournalSnapshot = { ...empty, identityVersions: [{ ...identity, id: "local-journey-v1", journeyId: "local-journey" }] };
  const next = hydrateAccountJournal(local, {
    directions: [{ id: identity.id, definition: identity, active: true }],
    moments: [{ record: moment }],
  });
  assert.equal(next, null, "local records win, so a repeat login cannot duplicate a direction");
});

test("inactive, malformed or absent server records are dropped rather than adopted", () => {
  assert.equal(hydrateAccountJournal(empty, null), null);
  assert.equal(hydrateAccountJournal(empty, { directions: [], moments: [] }), null);
  assert.equal(hydrateAccountJournal(empty, { directions: [{ id: identity.id, definition: { unexpected: 1 }, active: true }] }), null);
  assert.equal(hydrateAccountJournal(empty, { directions: [{ id: identity.id, definition: identity, active: false }] }), null, "an archived direction is not resurrected as active");
});

test("moments belonging to another direction are not imported", () => {
  const next = hydrateAccountJournal(empty, {
    directions: [{ id: identity.id, definition: identity, active: true }],
    moments: [{ record: { ...moment, id: "orphan", identityVersionId: "someone-else" } }],
  });
  assert.ok(next);
  assert.equal(next.moments.length, 0, "only moments owned by the adopted direction come across");
  assert.equal(next.identityVersions.length, 1);
});
