import { apiFailure, apiJson, readJson } from "@/server/backend-http";
import { localAIEnabled, parseLocalContext, requestLocalReply, requireLocalRequest } from "@/server/local-ollama";
export const runtime = "nodejs";
let busy = false;
export async function POST(request: Request) {
  let acquired = false;
  try {
    requireLocalRequest(request, localAIEnabled());
    const context = parseLocalContext(await readJson(request, 196608));
    if (busy) return apiJson({ error: "Local Gemma is already replying.", code: "local_busy" }, 429);
    busy = true; acquired = true;
    const reply = await requestLocalReply(context);
    return apiJson({ message: { id: crypto.randomUUID(), role: "assistant", content: reply.text, safety: reply.safety,
      ...(reply.playlist ? { playlist: reply.playlist } : {}), createdAt: new Date().toISOString() } });
  } catch (error) { return apiFailure(error); }
  finally { if (acquired) busy = false; }
}
