import type { AIContext } from "./ai-context-builder";
import { ApiError, object } from "./backend-http";
import { isFutureReply, requestsMusic, type FutureReply } from "../lib/playlist";
import { futureSelfMessages } from "./future-self-messages";

export const OPENROUTER_TRIAL_MODEL = "dots-studio/dots-3-note-preview:free";
export function openRouterTrialEnabled(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.NODE_ENV === "development" && env.FUTURE_ECHO_OPENROUTER_TRIAL === "true";
}
export async function requestOpenRouterReply(context: AIContext, config: { key: string; model: string }, fetcher: typeof fetch = fetch): Promise<FutureReply> {
  if (!config.key || config.model !== OPENROUTER_TRIAL_MODEL) throw new ApiError(503, "router_setup", "Configure the approved free OpenRouter model and server-only API key.");
  let response: Response;
  try {
    response = await fetcher("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(60000),
      headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.model, messages: futureSelfMessages(context), stream: false,
        response_format: { type: "json_object" }, max_tokens: 1200, temperature: 0.65, reasoning: { enabled: false },
        provider: { allow_fallbacks: false, require_parameters: true, data_collection: "deny", max_price: { prompt: 0, completion: 0 } } }),
    });
  } catch { throw new ApiError(503, "router_unavailable", "OpenRouter could not be reached in time. No other model or provider was tried."); }
  if (!response.ok) {
    const messages: Record<number, [string, string]> = {
      401: ["router_key", "OpenRouter rejected the API key. Check the server-only key."],
      402: ["router_credit", "OpenRouter requires an account or credit change for this request. No paid model was used."],
      403: ["router_access", "OpenRouter denied this request. Check account, region and provider permissions."],
      404: ["router_privacy", "The selected free model or an endpoint meeting the required data policy is unavailable. Privacy restrictions have not been relaxed."],
      429: ["router_limit", "OpenRouter or its provider is at its free request limit. Try again later."],
    };
    const [code, message] = messages[response.status] ?? ["router_error", "OpenRouter could not complete this request. Your words remain here."];
    throw new ApiError(response.status === 429 ? 429 : 503, code, message);
  }
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError(502, "invalid_reply", "OpenRouter returned an unreadable reply."); }
  const choice = object(body) && Array.isArray(body.choices) ? body.choices[0] : undefined;
  if (!object(choice) || choice.finish_reason !== "stop" || !object(choice.message) || choice.message.role !== "assistant" || typeof choice.message.content !== "string" || choice.message.content.length > 16000)
    throw new ApiError(502, "incomplete_reply", "The reply did not finish safely. It has not been shown as a finished message.");
  let reply: unknown;
  try { reply = JSON.parse(choice.message.content); } catch { throw new ApiError(502, "invalid_reply", "The reply could not be read safely."); }
  if (!isFutureReply(reply)) throw new ApiError(502, "invalid_reply", "The reply did not match the supported format.");
  return { ...reply, playlist: requestsMusic(context.currentMessage) && reply.safety === "normal" ? reply.playlist : null };
}
