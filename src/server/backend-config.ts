export interface BackendConfig { origin: string; supabaseUrl: string; supabaseKey: string; serviceKey: string; geminiKey: string; model: string; aiEnabled: boolean; provider?: "gemini" | "sealion" | "invalid"; seaLionKey?: string }
function safeOrigin(value: string, production: boolean): string {
  try {
    const url = new URL(value);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (value !== value.trim() || url.username || url.password || url.search || url.hash || url.pathname !== "/") return "";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local && !production)) return "";
    if (production && local) return "";
    return url.origin;
  } catch { return ""; }
}
export function backendConfig(env: Readonly<Record<string, string | undefined>> = process.env): BackendConfig {
  const production = env.NODE_ENV === "production";
  const origin = safeOrigin(env.APP_ORIGIN ?? (production ? "" : "http://localhost:3000"), production);
  // Invalid deployment configuration must not send credentials to an insecure
  // endpoint or mint insecure production cookies. Local journal remains usable.
  const supabaseUrl = origin ? safeOrigin(env.SUPABASE_URL ?? "", production) : "";
  return { origin, supabaseUrl,
    provider: env.FUTURE_ECHO_AI_PROVIDER === undefined || env.FUTURE_ECHO_AI_PROVIDER === "gemini" ? "gemini" : env.FUTURE_ECHO_AI_PROVIDER === "sealion" ? "sealion" : "invalid", seaLionKey: env.SEA_LION_API_KEY ?? "",
    supabaseKey: env.SUPABASE_PUBLISHABLE_KEY ?? "", serviceKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "", geminiKey: env.GEMINI_API_KEY ?? "", model: env.GEMINI_MODEL ?? "", aiEnabled: env.FUTURE_ECHO_AI_ENABLED === "true" };
}
export const authConfigured = (c: BackendConfig) => Boolean(c.supabaseUrl && c.supabaseKey);
export const aiConfigured = (c: BackendConfig) => authConfigured(c) && Boolean(c.serviceKey && c.aiEnabled && (c.provider === "sealion" ? c.seaLionKey : c.provider === "invalid" ? false : c.geminiKey && c.model));
