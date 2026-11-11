"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { backendRequest } from "@/lib/backend-client";
import { notifyAccountSessionChanged } from "@/lib/account-scope";
import { useMockProductState } from "../mock-product-state";
export function BackendSettings() {
  const { account, trialAI, trialProvider, connectedProvider, connectedAI, connectAI, disconnectAI } = useMockProductState();
  const [ready, setReady] = useState(false), [email, setEmail] = useState<string>(), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [adultConfirmed,setAdultConfirmed]=useState(false);
  useEffect(() => { if (trialAI) return; let current = true; Promise.all([backendRequest<{ aiConfigured: boolean }>("/api/backend/status"), backendRequest<{ user: { id: string; email: string } | null }>("/api/auth/session")]).then(([status, session]) => { if (current) { setReady(status.aiConfigured); setEmail(session.user?.id === account ? session.user?.email : undefined); } }).catch((error) => { if (current) setNotice(error.message); }); return () => { current = false; }; }, [account, trialAI]);
  async function change(action: "connect" | "disconnect" | "logout") {
    setBusy(true); setNotice("");
    try {
      if (action === "connect") { if (!adultConfirmed) throw new Error("Confirm you are 18 or older before connecting."); await connectAI(); }
      else if (action === "logout") {
        let clearingFailed = false;
        try { await disconnectAI(); } catch { clearingFailed = true; }
        const result = await backendRequest<{ serverRevocationConfirmed?: boolean }>("/api/auth/logout", {}, "POST", false, 60000, account ?? undefined); setEmail(undefined);
        const notices = ["Signed out on this browser."];
        if (result.serverRevocationConfirmed !== true) notices.push("Server session revocation could not be confirmed. A previously copied session may remain valid until it expires.");
        if (clearingFailed) notices.push("Removal of shared memory text could not be confirmed. Sign in again to clear it when account storage is available.");
        setNotice(notices.join(" "));
        try { sessionStorage.removeItem("future-echo-account-start"); } catch { /* Session invalidation still happens. */ }
        notifyAccountSessionChanged();
      } else await disconnectAI();
    }
    catch (error) { setNotice(error instanceof Error ? error.message : "Account services could not be reached."); } finally { setBusy(false); }
  }
  if (trialAI) return <section className="echo-settings-section"><h2>Your conversation connection</h2><p>{trialProvider === "SEA-LION" ? "SEA-LION · Qwen v4.5 27B · English / Myanmar private demo" : "OpenRouter · Dots3-Note Preview · English-first private demo"}</p><p>{trialProvider === "SEA-LION" ? "English and Myanmar passed limited fictional smoke checks, not a full safety or fluency review. Replies may be awkward, incorrect, slow or unavailable. AI Singapore processes the selected text; zero retention and non-training are not established. Avoid sensitive details in this private trial." : "This model is a provisional demo choice, not verified multilingual support. Burmese and Japanese quality checks failed; German also needs review. Free replies can be unavailable or slow."}</p><p>Replies go to {trialProvider === "SEA-LION" ? "AI Singapore's SEA-LION API" : "OpenRouter and its model provider"}, not Ollama. Your current direction, up to ten recent messages and up to three permitted excerpts are sent. Notes require separate permission. This trial does not use account history or sync your journal. No other model is tried automatically.</p><p className="echo-muted">Chat and drafts survive tab closure on this device. The existing Free 30-day / Plus 90-day history window is unchanged; browser cleanup or storage failure can remove local data. Explicitly saved moments remain in this browser. Local storage and backups are not encrypted. This is not E2EE or a public release.</p></section>;
  return <section className="echo-settings-section"><h2>Your account</h2><p>{ready ? connectedAI ? "Your conversation is ready." : "Your conversation is not ready yet." : "Conversations are temporarily unavailable."}</p><details className="account-privacy"><summary>How your conversation data is used</summary><p>Connecting shares your chosen direction, messages, and only the text of moments you explicitly allowed. Notes need their own permission. Photos, page decorations and unfinished drafts stay on this device.</p>
    {connectedProvider === "SEA-LION" && <p>AI Singapore processes your current message, direction, up to ten recent messages and up to three permitted excerpts. Zero retention and non-training are not established. This is not E2EE; avoid sensitive details. English and Myanmar quality remains provisional. Account conversations retain the existing Free 30-day / Plus 90-day history window; this does not upload the full journal.</p>}
    </details>{email ? <><p>Signed in as <strong>{email}</strong></p>{!connectedAI && <label className="echo-check"><input type="checkbox" checked={adultConfirmed} onChange={event=>setAdultConfirmed(event.target.checked)} />I am 18 or older and want to connect this direction to live AI.</label>}<div className="journal-backup-actions"><button className="echo-button lilac" disabled={busy || !ready || (!connectedAI && !adultConfirmed)} onClick={() => void change(connectedAI ? "disconnect" : "connect")}>{busy ? "Please wait…" : connectedAI ? "Disconnect & clear shared memory text" : "Prepare my conversation"}</button><button className="echo-button outline" disabled={busy} onClick={() => void change("logout")}>Sign out</button></div></> : <Link className="echo-button outline" href="/login">Sign in</Link>}
    <p className="echo-muted">AI is an imagined perspective, not a prediction. Song suggestions are not catalog-verified. No music account is connected and nothing plays automatically. Disconnecting clears shared memory text; account conversations and saved playlists remain.</p>{notice && <p role="alert">{notice}</p>}</section>;
}
