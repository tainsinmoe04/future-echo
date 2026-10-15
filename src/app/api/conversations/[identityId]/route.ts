import { backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, identifier } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
import { messageFromRow } from "@/server/chat-service";
export async function GET(request: Request, { params }: { params: Promise<{ identityId: string }> }) {
  try {
    const db = new SupabaseBackend(backendConfig()), user = await db.user(request), { identityId } = await params;
    if (!identifier(identityId)) throw new ApiError(400, "identity", "Choose a valid direction.");
    const rows = await db.rest(`fe_messages?user_id=eq.${encodeURIComponent(user.id)}&identity_id=eq.${identityId}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=100&select=*`);
    if (!Array.isArray(rows)) throw new ApiError(503, "history", "History could not be loaded.");
    return apiJson({ messages: rows.reverse().map(messageFromRow), limitedTo: 100 });
  } catch (error) { return apiFailure(error); }
}
