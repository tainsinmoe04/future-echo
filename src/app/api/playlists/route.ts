import { backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, ApiError, exact, identifier, object, readJson, requireOrigin, requireReadOrigin } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
import { isPlaylist, isSavedPlaylist, type SavedPlaylist } from "@/lib/playlist";
export async function GET(request: Request) {
  try { const config = backendConfig(); requireReadOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request);
    const rows = await db.rest(`fe_playlists?order=saved_at.desc&limit=1000&select=record`, { scope: { userId: user.id } });
    if (!Array.isArray(rows) || !rows.every((row) => isSavedPlaylist(row.record))) throw new ApiError(503, "playlists", "Saved playlists could not be loaded.");
    return apiJson({ playlists: rows.map((row) => row.record) });
  } catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try { const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request), input = await readJson(request, 1024);
    if (!object(input) || !exact(input, ["messageId"]) || typeof input.messageId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.messageId)) throw new ApiError(400, "playlist", "Choose a playlist from your conversation.");
    const existing = await db.rest(`fe_playlists?source_message_id=eq.${input.messageId}&select=record&limit=1`, { scope: { userId: user.id } });
    if (Array.isArray(existing) && existing[0] && isSavedPlaylist(existing[0].record)) return apiJson({ playlist: existing[0].record });
    const rows = await db.rest(`fe_messages?id=eq.${input.messageId}&role=eq.assistant&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*&limit=1`, { scope: { userId: user.id } });
    const message = Array.isArray(rows) ? rows[0] : null;
    if (!message || message.safety === "support" || !isPlaylist(message.playlist)) throw new ApiError(404, "playlist", "This playlist is not available to save.");
    const playlist: SavedPlaylist = { ...message.playlist, id: input.messageId, identityVersionId: message.identity_id, sourceMessageId: input.messageId, savedAt: new Date().toISOString() };
    await db.rest("fe_playlists?on_conflict=user_id,source_message_id", { method: "POST", scope: { userId: user.id }, body: { user_id: user.id, id: playlist.id, identity_id: playlist.identityVersionId, source_message_id: input.messageId, record: playlist }, headers: { Prefer: "resolution=ignore-duplicates,return=minimal" } });
    return apiJson({ playlist });
  } catch (error) { return apiFailure(error); }
}
export async function DELETE(request: Request) {
  try { const config = backendConfig(); requireOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request), input = await readJson(request, 1024);
    if (!object(input) || !exact(input, ["id"]) || !identifier(input.id)) throw new ApiError(400, "playlist", "Choose a saved playlist.");
    await db.rest(`fe_playlists?id=eq.${input.id}`, { method: "DELETE", scope: { userId: user.id } }); return apiJson({ removed: true });
  } catch (error) { return apiFailure(error); }
}
