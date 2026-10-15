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
  reason?: string;
  anchor?: string;
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
  title?: string;
  identityVersionId: string;
  occurredAt: ISODateTime;
  originalExcerpt: string;
  relatedAiReply?: string;
  myNote?: string;
  aiInterpretation?: string;
  consent: SavedMomentConsent;
  deletedAt?: ISODateTime;
}

/**
 * A Saved Moment as used by the journey flow: the user's selected words are
 * the original excerpt, and the paired possible-future reply is the related
 * AI reply. revisitAt marks when the moment is meant to be revisited.
 */
export interface JourneyMoment extends SavedMoment {
  music?: { title: string; url: string };
  paper?: "plain" | "ruled" | "grid" | "blush";
  pageTransforms?: Readonly<Record<string, PageTransform>>;
  revisitAt: ISODateTime;
  kind?: "conversation" | "personal";
  photos?: readonly MomentPhoto[];
  stickers?: readonly StickerName[];
  stickerPlacements?: readonly StickerPlacement[];
  noteFont?: NoteFont;
  reflection?: string;
}

export interface PageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export type StickerName = "flower" | "shoes" | "hearts" | "star" | "daisy" | "moon" | "sparkle" | "leaf" | "cherry" | "bow" | "stamp" | "ticket" | "tape-butter" | "tape-lilac" | "tape-grid" | "tape-rose" | "clip-silver" | "clip-gold" | "clip-heart" | "custom" | "custom-tape";

export type NoteFont = "clean" | "soft" | "handwritten" | "book";

/** Coordinates are percentages of the page; size is a percentage of its width. */
export interface StickerPlacement {
  src?: string;
  id: string;
  name: StickerName;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface MomentPhoto {
  id: string;
  src: string;
  caption: string;
}

export interface ConversationMessage {
  playlist?: import("./playlist").PlaylistSuggestion;
  safety?: "normal" | "support";
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
