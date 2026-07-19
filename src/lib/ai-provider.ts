/** Server-only contract for a future provider. No implementation is connected. */
import type { AIContext } from "../server/ai-context-builder";

export interface AIProvider {
  reply(context: AIContext): Promise<string>;
}

export type AIProviderName="openai-compatible"|"gemini";
