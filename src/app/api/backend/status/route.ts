import { aiConfigured, authConfigured, backendConfig } from "@/server/backend-config";
import { apiJson } from "@/server/backend-http";
export function GET() { const config = backendConfig(); return apiJson({ authConfigured: authConfigured(config), aiConfigured: aiConfigured(config), provider: config.provider ?? "gemini", mode: aiConfigured(config) ? "connected-available" : "preview" }); }
