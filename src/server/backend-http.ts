export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function apiJson(value: unknown, status = 200): Response { return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export function apiFailure(cause: unknown): Response { return cause instanceof ApiError ? apiJson({ error: cause.message, code: cause.code }, cause.status) : apiJson({ error: "This request could not be completed. Please try again.", code: "server_error" }, 500); }
export function requireOrigin(request: Request, origin: string) {
  if (request.headers.get("origin") !== new URL(origin).origin) throw new ApiError(403, "origin", "This request must come from Future Echo.");
}
export async function readJson(request: Request, maximum = 16384): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "content_type", "Use an application/json request.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new ApiError(413, "too_large", "This request is too large.");
  const reader = request.body?.getReader(); if (!reader) throw new ApiError(400, "body", "A request body is required.");
  const chunks: Uint8Array[] = []; let total = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > maximum) { await reader.cancel(); throw new ApiError(413, "too_large", "This request is too large."); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new ApiError(400, "json", "The request is not valid JSON."); }
}
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const exact = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((key) => allowed.includes(key));
export const identifier = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(v) && !["__proto__", "constructor", "prototype"].includes(v);
export function cookieValue(request: Request, name: string): string | undefined { return request.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1); }
