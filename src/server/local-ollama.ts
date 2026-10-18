import type { ConversationMessage } from "../lib/domain";
import { isFutureReply, requestsMusic, type FutureReply } from "../lib/playlist";
import { buildAIContext, type AIContext } from "./ai-context-builder";
import { ApiError, exact, identifier, object, requireOrigin } from "./backend-http";
import { isContextSync } from "./context-sync";
import { FUTURE_SELF_INSTRUCTIONS, REPLY_SCHEMA } from "./future-self-provider";
import { localOllamaFetch } from "./windows-ollama-bridge";

const LOCAL_VOICE = `${FUTURE_SELF_INSTRUCTIONS}\nFor everyday fatigue, doubt, comparison or uncertainty without indications of danger, stay in the possible-future perspective and use safety=normal. These feelings alone are not a crisis. Use safety=support when a safety-oriented response outside the persona is needed. Answer the actual thought rather than giving a generic motivational speech or an unnecessary greeting. Keep Burmese natural and concise when the user writes in Burmese.`;

/** Private development only; browser-owned context is never accepted in production. */
export function localAIEnabled(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.NODE_ENV === "development" && env.FUTURE_ECHO_LOCAL_AI === "true";
}

export function requireLocalRequest(request: Request, enabled: boolean) {
  if (!enabled) throw new ApiError(404, "local_disabled", "Local AI requires explicitly enabled development mode.");
  const url = new URL(request.url);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) throw new ApiError(403, "local_only", "Local AI requires a loopback app address.");
  requireOrigin(request, url.origin);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "origin", "Open Future Echo on this device.");
}

export function parseLocalContext(value: unknown): AIContext {
  if (!object(value) || !exact(value, ["identity", "moments", "message", "recentMessages"]) || typeof value.message !== "string" || !value.message.trim() || value.message.length > 2000
    || !Array.isArray(value.moments) || value.moments.length > 3 || !Array.isArray(value.recentMessages) || value.recentMessages.length > 10)
    throw new ApiError(400, "local_context", "Use a current direction and bounded, consented local context.");
  const sync = { identity: value.identity, moments: value.moments };
  if (!isContextSync(sync)) throw new ApiError(400, "local_context", "Local context is not supported.");
  const recent: ConversationMessage[] = value.recentMessages.map((message) => {
    if (!object(message) || !exact(message, ["id", "role", "content", "createdAt"]) || !identifier(message.id)
      || !["user", "assistant"].includes(message.role as string) || typeof message.content !== "string" || !message.content.trim() || message.content.length > 4000
      || typeof message.createdAt !== "string" || !Number.isFinite(Date.parse(message.createdAt))) throw new ApiError(400, "local_history", "Recent messages are not supported.");
    return message as unknown as ConversationMessage;
  });
  return buildAIContext({ currentMessage: value.message.trim(), recentMessages: recent, activeIdentityVersion: sync.identity, relevantSavedMoments: sync.moments });
}

export async function requestLocalReply(context: AIContext, fetcher: typeof fetch = localOllamaFetch): Promise<FutureReply> {
  // Fixed endpoint/model: no caller-selected URL, redirects, cloud model or fallback.
  let response: Response;
  try {
    response = await fetcher("http://127.0.0.1:11434/api/chat", {
      method: "POST", redirect: "error", headers: { "Content-Type": "application/json" }, cache: "no-store",
      signal: AbortSignal.timeout(180000), body: JSON.stringify({ model: "gemma3:12b", stream: false, format: REPLY_SCHEMA,
        messages: [{ role: "system", content: LOCAL_VOICE }, { role: "user", content: JSON.stringify(context) }],
        options: { num_predict: 1400, num_ctx: 8192, temperature: 0.6 } }),
    });
  } catch { throw new ApiError(503, "ollama_unavailable", "Local Gemma could not be reached or timed out. Start Ollama on this device. Nothing was sent to a cloud provider."); }
  if (!response.ok) throw new ApiError(503, "ollama_failed", "Local Gemma could not finish. Check that gemma3:12b is installed. No cloud fallback was used.");
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError(502, "invalid_reply", "Local Gemma returned an unreadable reply."); }
  if (!object(body) || body.done !== true || body.done_reason !== "stop" || !object(body.message) || body.message.role !== "assistant" || typeof body.message.content !== "string" || body.message.content.length > 16000)
    throw new ApiError(502, "incomplete_reply", "Local Gemma did not finish a supported reply. Your message is still here.");
  let reply: unknown;
  try { reply = JSON.parse(body.message.content); } catch { throw new ApiError(502, "invalid_reply", "Local Gemma returned an unreadable reply."); }
  if (!isFutureReply(reply)) throw new ApiError(502, "invalid_reply", "Local Gemma returned an unsupported reply.");
  return { ...reply, playlist: requestsMusic(context.currentMessage) && reply.safety === "normal" ? reply.playlist : null };
}
