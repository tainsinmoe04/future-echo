import { backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, exact, object, readJson, requireOrigin, requireReadOrigin } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
import { isJournalSnapshot, type JournalSnapshot } from "@/lib/journal-snapshot";
import { MAX_JOURNAL_SYNC_BYTES, type JournalCloudDocument } from "@/lib/journal-sync";

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function currentRevision(rows: unknown): number {
  const row = Array.isArray(rows) && rows[0] && typeof rows[0] === "object" ? rows[0] as Record<string, unknown> : null;
  return row && typeof row.revision === "number" && Number.isSafeInteger(row.revision) && row.revision > 0 ? row.revision : 0;
}

/** One saved journal document for the verified owner; clients merge before they write. */
export async function GET(request: Request) {
  try {
    const config = backendConfig();
    requireReadOrigin(request, config.origin);
    const db = new SupabaseBackend(config), user = await db.user(request);
    if (!config.serviceKey) return apiJson({ journal: null });
    const rows = await db.rest("fe_journal?select=revision,saved_at,document&limit=1", { scope: { userId: user.id } });
    const row = Array.isArray(rows) && rows[0] && typeof rows[0] === "object" ? rows[0] as Record<string, unknown> : null;
    if (!row) return apiJson({ journal: null });
    const revision = currentRevision(rows);
    const savedAt = typeof row.saved_at === "string" && Number.isFinite(Date.parse(row.saved_at))
      ? new Date(row.saved_at).toISOString() : null;
    // An unreadable or oversized stored document is reported as empty content at
    // the revision it holds, so the next push replaces it instead of looping.
    const document = isJournalSnapshot(row.document) && byteLength(row.document) <= MAX_JOURNAL_SYNC_BYTES
      ? row.document as JournalSnapshot : null;
    const journal: JournalCloudDocument = { revision, savedAt, document };
    return apiJson({ journal });
  } catch (error) { return apiFailure(error); }
}

/** Revision-checked replace: a stale device re-pulls and merges instead of clobbering. */
export async function PUT(request: Request) {
  try {
    const config = backendConfig();
    requireOrigin(request, config.origin);
    const db = new SupabaseBackend(config), user = await db.user(request);
    const input = await readJson(request, MAX_JOURNAL_SYNC_BYTES + 64_000);
    if (!object(input) || !exact(input, ["document", "baseRevision"]) || !isJournalSnapshot(input.document)
      || !Number.isSafeInteger(input.baseRevision) || (input.baseRevision as number) < 0)
      throw new ApiError(400, "journal", "This journal could not be saved to your account.");
    const document = input.document as JournalSnapshot;
    if (byteLength(document) > MAX_JOURNAL_SYNC_BYTES)
      throw new ApiError(413, "journal_large", "This journal is over the account sync limit. It stays on this device.");
    const base = input.baseRevision as number;
    const revision = base + 1, savedAt = new Date().toISOString();
    const body = { revision, saved_at: savedAt, document };
    const existing = await db.rest("fe_journal?select=revision&limit=1", { scope: { userId: user.id } });
    const held = currentRevision(existing);
    if (held !== base) throw new ApiError(409, "journal_revision", "Your account journal changed on another device.");
    const saved = held === 0
      ? await db.rest("fe_journal?on_conflict=user_id", { method: "POST", scope: { userId: user.id },
          body: { user_id: user.id, ...body }, headers: { Prefer: "resolution=merge-duplicates,return=representation" } })
      : await db.rest(`fe_journal?revision=eq.${held}`, { method: "PATCH", scope: { userId: user.id },
          body, headers: { Prefer: "return=representation" } });
    if (Array.isArray(saved) && saved.length === 0)
      throw new ApiError(409, "journal_revision", "Your account journal changed on another device.");
    return apiJson({ revision, savedAt });
  } catch (error) { return apiFailure(error); }
}
