export interface BackendConfig { origin: string; supabaseUrl: string; supabaseKey: string; serviceKey: string; geminiKey: string; model: string; aiEnabled: boolean }
export function backendConfig(env: Readonly<Record<string, string | undefined>> = process.env): BackendConfig {
  return { origin: env.APP_ORIGIN ?? "http://localhost:3000", supabaseUrl: env.SUPABASE_URL?.replace(/\/$/, "") ?? "",
    supabaseKey: env.SUPABASE_PUBLISHABLE_KEY ?? "", serviceKey: env.SUPABASE_SERVICE_ROLE_KEY ?? "", geminiKey: env.GEMINI_API_KEY ?? "", model: env.GEMINI_MODEL ?? "", aiEnabled: env.FUTURE_ECHO_AI_ENABLED === "true" };
}
export const authConfigured = (c: BackendConfig) => Boolean(c.supabaseUrl && c.supabaseKey);
export const aiConfigured = (c: BackendConfig) => authConfigured(c) && Boolean(c.serviceKey && c.geminiKey && c.model && c.aiEnabled);
