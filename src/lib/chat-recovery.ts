import type { MessengerThread } from "./mock-messenger";
import { isPlaylist } from "./playlist";
export const CHAT_RETENTION_MS = 30 * 86400000;

export const CHAT_RECOVERY_KEY = "future-echo.chat-recovery.v1";
export interface ChatAttempt { content: string; requestId: string }
export interface ChatRecovery {
  version: 1;
  owner: string | null;
  savedAt: number;
  retentionDays?: 30 | 90;
  threads: Record<string, MessengerThread>;
  attempts: Record<string, ChatAttempt>;
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const id = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value) && !["__proto__", "constructor", "prototype"].includes(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
/** Temporary tab recovery, never journal memory or an export. Reject unknown fields. */
export function parseChatRecovery(raw: string | null, now = Date.now()): ChatRecovery | null {
  if (!raw || raw.length > 2_000_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || !exact(value, ["version", "owner", "savedAt", "retentionDays", "threads", "attempts"]) || value.version !== 1 || !(value.owner === null || (typeof value.owner === "string" && /^[0-9a-f-]{36}$/i.test(value.owner))) || (value.retentionDays !== undefined && ![30,90].includes(value.retentionDays as number)) || typeof value.savedAt !== "number" || value.savedAt > now + 60000 || now - value.savedAt >= (value.retentionDays === 90 ? 90 : 30) * 86400000 || !object(value.threads) || Object.keys(value.threads).length > 20 || !object(value.attempts)) return null;
    for (const [key, thread] of Object.entries(value.threads)) {
      if (!id(key) || !object(thread) || !exact(thread, ["messages", "draft", "typing"]) || typeof thread.draft !== "string" || thread.draft.length > 2000 || typeof thread.typing !== "boolean" || !Array.isArray(thread.messages) || thread.messages.length > 500) return null;
      for (const message of thread.messages) {
        if (!object(message) || !exact(message, ["id", "role", "content", "createdAt", "safety", "playlist"]) || !id(message.id) || !["user", "assistant"].includes(message.role as string) || typeof message.content !== "string" || message.content.length > 4000 || typeof message.createdAt !== "string" || !Number.isFinite(Date.parse(message.createdAt)) || (message.safety !== undefined && !["normal", "support"].includes(message.safety as string)) || (message.playlist != null && !isPlaylist(message.playlist))) return null;
        if (message.playlist === null) delete message.playlist;
      }
    }
    for (const [key, attempt] of Object.entries(value.attempts)) if (!id(key) || !Object.hasOwn(value.threads, key) || !object(attempt) || !exact(attempt, ["content", "requestId"]) || typeof attempt.content !== "string" || attempt.content.length > 2000 || typeof attempt.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attempt.requestId)) return null;
    return value as unknown as ChatRecovery;
  } catch { return null; }
}

export function recoveredThreads(value: ChatRecovery, now = Date.now()): Record<string, MessengerThread> {
  return Object.fromEntries(Object.entries(value.threads).map(([key, thread]) => [key, {
    ...thread, messages: thread.messages.filter(message => Date.parse(message.createdAt) > now - (value.retentionDays ?? 30) * 86400000), typing: false,
    draft: thread.draft || (value.attempts[key] && !thread.messages.some(message => message.role === "assistant" && message.id === value.attempts[key].requestId)
      ? value.attempts[key].content
      : thread.typing ? thread.messages.findLast(message => message.role === "user")?.content ?? "" : ""),
  }]));
}
