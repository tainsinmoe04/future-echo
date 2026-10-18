import { apiFailure, apiJson, readJson } from "@/server/backend-http";
import { parseLocalContext, requireLocalRequest } from "@/server/local-ollama";
import { openRouterTrialEnabled, requestOpenRouterReply } from "@/server/openrouter-provider";
export const runtime = "nodejs";
let busy = false;
export async function POST(request: Request) {
  let acquired = false;
  try {
    requireLocalRequest(request, openRouterTrialEnabled());
    const context = parseLocalContext(await readJson(request, 196608));
    if (busy) return apiJson({ error: "A trial reply is already in progress.", code: "trial_busy" }, 429);
    busy = true; acquired = true;
    const reply = await requestOpenRouterReply(context, { key: process.env.OPENROUTER_API_KEY ?? "", model: process.env.OPENROUTER_MODEL ?? "" });
    return apiJson({ message: { id: crypto.randomUUID(), role: "assistant", content: reply.text, safety: reply.safety, ...(reply.playlist ? { playlist: reply.playlist } : {}), createdAt: new Date().toISOString() } });
  } catch (error) { return apiFailure(error); }
  finally { if (acquired) busy = false; }
}
