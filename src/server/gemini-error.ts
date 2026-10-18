import { ApiError, object } from "./backend-http";

/** Inspect provider diagnostics only on the server. Never forward raw errors or credentials. */
export function geminiFailure(httpStatus: number, payload: unknown): ApiError {
  const error = object(payload) && object(payload.error) ? payload.error : undefined;
  const message = typeof error?.message === "string" ? error.message.slice(0, 2000) : "";
  const reasons = Array.isArray(error?.details) ? error.details.filter(object).map((d) => d.reason) : [];
  if ([400, 403].includes(httpStatus) && /(?:location|country|region).{0,100}(?:not supported|unsupported|not available)/i.test(message)) {
    return new ApiError(503, "provider_region", "Google is not allowing Gemini API access from this connection's region. Check supported regions and account eligibility. Re-sending this message will not resolve the setup issue.");
  }
  if (httpStatus === 401 || reasons.includes("API_KEY_INVALID") || /api key (?:not valid|is invalid|has expired)|invalid api key/i.test(message)) {
    return new ApiError(503, "provider_credentials", "Google could not accept the Gemini API credentials. Check the server key and its API restrictions; do not paste the key into chat.");
  }
  if ([400, 403].includes(httpStatus) && /billing|paid tier|payment required/i.test(message)) {
    return new ApiError(503, "provider_billing", "Google reports a billing or plan prerequisite. Review the provider project settings before continuing; Future Echo has not enabled billing or changed your plan.");
  }
  if (httpStatus === 404) return new ApiError(503, "provider_model", "The configured Gemini model is not available at this endpoint. Check its exact model ID and project access; no alternative model was selected.");
  if (httpStatus === 429) return new ApiError(429, "provider_limit", "Google's request or usage limit was reached. Check the provider allowance before sending again; no finished reply was received.");
  if (httpStatus === 403) return new ApiError(503, "provider_access", "Google denied this project's Gemini API access. Check API enablement, key restrictions and account eligibility.");
  return new ApiError(502, "provider_error", "The reply service is unavailable right now. Please try again later.");
}
