import type { FutureSelfIdentityVersion, JourneyMoment } from "./domain";
import { isIdentityVersion, isJourneyMoment, isJournalSnapshot, type JournalSnapshot } from "./journal-snapshot";

/** Account-owned records read back from `GET /api/context` for one verified user. */
export interface AccountHydration {
  profile?: { adultAttested?: boolean; plan?: string } | null;
  directions?: readonly unknown[];
  moments?: readonly unknown[];
}

function readIdentities(rows: readonly unknown[] | undefined): FutureSelfIdentityVersion[] {
  const seen = new Set<string>();
  const identities: FutureSelfIdentityVersion[] = [];
  for (const row of rows ?? []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const { id, definition, active } = row as Record<string, unknown>;
    if (typeof id !== "string" || !definition || typeof definition !== "object" || Array.isArray(definition)) continue;
    const payload = definition as Record<string, unknown>;
    // The stored payload always says "active"; the row's column is authoritative
    // for which direction the account currently holds open.
    const candidate = { id, journeyId: payload.journeyId, version: payload.version,
      status: active === true ? "active" : "past", definition: payload.definition,
      horizon: payload.horizon, principles: payload.principles, createdAt: payload.createdAt };
    if (seen.has(id) || !isIdentityVersion(candidate)) continue;
    seen.add(id);
    identities.push(candidate);
  }
  return identities;
}

function readMoments(rows: readonly unknown[] | undefined): JourneyMoment[] {
  const seen = new Set<string>();
  const moments: JourneyMoment[] = [];
  for (const row of rows ?? []) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = (row as Record<string, unknown>).record;
    if (!isJourneyMoment(record) || seen.has(record.id)) continue;
    seen.add(record.id);
    moments.push(record);
  }
  return moments;
}

/**
 * Fills an *empty* device-local journal from the account's server-held records,
 * so signing in on a second device loads the existing Future Self instead of
 * sending the user through onboarding again.
 *
 * Local data always wins: a device that already holds a Future Self is never
 * rewritten, which is what keeps a repeat login from producing a duplicate
 * direction. The merged result must pass the ordinary snapshot validator, so a
 * malformed or conflicting server record is dropped rather than adopted.
 */
export function hydrateAccountJournal(local: JournalSnapshot, remote: AccountHydration | null | undefined): JournalSnapshot | null {
  if (!remote || local.identityVersions.length > 0) return null;
  const identities = readIdentities(remote.directions);
  if (!identities.some((identity) => identity.status === "active")) return null;
  const owners = new Set(identities.map((identity) => identity.id));
  const present = new Set(local.moments.map((moment) => moment.id));
  const adopted = readMoments(remote.moments).filter((moment) => owners.has(moment.identityVersionId) && !present.has(moment.id));
  const candidate: JournalSnapshot = { ...local, identityVersions: identities, moments: [...local.moments, ...adopted] };
  if (!isJournalSnapshot(candidate)) return null;
  if (candidate.identityVersions.length === local.identityVersions.length && candidate.moments.length === local.moments.length) return null;
  return candidate;
}
