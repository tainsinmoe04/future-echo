"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { backendRequest } from "@/lib/backend-client";
import { useMockProductState } from "../mock-product-state";
export function BackendSettings() {
  const { connectedAI, connectAI, disconnectAI } = useMockProductState();
  const [ready, setReady] = useState(false), [email, setEmail] = useState<string>(), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  useEffect(() => { let current = true; Promise.all([backendRequest<{ aiConfigured: boolean }>("/api/backend/status"), backendRequest<{ user: { email: string } | null }>("/api/auth/session")]).then(([status, session]) => { if (current) { setReady(status.aiConfigured); setEmail(session.user?.email); } }).catch((error) => { if (current) setNotice(error.message); }); return () => { current = false; }; }, []);
  async function change(action: "connect" | "disconnect" | "logout") {
    setBusy(true); setNotice("");
    try {
      if (action === "connect") await connectAI();
      else if (action === "logout") {
        let clearingFailed = false;
        try { await disconnectAI(); } catch { clearingFailed = true; }
        await backendRequest("/api/auth/logout", {}); setEmail(undefined);
        if (clearingFailed) setNotice("Signed out. Removal of shared memory text could not be confirmed. Sign in again to clear it when account storage is available.");
      } else await disconnectAI();
    }
    catch (error) { setNotice(error instanceof Error ? error.message : "Account services could not be reached."); } finally { setBusy(false); }
  }
  return <section className="echo-settings-section"><h2>Your conversation connection</h2><p>{ready ? "Supabase + Gemini are configured on this server." : "Local preview. Account and Gemini setup is not complete."}</p><p>Connecting shares your chosen direction, messages, and only the text of moments you explicitly allowed. Notes need their own permission. Photos, page decorations and unfinished drafts stay on this device.</p>
    {email ? <><p>Signed in as {email}</p><div className="journal-backup-actions"><button className="echo-button lilac" disabled={busy || !ready} onClick={() => void change(connectedAI ? "disconnect" : "connect")}>{busy ? "Please wait…" : connectedAI ? "Disconnect & clear shared memory text" : "Connect this direction to Gemini"}</button><button className="echo-text-button" disabled={busy} onClick={() => void change("logout")}>Sign out</button></div></> : <Link className="echo-button outline" href="/login">Sign in to connect</Link>}
    <p className="echo-muted">AI is an imagined perspective, not a prediction. Song suggestions are not catalog-verified. No music account is connected and nothing plays automatically. Disconnecting clears shared memory text; account conversations and saved playlists remain.</p>{notice && <p role="alert">{notice}</p>}</section>;
}
