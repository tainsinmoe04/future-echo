/** Implementation lives on the server, never in the browser. */
import type { AIContext } from "../server/ai-context-builder";

export interface AIProvider {
  reply(context: AIContext): Promise<import("./playlist").FutureReply>;
}

export type AIProviderName = "gemini";
