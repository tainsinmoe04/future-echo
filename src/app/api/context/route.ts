import { backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, exact, identifier, object, readJson, requireOrigin, requireReadOrigin } from "@/server/backend-http";
import { isContextSync } from "@/server/context-sync";
import { SupabaseBackend } from "@/server/supabase-backend";

/** Account profile, active Future Self and consented moments, scoped to the verified user. */
export async function GET(request: Request) {
  try {
    const config = backendConfig();
    requireReadOrigin(request, config.origin);
    const db = new SupabaseBackend(config), user = await db.user(request);
    if (!config.serviceKey) return apiJson({ profile: null, directions: [], moments: [] });
    const [profiles, directions, moments] = await Promise.all([
      db.rest("fe_profiles?select=adult_attested_at,plan", { scope: { userId: user.id } }),
      db.rest("fe_directions?select=id,definition,active&order=created_at.asc&limit=200", { scope: { userId: user.id } }),
      db.rest("fe_moments?select=identity_id,record&limit=2000", { scope: { userId: user.id } }),
    ]);
    const row = Array.isArray(profiles) && profiles[0] && typeof profiles[0] === "object" ? profiles[0] as Record<string, unknown> : null;
    return apiJson({
      profile: row ? { adultAttested: Boolean(row.adult_attested_at), plan: row.plan === "plus" ? "plus" : "free" } : null,
      directions: Array.isArray(directions) ? directions.slice(0, 200) : [],
      moments: Array.isArray(moments) ? moments.slice(0, 2000) : [],
    });
  } catch (error) { return apiFailure(error); }
}

export async function POST(request: Request) {
  try { const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request), input = await readJson(request, 1024);
    if (!object(input) || !exact(input, ["archiveIdentityId"]) || !identifier(input.archiveIdentityId)) throw new ApiError(400, "identity", "Choose the direction to archive.");
    await db.rpc("fe_archive_direction", { p_user: user.id, p_identity: input.archiveIdentityId }, { userId: user.id }); return apiJson({ archived: true });
  } catch (error) { return apiFailure(error); }
}
export async function DELETE(request: Request) {
  try { const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request);
    await db.rest(`fe_moments`, { method: "DELETE", scope: { userId: user.id } }); return apiJson({ cleared: true });
  } catch (error) { return apiFailure(error); }
}
export async function PUT(request: Request) {
  try { const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request);
    const input = await readJson(request, 512000); if (!isContextSync(input)) throw new ApiError(400, "context", "Only an active direction and explicitly consented text can be connected.");
    await db.rpc("fe_sync_context", { p_user: user.id, p_identity: input.identity, p_moments: input.moments }, { userId: user.id }); return apiJson({ connectedIdentityId: input.identity.id, sharedMoments: input.moments.length });
  } catch (error) { return apiFailure(error); }
}
