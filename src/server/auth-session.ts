import { ApiError, object } from "./backend-http";

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
}

/** Validate transport shape only. API access still requires network user verification. */
export function parseAuthSession(value: Record<string, unknown>, allowConfirmation = false): AuthSession | undefined {
  if (value.access_token === undefined && value.refresh_token === undefined && allowConfirmation &&
      object(value.user) && typeof value.user.id === "string" && /^[0-9a-f-]{36}$/i.test(value.user.id)) return undefined;
  const access = value.access_token, refresh = value.refresh_token, expires = value.expires_in === undefined ? 3600 : value.expires_in;
  // Leave room for cookie attributes below browsers' usual per-cookie size limit.
  if (typeof access !== "string" || access.length > 3800 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(access) ||
      typeof refresh !== "string" || refresh.length < 1 || refresh.length > 2048 || !/^[A-Za-z0-9_.-]+$/.test(refresh) ||
      typeof expires !== "number" || !Number.isSafeInteger(expires) || expires < 1) {
    throw new ApiError(502, "auth_response", "Account services returned an invalid session. Please sign in again.");
  }
  return { accessToken: access, refreshToken: refresh, accessMaxAge: Math.min(expires, 86400) };
}

/** Local cookie removal does not prove upstream session revocation. */
export async function logoutOutcome(revoke?: () => Promise<unknown>) {
  let serverRevocationConfirmed = false;
  if (revoke) {
    try { await revoke(); serverRevocationConfirmed = true; } catch { /* Never return raw service errors. */ }
  }
  return {
    signedOut: true as const,
    serverRevocationConfirmed,
    ...(serverRevocationConfirmed ? {} : { message: "Signed out on this browser. Server session revocation could not be confirmed." }),
  };
}
