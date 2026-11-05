export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export function apiJson(value: unknown, status = 200): Response { return Response.json(value, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
export function apiFailure(cause: unknown): Response { return cause instanceof ApiError ? apiJson({ error: cause.message, code: cause.code }, cause.status) : apiJson({ error: "This request could not be completed. Please try again.", code: "server_error" }, 500); }
export function requireOrigin(request: Request, origin: string) {
  let configured: URL;
  try { configured = new URL(origin); } catch { throw new ApiError(503, "origin_setup", "The application origin is not configured safely."); }
  if (!["http:", "https:"].includes(configured.protocol) || configured.username || configured.password) throw new ApiError(503, "origin_setup", "The application origin is not configured safely.");
  if (request.headers.get("origin") !== configured.origin || request.headers.get("sec-fetch-site") === "cross-site") throw new ApiError(403, "origin", "This request must come from Future Echo.");
}
export async function readJson(request: Request, maximum = 16384): Promise<unknown> {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new RangeError("JSON byte limit must be a positive safe integer.");
  if (request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new ApiError(415, "content_type", "Use an application/json request.");
  const encoding = request.headers.get("content-encoding")?.trim().toLowerCase();
  if (encoding && encoding !== "identity") throw new ApiError(415, "content_encoding", "Use an uncompressed JSON request.");
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) || Number(length) > maximum)) throw new ApiError(413, "too_large", "This request is too large.");
  const reader = request.body?.getReader(); if (!reader) throw new ApiError(400, "body", "A request body is required.");
  const chunks: Uint8Array[] = []; let total = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > maximum) { await reader.cancel().catch(() => {}); throw new ApiError(413, "too_large", "This request is too large."); } chunks.push(value); } }
  catch (cause) { if (cause instanceof ApiError) throw cause; throw new ApiError(400, "body", "The request body could not be read."); }
  finally { reader.releaseLock(); }
  if (length !== null && Number(length) !== total) throw new ApiError(400, "body_length", "The request body length is invalid.");
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { throw new ApiError(400, "json", "The request is not valid JSON."); }
}
export const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const exact = (v: Record<string, unknown>, allowed: string[]) => Object.keys(v).every((key) => allowed.includes(key));
export const identifier = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(v) && !["__proto__", "constructor", "prototype"].includes(v);
export function cookieValue(request: Request, name: string): string | undefined {
  const matches = request.headers.get("cookie")?.split(";").map((v) => v.trim()).filter((v) => v.startsWith(`${name}=`));
  // Never let cookie order choose between ambiguous credentials.
  return matches?.length === 1 ? matches[0].slice(name.length + 1) : undefined;
}
