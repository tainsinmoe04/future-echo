import { backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, exact, identifier, object, readJson, requireOrigin } from "@/server/backend-http";
import { isContextSync } from "@/server/context-sync";
import { SupabaseBackend } from "@/server/supabase-backend";
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
