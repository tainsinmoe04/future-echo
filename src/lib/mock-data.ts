import type {
  Conversation,
  FutureSelfIdentityVersion,
  SavedMoment,
} from "./domain";

export const MOCK_TODAY = "2026-07-16";

export const pastIdentityVersion: FutureSelfIdentityVersion = {
  id: "creative-life-v1",
  journeyId: "creative-life",
  version: 1,
  status: "past",
  definition: "A confident independent designer who makes room for original work",
  horizon: { targetMonth: "2026-03", label: "March 2026" },
  principles: ["Choose honest work", "Share before perfecting"],
  createdAt: "2025-03-01T00:00:00Z",
  supersededAt: "2026-04-01T00:00:00Z",
};

export const activeIdentityVersion: FutureSelfIdentityVersion = {
  id: "creative-life-v2",
  journeyId: "creative-life",
  version: 2,
  status: "active",
  definition:
    "Someone who makes thoughtful creative work without abandoning the rest of her life",
  horizon: { targetMonth: "2029-04", label: "April 2029" },
  principles: ["Protect a sustainable pace", "Let honest work be enough"],
  createdAt: "2026-04-01T00:00:00Z",
};

export const identityVersions = [activeIdentityVersion, pastIdentityVersion] as const;

export const conversations: readonly Conversation[] = [
  {
    id: "conversation-current",
    identityVersionId: activeIdentityVersion.id,
    title: "Rest and unfinished work",
    startedAt: "2026-07-16T09:30:00Z",
    status: "current",
    messages: [
      {
        id: "current-user-1",
        role: "user",
        content:
          "I stopped working early because I was exhausted, and part of me still thinks that means I am falling behind.",
        createdAt: "2026-07-16T09:30:00Z",
      },
      {
        id: "current-assistant-1",
        role: "assistant",
        content:
          "Rest did not make the work disappear. It made it possible to return without resenting the life around it. You do not have to turn tiredness into a verdict.",
        createdAt: "2026-07-16T09:31:00Z",
      },
      {
        id: "current-user-2",
        role: "user",
        content:
          "I want to remember that stopping can be a choice, not evidence that I failed.",
        createdAt: "2026-07-16T09:34:00Z",
      },
    ],
  },
  {
    id: "conversation-past",
    identityVersionId: pastIdentityVersion.id,
    title: "Sending the application",
    startedAt: "2026-03-12T14:10:00Z",
    status: "past",
    messages: [
      {
        id: "past-user-1",
        role: "user",
        content:
          "I sent the application before I could make it perfect again.",
        createdAt: "2026-03-12T14:10:00Z",
      },
      {
        id: "past-assistant-1",
        role: "assistant",
        content:
          "You let completion carry the work farther than another private revision could.",
        createdAt: "2026-03-12T14:11:00Z",
      },
    ],
  },
];

export const savedMoments: readonly SavedMoment[] = [
  {
    id: "moment-application",
    title: "I finally sent it",
    identityVersionId: pastIdentityVersion.id,
    occurredAt: "2026-03-12T14:10:00Z",
    originalExcerpt: "I sent the application before I could make it perfect again.",
    relatedAiReply:
      "You let completion carry the work farther than another private revision could.",
    myNote: "Relief arrived after the action, not before it.",
    aiInterpretation:
      "You chose completion over another round of protection through perfection.",
    consent: {
      useInAiContext: false,
      includeMyNoteInAiContext: false,
      recordedAt: "2026-03-12T14:14:00Z",
    },
  },
  {
    id: "moment-boundary",
    title: "A quieter boundary",
    identityVersionId: activeIdentityVersion.id,
    occurredAt: "2026-04-07T18:20:00Z",
    originalExcerpt:
      "I told the team I could take this on next week, not tonight. Nobody was angry.",
    aiInterpretation:
      "This moment reflects a more sustainable way of working without assuming that rest must be earned.",
    consent: {
      useInAiContext: true,
      includeMyNoteInAiContext: false,
      recordedAt: "2026-04-07T18:24:00Z",
    },
  },
  {
    id: "moment-sketchbook",
    title: "Back at the desk",
    identityVersionId: activeIdentityVersion.id,
    occurredAt: "2026-07-10T10:00:00Z",
    originalExcerpt:
      "I drew for forty minutes today with no plan to publish it. Practice belonged to me first.",
    myNote: "The small yellow sketchbook is where this started again.",
    aiInterpretation:
      "Returning without requiring an outcome made the creative practice feel available again.",
    consent: {
      useInAiContext: true,
      includeMyNoteInAiContext: true,
      recordedAt: "2026-07-10T10:05:00Z",
    },
  },
];

export const identityById = new Map(identityVersions.map((identity) => [identity.id, identity]));
