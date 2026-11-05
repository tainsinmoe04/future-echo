import { backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, identifier } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
import { messageFromRow } from "@/server/chat-service";
export async function GET(request: Request, { params }: { params: Promise<{ identityId: string }> }) {
  try {
    const db = new SupabaseBackend(backendConfig()), user = await db.user(request), { identityId } = await params;
    if (!identifier(identityId)) throw new ApiError(400, "identity", "Choose a valid direction.");
    const rows = await db.rest(`fe_messages?user_id=eq.${encodeURIComponent(user.id)}&identity_id=eq.${identityId}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=500&select=*`);
    if (!Array.isArray(rows)) throw new ApiError(503, "history", "History could not be loaded.");
    const profiles = await db.rest(`fe_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=plan&limit=1`);
    const retentionDays = Array.isArray(profiles) && profiles[0]?.plan === "plus" ? 90 : 30;
    return apiJson({ messages: rows.reverse().map(messageFromRow), limitedTo: 500, retentionDays });
  } catch (error) { return apiFailure(error); }
}
