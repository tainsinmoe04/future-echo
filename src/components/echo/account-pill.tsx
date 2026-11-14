"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { backendRequest } from "@/lib/backend-client";
import { accountStorageSuffix, notifyAccountSessionChanged } from "@/lib/account-scope";
import { CHAT_RECOVERY_KEY } from "@/lib/chat-recovery";
import { LIVE_CONNECTION_KEY } from "@/lib/live-connection";

type SessionUser = { id: string; email?: string };

function initials(email: string | undefined): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
  return letters.toUpperCase() || "?";
}

/**
 * Account badge for the app's top navigation. Self-contained: it reads the
 * verified session itself, so it works anywhere in the app shell. Sign out
 * clears this device's cached session state and returns to the landing page.
 */
export function AccountPill() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [known, setKnown] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await backendRequest<{ user: SessionUser | null }>("/api/auth/session");
      const id = session.user?.id;
      await backendRequest("/api/auth/logout", {}, "POST", false, 60000, id ?? undefined);
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
      notifyAccountSessionChanged();
      router.push("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign out could not be completed.");
    } finally { setBusy(false); }
  }

  if (!known) return <span className="echo-account echo-account-pending" aria-hidden="true" />;
  if (!user) return <Link href="/login" className="echo-account-signin">Sign in</Link>;

  return <div className="echo-account" ref={root}>
    <button ref={trigger} type="button" className="echo-account-trigger" aria-expanded={open} aria-controls="echo-account-panel" onClick={() => setOpen((value) => !value)}>
      <span className="echo-account-avatar" aria-hidden="true">{initials(user.email)}</span>
      <span className="echo-account-label">{user.email ?? "Account"}</span>
    </button>
    {open && <div className="echo-account-menu" id="echo-account-panel">
      <p className="echo-account-email">{user.email ?? "Your account"}</p>
      <button type="button" className="echo-button danger echo-account-signout" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>
      {error && <p className="echo-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
