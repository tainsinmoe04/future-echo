import type { ConversationMessage, FutureSelfIdentityVersion, JourneyMoment } from "./domain";
import { contextSyncPayload } from "../server/context-sync";
/** Minimal local text projection. Never send journal media or drafts. */
export function localReplyPayload(identity: FutureSelfIdentityVersion, moments: readonly JourneyMoment[], recent: readonly ConversationMessage[], message: string) {
  const sync = contextSyncPayload(identity, moments);
  return { identity: sync.identity, message,
    moments: sync.moments.slice(0, 3).map((m) => ({ ...m, originalExcerpt: m.originalExcerpt.slice(0, 2000), ...(m.myNote ? { myNote: m.myNote.slice(0, 500) } : {}) })),
    recentMessages: recent.filter((m) => !m.deletedAt).slice(-10).map(({ id, role, content, createdAt }) => ({ id, role, content, createdAt })),
  };
}
