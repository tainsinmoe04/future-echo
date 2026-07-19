import assert from "node:assert/strict";
import test from "node:test";
import type {
  ConversationMessage,
  FutureSelfIdentityVersion,
  SavedMoment,
} from "../src/lib/domain";
import {
  buildAIContext,
  MAX_RECENT_MESSAGES,
  MAX_SAVED_MOMENTS,
} from "../src/server/ai-context-builder";
import {
  conversations,
  identityById,
  identityVersions,
  MOCK_TODAY,
  savedMoments,
} from "../src/lib/mock-data";

const activeIdentity: FutureSelfIdentityVersion = {
  id: "identity-v2",
  journeyId: "journey-1",
  version: 2,
  status: "active",
  definition: "A thoughtful maker with room for the rest of life",
  horizon: { targetMonth: "2029-05", label: "May 2029" },
  principles: ["Honesty", "Sustainable pace"],
  createdAt: "2026-07-16T00:00:00Z",
};

const message = (index: number, deleted = false): ConversationMessage => ({
  id: `message-${index}`,
  role: index % 2 ? "assistant" : "user",
  content: `message content ${index}`,
  createdAt: `2026-07-16T00:${String(index).padStart(2, "0")}:00Z`,
  ...(deleted ? { deletedAt: "2026-07-16T01:00:00Z" } : {}),
});

const moment = (
  id: string,
  overrides: Partial<SavedMoment> = {},
): SavedMoment => ({
  id,
  title: `Moment ${id}`,
  identityVersionId: activeIdentity.id,
  occurredAt: "2026-07-10T00:00:00Z",
  originalExcerpt: `excerpt ${id}`,
  relatedAiReply: `related reply ${id}`,
  myNote: `private note ${id}`,
  aiInterpretation: `interpretation ${id}`,
  consent: {
    useInAiContext: true,
    includeMyNoteInAiContext: false,
    recordedAt: "2026-07-10T00:01:00Z",
  },
  ...overrides,
});

test("caps recent messages after removing deleted messages", () => {
  const context = buildAIContext({
    currentMessage: "current",
    recentMessages: [message(0), message(1, true), ...Array.from({ length: 12 }, (_, i) => message(i + 2))],
    activeIdentityVersion: activeIdentity,
    relevantSavedMoments: [],
  });

  assert.equal(context.recentMessages.length, MAX_RECENT_MESSAGES);
  assert.equal(context.recentMessages[0].content, "message content 4");
  assert.ok(
    !context.recentMessages.some(
      ({ content }) => content === "message content 1",
    ),
  );
});

test("includes only active, undeleted, consented moments and caps them", () => {
  const candidates = [
    moment("kept-1"),
    moment("no-consent", {
      consent: { ...moment("base").consent, useInAiContext: false },
    }),
    moment("archived", { identityVersionId: "identity-v1" }),
    moment("deleted", { deletedAt: "2026-07-12T00:00:00Z" }),
    moment("kept-2"),
    moment("kept-3"),
    moment("over-limit"),
  ];

  const context = buildAIContext({
    currentMessage: "current",
    recentMessages: [],
    activeIdentityVersion: activeIdentity,
    relevantSavedMoments: candidates,
  });

  assert.equal(context.savedMoments.length, MAX_SAVED_MOMENTS);
  assert.deepEqual(
    context.savedMoments.map((item) => item.originalExcerpt),
    ["excerpt kept-1", "excerpt kept-2", "excerpt kept-3"],
  );
});

test("includes My Note only with separate explicit consent", () => {
  const context = buildAIContext({
    currentMessage: "current",
    recentMessages: [],
    activeIdentityVersion: activeIdentity,
    relevantSavedMoments: [
      moment("note-private"),
      moment("note-consented", {
        consent: {
          ...moment("base").consent,
          includeMyNoteInAiContext: true,
        },
      }),
    ],
  });

  assert.equal(context.savedMoments[0].myNote, undefined);
  assert.equal(context.savedMoments[1].myNote, "private note note-consented");
});

test("provider-facing context has no interpretation, provenance, payment, support, or full-history fields", () => {
  const input = {
    currentMessage: "current",
    recentMessages: [message(0)],
    activeIdentityVersion: activeIdentity,
    relevantSavedMoments: [moment("safe")],
    fullConversationHistory: ["must not pass"],
    paymentData: { card: "must not pass" },
    supportData: { ticket: "must not pass" },
  };

  const serialized = JSON.stringify(buildAIContext(input));

  for (const forbidden of [
    "interpretation safe",
    "related reply safe",
    "must not pass",
    "paymentData",
    "supportData",
    "deletedAt",
    "occurredAt",
  ]) {
    assert.ok(!serialized.includes(forbidden), `context leaked: ${forbidden}`);
  }
});

test("rejects an archived identity version", () => {
  assert.throws(
    () =>
      buildAIContext({
        currentMessage: "current",
        recentMessages: [],
        activeIdentityVersion: { ...activeIdentity, status: "past" },
        relevantSavedMoments: [],
      }),
    /requires an active Future Self version/,
  );
});

test("mock fixtures use consistent dates and identity-version provenance", () => {
  for (const identity of identityVersions) {
    assert.ok(identity.createdAt.slice(0, 10) <= MOCK_TODAY);
    if (identity.supersededAt) {
      assert.ok(identity.supersededAt.slice(0, 10) <= MOCK_TODAY);
    }
  }

  for (const conversation of conversations) {
    assert.ok(identityById.has(conversation.identityVersionId));
    assert.ok(conversation.startedAt.slice(0, 10) <= MOCK_TODAY);
    for (const item of conversation.messages) {
      assert.ok(item.createdAt.slice(0, 10) <= MOCK_TODAY);
    }
  }

  for (const savedMoment of savedMoments) {
    assert.ok(identityById.has(savedMoment.identityVersionId));
    assert.ok(savedMoment.occurredAt.slice(0, 10) <= MOCK_TODAY);
    assert.ok(savedMoment.consent.recordedAt.slice(0, 10) <= MOCK_TODAY);
  }
});
