"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MomentPaper } from "./moment-paper";
import type { JourneyMoment } from "@/lib/domain";
const words = "Everyone seems further ahead. I’m tired of comparing my life to theirs.";
const reply = "Your pace is not proof that this direction is wrong. When the comparison gets quiet, does it still feel like yours?";
export function DemoJourney() {
  const [phase, setPhase] = useState<"ready" | "typing" | "reply" | "saved">("ready");
  useEffect(() => { if (phase !== "typing") return; const timer = setTimeout(() => setPhase("reply"), 650); return () => clearTimeout(timer); }, [phase]);
  const moment: JourneyMoment = { id: "demo-only", identityVersionId: "demo-only", kind: "conversation", title: "A little less comparison", originalExcerpt: words, relatedAiReply: reply, occurredAt: "2026-10-15T12:00:00.000Z", revisitAt: "2027-04-15T12:00:00.000Z", consent: { useInAiContext: false, includeMyNoteInAiContext: false, recordedAt: "2026-10-15T12:00:00.000Z" } };
  return <section className="echo-ui echo-demo" aria-label="Fictional Future Echo demo"><p className="echo-muted">Fictional demo · never added to your journal</p>{phase === "saved" ? <><MomentPaper moment={moment} placements={[]} /><p className="echo-muted" role="status">This is only a preview. Your own space starts empty.</p><Link href="/onboarding" className="echo-button butter">Choose your own direction</Link><button className="echo-text-button" onClick={() => setPhase("ready")}>Replay the example</button></> : <><header><strong>Your Future Self</strong><span>An imagined possible future</span></header><div className="echo-messages"><article className="echo-message from-present"><p>{words}</p></article>{phase === "reply" && <article className="echo-message from-future"><p>{reply}</p></article>}</div>{phase === "typing" && <p className="echo-muted" role="status">Your Future Self is typing…</p>}{phase === "ready" && <button className="echo-button lilac" onClick={() => setPhase("typing")}>Send this example</button>}{phase === "reply" && <div className="echo-form-actions"><button className="echo-button butter" onClick={() => setPhase("saved")}>Save this moment</button><button className="echo-button outline" onClick={() => setPhase("ready")}>Leave it here</button></div>}</>}</section>;
}
