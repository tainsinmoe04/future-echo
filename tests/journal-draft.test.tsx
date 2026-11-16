import "./fixtures/component-env";
import { mockModule } from "./fixtures/component-env";
import test from "node:test";
import assert from "node:assert/strict";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DEFAULT_PREFERENCES } from "@/lib/scrapbook";
import type { JournalSnapshot } from "@/lib/journal-snapshot";
import type { JournalDraft } from "@/lib/journal-features";

/** In-memory stand-in for the journal slice; each persist call is recorded. */
const baseSnapshot: JournalSnapshot = { version: 1, preferences: DEFAULT_PREFERENCES, identityVersions: [], moments: [] };
let snapshot: JournalSnapshot = baseSnapshot;
const updates: Array<(current: JournalSnapshot) => JournalSnapshot> = [];

mockModule("@/components/mock-product-state", {
  useJournalState: () => ({
    activeIdentity: null,
    preferences: DEFAULT_PREFERENCES,
    journalSnapshot: snapshot,
    updateJournal: (change: (current: JournalSnapshot) => JournalSnapshot) => { updates.push(change); },
    storageStatus: "saved",
    storageError: "",
    journalSync: { status: "local", message: "", lastSyncedAt: "" },
    retryStorage: () => {},
    exportJournal: () => "",
    restoreJournal: async () => {},
    readRecovery: async () => null,
    deleteRecovery: async () => {},
  }),
});

const emptyDrafts = (): JournalSnapshot => ({ ...baseSnapshot, drafts: [] });
const wordsPlaceholder = "What happened? What do you want to remember?";

test("draft saves wait for the debounce and never keep AI consent", async (t) => {
  t.after(cleanup);
  snapshot = baseSnapshot;
  updates.length = 0;
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const { MomentEditor } = await import("@/components/echo/moment-editor");
  render(<MomentEditor onClose={() => {}} onSaved={() => {}} />);
  assert.equal(updates.length, 0, "nothing saves while the first timer runs");

  // An untouched first save only clears a pre-existing draft for this key.
  t.mock.timers.tick(500);
  assert.equal(updates.length, 1);
  assert.equal(updates[0](baseSnapshot).drafts, undefined, "an untouched editor adds no draft");
  updates.length = 0;

  const consent = screen.getByLabelText("Allow my saved words in future AI context") as HTMLInputElement;
  fireEvent.click(consent);
  assert.equal(consent.checked, true);

  fireEvent.change(screen.getByPlaceholderText(wordsPlaceholder), { target: { value: "a quiet morning" } });
  assert.equal(updates.length, 0, "a keystroke schedules, never saves immediately");
  t.mock.timers.tick(499);
  assert.equal(updates.length, 0, "still inside the debounce window");
  t.mock.timers.tick(1);
  assert.equal(updates.length, 1, "the trailing save fires at 500 ms");

  const saved = updates[0](emptyDrafts());
  assert.equal(saved.drafts?.length, 1);
  assert.equal(saved.drafts?.[0]?.id, "new-journal");
  assert.equal(saved.drafts?.[0]?.value.originalExcerpt, "a quiet morning");
  // The checkbox is a save-time choice only; drafts never store consent.
  assert.equal(saved.drafts?.[0]?.value.consent.useInAiContext, false);
  assert.equal(saved.drafts?.[0]?.value.consent.includeMyNoteInAiContext, false);
});

test("closing inside the debounce window flushes the last keystrokes", async (t) => {
  t.after(cleanup);
  snapshot = baseSnapshot;
  updates.length = 0;
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const { MomentEditor } = await import("@/components/echo/moment-editor");
  const { unmount } = render(<MomentEditor onClose={() => {}} onSaved={() => {}} />);
  t.mock.timers.tick(500);
  updates.length = 0;

  fireEvent.change(screen.getByPlaceholderText(wordsPlaceholder), { target: { value: "kept on close" } });
  assert.equal(updates.length, 0, "the trailing save is still pending");
  unmount();
  assert.equal(updates.length, 1, "unmount flushes the pending draft");
  assert.equal(updates[0](emptyDrafts()).drafts?.[0]?.value.originalExcerpt, "kept on close");
});

const seededDraft: JournalDraft = {
  id: "seed-1",
  updatedAt: "2026-11-01T00:00:00.000Z",
  value: {
    id: "seed-moment",
    identityVersionId: "journey-1-v1",
    kind: "personal",
    title: "",
    originalExcerpt: "seeded words",
    calendarDate: "2026-11-01",
    occurredAt: "2026-11-01T00:00:00.000Z",
    revisitAt: "2027-05-01T00:00:00.000Z",
    noteFont: "handwritten",
    consent: { useInAiContext: true, includeMyNoteInAiContext: false, recordedAt: "2026-11-01T00:00:00.000Z" },
  },
};

test("a reopened draft is re-saved with its consent stripped", async (t) => {
  t.after(cleanup);
  snapshot = { ...baseSnapshot, drafts: [seededDraft] };
  updates.length = 0;
  t.mock.timers.enable({ apis: ["setTimeout"] });

  const { MomentEditor } = await import("@/components/echo/moment-editor");
  render(<MomentEditor draftId="seed-1" onClose={() => {}} onSaved={() => {}} />);
  t.mock.timers.tick(500);
  assert.equal(updates.length, 1, "a changed or unconsented draft re-saves once");

  const saved = updates[0](snapshot);
  assert.equal(saved.drafts?.length, 1, "the old draft is replaced, never duplicated");
  assert.equal(saved.drafts?.[0]?.value.originalExcerpt, "seeded words");
  // Validation rejects stored consent; re-saving must restore that invariant.
  assert.equal(saved.drafts?.[0]?.value.consent.useInAiContext, false);
  assert.equal(saved.drafts?.[0]?.value.consent.includeMyNoteInAiContext, false);
});
