import type { AIContext } from "./ai-context-builder";
import { ApiError, object } from "./backend-http";
import { isFutureReply, requestsMusic, type FutureReply } from "../lib/playlist";
import { futureSelfMessages } from "./future-self-messages";

export const SEALION_TRIAL_MODEL = "aisingapore/Qwen-SEA-LION-v4.5-27B-IT";
export function seaLionTrialEnabled(env: Readonly<Record<string, string | undefined>> = process.env) {
  return env.NODE_ENV === "development" && env.FUTURE_ECHO_SEALION_TRIAL === "true" && env.FUTURE_ECHO_OPENROUTER_TRIAL !== "true";
}
export async function requestSeaLionReply(context: AIContext, key: string, fetcher: typeof fetch = fetch): Promise<FutureReply> {
  if (!key) throw new ApiError(503, "sealion_setup", "Configure the server-only SEA-LION trial key.");
  let response: Response;
  try {
    response = await fetcher("https://api.sea-lion.ai/v1/chat/completions", {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: SEALION_TRIAL_MODEL, messages: futureSelfMessages(context), stream: false,
        response_format: { type: "json_object" }, chat_template_kwargs: { enable_thinking: false }, max_tokens: 1200, temperature: 0.65 }),
    });
  } catch { throw new ApiError(503, "sealion_unavailable", "SEA-LION could not be reached in time. No other provider was tried."); }
  if (!response.ok) throw new ApiError(response.status === 429 ? 429 : 503, response.status === 429 ? "sealion_limit" : "sealion_error", response.status === 429 ? "SEA-LION is at its trial request limit. Try again later." : "SEA-LION could not complete this request. Your words remain here; no other provider was tried.");
  let body: unknown;
  try { body = await response.json(); } catch { throw new ApiError(502, "invalid_reply", "SEA-LION returned an unreadable reply."); }
  const choice = object(body) && Array.isArray(body.choices) ? body.choices[0] : undefined;
  if (!object(choice) || choice.finish_reason !== "stop" || !object(choice.message) || choice.message.role !== "assistant" || typeof choice.message.content !== "string" || choice.message.content.length > 16000)
    throw new ApiError(502, "incomplete_reply", "The reply did not finish safely. Your words remain here.");
  let reply: unknown;
  try { reply = JSON.parse(choice.message.content); } catch { throw new ApiError(502, "invalid_reply", "The reply could not be read safely."); }
  if (!isFutureReply(reply)) throw new ApiError(502, "invalid_reply", "The reply did not match the supported format.");
  return { ...reply, playlist: requestsMusic(context.currentMessage) && reply.safety === "normal" ? reply.playlist : null };
}
