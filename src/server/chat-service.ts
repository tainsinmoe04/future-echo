import { createHash } from "node:crypto";
import type { ConversationMessage, FutureSelfIdentityVersion, JourneyMoment } from "../lib/domain";
import { buildAIContext } from "./ai-context-builder";
import { ApiError, exact, identifier, object } from "./backend-http";
import { requestFutureReply } from "./future-self-provider";
import { requestSeaLionReply } from "./sealion-provider";
import { isPlaylist, requestsMusic } from "../lib/playlist";
import { SupabaseBackend } from "./supabase-backend";
export function parseChatInput(value: unknown): { identityId: string; message: string; requestId: string } {
  if (!object(value) || !exact(value, ["identityId", "message", "requestId"]) || !identifier(value.identityId) || typeof value.message !== "string" || !value.message.trim() || value.message.length > 2000 || typeof value.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) throw new ApiError(400, "chat_input", "Use a current direction, message and valid request ID. History and memory cannot be supplied to this endpoint.");
  return { identityId: value.identityId, message: value.message.trim(), requestId: value.requestId };
}
export function messageFromRow(value: unknown): ConversationMessage {
  if (!object(value) || typeof value.id !== "string" || !["user", "assistant"].includes(value.role as string) || typeof value.content !== "string" || typeof value.created_at !== "string") throw new ApiError(502, "message", "A stored message could not be read.");
  if (value.playlist != null && !isPlaylist(value.playlist)) throw new ApiError(502, "playlist", "A stored playlist could not be read safely.");
  return { id: value.id, role: value.role as "user" | "assistant", content: value.content, createdAt: value.created_at, ...(isPlaylist(value.playlist) ? { playlist: value.playlist } : {}), safety: value.safety === "support" ? "support" : "normal" };
}
export async function createReply(db: SupabaseBackend, userId: string, input: ReturnType<typeof parseChatInput>, provider?: typeof requestFutureReply) {
  const user = encodeURIComponent(userId), identity = encodeURIComponent(input.identityId);
  const directions = await db.rest(`fe_directions?user_id=eq.${user}&id=eq.${identity}&active=eq.true&select=definition&limit=1`);
  if (!Array.isArray(directions) || !directions[0]?.definition) throw new ApiError(409, "direction", "Connect your current direction in Settings first.");
  const reservation = await db.rpc("fe_reserve_reply", { p_user: userId, p_request: input.requestId, p_identity: input.identityId, p_hash: createHash("sha256").update(input.message).digest("hex") });
  if (!object(reservation)) throw new ApiError(503, "reservation", "The reply could not be reserved.");
  if (reservation.status === "completed") { const rows = await db.rest(`fe_messages?user_id=eq.${user}&id=eq.${input.requestId}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=*&limit=1`); if (Array.isArray(rows) && rows[0]) return messageFromRow(rows[0]); throw new ApiError(410, "expired", "This reply has left conversation history."); }
  if (reservation.status !== "reserved") throw new ApiError(409, reservation.status === "pending" ? "pending_request" : "failed_request", reservation.status === "pending" ? "This reply is already being prepared. Wait before trying again." : "That attempt did not finish. Send a new attempt when you are ready.");
  try {
    const [rows, memories] = await Promise.all([
      db.rest(`fe_messages?user_id=eq.${user}&identity_id=eq.${identity}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=10&select=*`),
      db.rest(`fe_moments?user_id=eq.${user}&identity_id=eq.${identity}&select=record&limit=1000`),
    ]);
    if (!Array.isArray(rows) || !Array.isArray(memories)) throw new ApiError(503, "context", "Conversation context could not be loaded.");
    const terms = new Set(input.message.toLowerCase().split(/\s+/).filter((s) => s.length > 2));
    const saved = memories.map((m) => m.record as JourneyMoment).sort((a, b) => {
      const score = (m: JourneyMoment) => [...terms].filter((s) => m.originalExcerpt.toLowerCase().includes(s)).length;
      return score(b) - score(a) || b.occurredAt.localeCompare(a.occurredAt);
    });
    const context = buildAIContext({ currentMessage: input.message, recentMessages: rows.map(messageFromRow).reverse(), activeIdentityVersion: directions[0].definition as FutureSelfIdentityVersion, relevantSavedMoments: saved });
    const reply = provider ? await provider(context, { key: db.config.geminiKey, model: db.config.model }) : db.config.provider === "sealion" ? await requestSeaLionReply(context, db.config.seaLionKey ?? "") : await requestFutureReply(context, { key: db.config.geminiKey, model: db.config.model });
    if (!requestsMusic(input.message)) reply.playlist = null;
    const result = await db.rpc("fe_finish_reply", { p_user: userId, p_request: input.requestId, p_message: input.message, p_reply: reply });
    if (!object(result)) throw new ApiError(503, "save_reply", "The reply could not be saved."); return result;
  } catch (error) {
    await db.rest(`fe_ai_requests?user_id=eq.${user}&request_id=eq.${input.requestId}&status=eq.pending`, { method: "PATCH", body: { status: "failed" } }).catch(() => {}); throw error;
  }
}
