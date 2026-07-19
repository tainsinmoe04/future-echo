export type ISODateTime = string;

export type IdentityVersionStatus = "active" | "past";

export interface FutureSelfIdentityVersion {
  id: string;
  journeyId: string;
  version: number;
  status: IdentityVersionStatus;
  definition: string;
  horizon: {
    targetMonth: string;
    label: string;
  };
  principles: readonly string[];
  createdAt: ISODateTime;
  supersededAt?: ISODateTime;
}

export interface SavedMomentConsent {
  useInAiContext: boolean;
  includeMyNoteInAiContext: boolean;
  recordedAt: ISODateTime;
}

export interface SavedMoment {
  id: string;
  title: string;
  identityVersionId: string;
  occurredAt: ISODateTime;
  originalExcerpt: string;
  relatedAiReply?: string;
  myNote?: string;
  aiInterpretation?: string;
  consent: SavedMomentConsent;
  deletedAt?: ISODateTime;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: ISODateTime;
  deletedAt?: ISODateTime;
}

export interface Conversation {
  id: string;
  identityVersionId: string;
  title: string;
  startedAt: ISODateTime;
  status: "current" | "past";
  messages: readonly ConversationMessage[];
}
