import type { FutureSelfIdentityVersion, JourneyMoment } from "../lib/domain";
import { isJournalSnapshot } from "../lib/journal-snapshot";
import { DEFAULT_PREFERENCES } from "../lib/scrapbook";
import { exact, object } from "./backend-http";
export interface ContextSync { identity: FutureSelfIdentityVersion; moments: readonly JourneyMoment[] }
/** Upload projection is explicit and contains only eligible text, never journal media. */
export function contextSyncPayload(identity: FutureSelfIdentityVersion, moments: readonly JourneyMoment[]): ContextSync {
  return { identity: { id: identity.id, journeyId: identity.journeyId, version: identity.version, status: identity.status,
    definition: identity.definition, horizon: { ...identity.horizon }, principles: [...identity.principles], createdAt: identity.createdAt },
    moments: moments.filter((m) => !m.deletedAt && m.identityVersionId === identity.id && m.consent.useInAiContext).map((m) => ({ id: m.id, identityVersionId: m.identityVersionId, occurredAt: m.occurredAt, revisitAt: m.revisitAt,
      originalExcerpt: m.originalExcerpt, ...(m.kind ? { kind: m.kind } : {}), ...(m.myNote && m.consent.includeMyNoteInAiContext ? { myNote: m.myNote } : {}), consent: { ...m.consent, includeMyNoteInAiContext: Boolean(m.myNote?.trim() && m.consent.includeMyNoteInAiContext) } })) };
}
export function isContextSync(value: unknown): value is ContextSync {
  if (!object(value) || !exact(value, ["identity", "moments"]) || !object(value.identity) || value.identity.status !== "active" || !Array.isArray(value.moments) || value.moments.length > 1000) return false;
  if (!exact(value.identity, ["id", "journeyId", "version", "status", "definition", "horizon", "principles", "createdAt"])) return false;
  if (typeof value.identity.createdAt !== "string" || !object(value.identity.horizon) || typeof value.identity.horizon.targetMonth !== "string") return false;
  const start = value.identity.createdAt.slice(0, 7).split("-").map(Number), end = value.identity.horizon.targetMonth.split("-").map(Number);
  if ((end[0] - start[0]) * 12 + end[1] - start[1] < 6) return false;
  return isJournalSnapshot({ version: 1, identityVersions: [value.identity], moments: value.moments, preferences: DEFAULT_PREFERENCES })
    && value.moments.every((m) => object(m) && exact(m, ["id", "identityVersionId", "occurredAt", "revisitAt", "originalExcerpt", "kind", "myNote", "consent"]) && object(m.consent) && m.consent.useInAiContext === true && (m.myNote === undefined || m.consent.includeMyNoteInAiContext === true));
}
