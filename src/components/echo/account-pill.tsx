"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backendRequest } from "@/lib/backend-client";
import { accountStorageSuffix, notifyAccountSessionChanged } from "@/lib/account-scope";
import { CHAT_RECOVERY_KEY } from "@/lib/chat-recovery";
import { LIVE_CONNECTION_KEY } from "@/lib/live-connection";

type SessionUser = { id: string; email?: string };

/** One letter for the avatar — the header never spells out the address inline. */
function initial(email: string | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  return (local.match(/[a-z0-9]/i)?.[0] ?? "").toUpperCase();
}

/**
 * Account badge for the app's top navigation. Self-contained: it reads the
 * verified session itself, so it works anywhere in the app shell. The header
 * shows only a circular avatar; the address and Sign out live in the popover.
 * Sign out clears this device's cached session state and returns to the
 * landing page.
 */
export function AccountPill() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [known, setKnown] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** Upstream revocation failed: keep this popover open so the warning is readable. */
  const [revocationWarning, setRevocationWarning] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let current = true;
    backendRequest<{ user: SessionUser | null }>("/api/auth/session")
      .then((session) => { if (current) { setUser(session.user); setKnown(true); } })
      .catch(() => { if (current) { setUser(null); setKnown(true); } });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    const onPointerDown = (event: MouseEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("mousedown", onPointerDown); };
  }, [open]);

  function leave() {
    notifyAccountSessionChanged();
    router.push("/");
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    setRevocationWarning(false);
    try {
      const session = await backendRequest<{ user: SessionUser | null }>("/api/auth/session");
      const id = session.user?.id;
      const result = await backendRequest<{ serverRevocationConfirmed?: boolean }>("/api/auth/logout", {}, "POST", false, 60000, id ?? undefined);
      if (id) {
        const suffix = accountStorageSuffix(id);
        try {
          // Device caches, not the journal: the account's saved pages stay on this device.
          sessionStorage.removeItem(`${LIVE_CONNECTION_KEY}:${suffix}`);
          localStorage.removeItem(`${LIVE_CONNECTION_KEY}:${suffix}`);
          sessionStorage.removeItem(`${CHAT_RECOVERY_KEY}:${suffix}`);
          localStorage.removeItem(`${CHAT_RECOVERY_KEY}:${suffix}`);
          sessionStorage.removeItem("future-echo-account-start");
        } catch { /* Blocked storage still leaves the session cookie cleared. */ }
      }
      if (result.serverRevocationConfirmed === true) { leave(); return; }
      // Cookies are cleared but upstream revocation is unconfirmed. Stay on the
      // warning instead of navigating it away before it can be read.
      setRevocationWarning(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign out could not be completed.");
    } finally { setBusy(false); }
  }

  if (!known) return <span className="echo-account echo-account-pending" aria-hidden="true" />;
  if (!user) return <Link href="/login" className="echo-account-signin">Sign in</Link>;

  const letter = initial(user.email);
  return <div className="echo-account" ref={root}>
    <button ref={trigger} type="button" className="echo-account-trigger" aria-label={user.email ? `Account: ${user.email}` : "Account"} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
      {letter ? <span aria-hidden="true">{letter}</span> : <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c1.6-3.2 4-4.8 7-4.8s5.4 1.6 7 4.8" /></svg>}
    </button>
    {/* Stays mounted so it can fade out; visibility hides it from view and
        the tab order while closed. */}
    <div className="echo-account-menu" id={panelId} data-open={open ? "" : undefined}>
      <p className="echo-account-email">{user.email ?? "Your account"}</p>
      {revocationWarning
        ? <><p className="echo-error" role="alert">Signed out on this browser. Server session revocation could not be confirmed. A previously copied session may remain valid until it expires.</p><button type="button" className="echo-button outline echo-account-signout" onClick={leave}>Continue</button></>
        : <button type="button" className="echo-button danger echo-account-signout" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>}
      {error && <p className="echo-error" role="alert">{error}</p>}
    </div>
  </div>;
}
