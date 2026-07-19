import type {
  ConversationMessage,
  FutureSelfIdentityVersion,
  SavedMoment,
} from "../lib/domain";

export const MAX_RECENT_MESSAGES = 10;
export const MAX_SAVED_MOMENTS = 3;

export interface AIContext {
  currentMessage: string;
  recentMessages: ReadonlyArray<{
    role: ConversationMessage["role"];
    content: string;
  }>;
  futureSelf: {
    identityVersionId: string;
    definition: string;
    horizon: FutureSelfIdentityVersion["horizon"];
    principles: readonly string[];
  };
  savedMoments: ReadonlyArray<{
    originalExcerpt: string;
    myNote?: string;
  }>;
}

export interface BuildAIContextInput {
  currentMessage: string;
  recentMessages: readonly ConversationMessage[];
  activeIdentityVersion: FutureSelfIdentityVersion;
  relevantSavedMoments: readonly SavedMoment[];
}

export function buildAIContext(input: BuildAIContextInput): AIContext {
  if (input.activeIdentityVersion.status !== "active") {
    throw new Error("AI context requires an active Future Self version.");
  }

  const recentMessages = input.recentMessages
    .filter((message) => !message.deletedAt)
    .slice(-MAX_RECENT_MESSAGES)
    .map(({ role, content }) => ({ role, content }));

  const savedMoments = input.relevantSavedMoments
    .filter(
      (moment) =>
        !moment.deletedAt &&
        moment.identityVersionId === input.activeIdentityVersion.id &&
        moment.consent.useInAiContext,
    )
    .slice(0, MAX_SAVED_MOMENTS)
    .map((moment) => ({
      originalExcerpt: moment.originalExcerpt,
      ...(moment.myNote && moment.consent.includeMyNoteInAiContext
        ? { myNote: moment.myNote }
        : {}),
    }));

  return {
    currentMessage: input.currentMessage,
    recentMessages,
    futureSelf: {
      identityVersionId: input.activeIdentityVersion.id,
      definition: input.activeIdentityVersion.definition,
      horizon: { ...input.activeIdentityVersion.horizon },
      principles: [...input.activeIdentityVersion.principles],
    },
    savedMoments,
  };
}
