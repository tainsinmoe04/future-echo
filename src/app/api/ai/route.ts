import { aiConfigured, backendConfig } from "@/server/backend-config";
import { apiFailure, apiJson, readJson, requireOrigin } from "@/server/backend-http";
import { SupabaseBackend } from "@/server/supabase-backend";
import { createReply, parseChatInput } from "@/server/chat-service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const config = backendConfig();
  if (!aiConfigured(config)) return apiJson({ error: "Connected AI is not configured. Local preview remains available.", code: "setup_required" }, 501);
  try { requireOrigin(request, config.origin); const db = new SupabaseBackend(config), user = await db.user(request); const input = parseChatInput(await readJson(request)); return apiJson({ message: await createReply(db, user.id, input) }); }
  catch (error) { return apiFailure(error); }
}
