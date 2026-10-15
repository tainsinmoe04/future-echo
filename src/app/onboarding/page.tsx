"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMockProductState } from "@/components/mock-product-state";
import { BackIcon, OrbitIcon } from "@/components/echo/icons";
import { MAX_IDENTITY_LENGTH } from "@/lib/redaction";
import { addMonths, formatHorizonLabel, horizonFromMonths, horizonMonthsAhead } from "@/lib/moment-lifecycle";

const presets = [6, 12, 36, 60];
export default function Onboarding() {
  const router = useRouter();
  const { activeIdentity, createIdentityVersion } = useMockProductState();
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [step, setStep] = useState(0);
  const [definition, setDefinition] = useState("");
  const [reason, setReason] = useState("");
  const [anchor, setAnchor] = useState("");
  const [months, setMonths] = useState(36);
  const [custom, setCustom] = useState("");
  const [adult, setAdult] = useState(false);
  const [replace, setReplace] = useState(false);
  const horizon = custom ? horizonMonthsAhead(custom, today) >= 6
    ? { targetMonth: custom, label: formatHorizonLabel(custom) } : null : horizonFromMonths(months, today);
  const canContinue = step === 0 ? Boolean(definition.trim()) : step === 1 ? Boolean(horizon) : adult && (!activeIdentity || replace);

  return <main className="echo-ui echo-stage"><section className="echo-onboarding">
    <header className="echo-space-header"><Link href="/now" className="echo-icon-button" aria-label="Back to conversation"><BackIcon /></Link><span>Future Echo</span><OrbitIcon /></header>
    <ol className="echo-onboarding-steps" aria-label="Setup progress">{["Direction", "Distance", "Meet yourself"].map((name, index) => <li key={name} aria-current={step === index ? "step" : undefined}>{name}</li>)}</ol>
    <form onSubmit={(event) => {
      event.preventDefault();
      if (!canContinue) return;
      if (step < 2) { setStep(step + 1); return; }
      if (!horizon) return;
      createIdentityVersion({ definition, horizon, reason, anchor, principles: anchor.trim() ? [anchor.trim()] : [] });
      router.push("/now");
    }}>
      <h1>{step === 0 ? "Who are you becoming?" : step === 1 ? "A little farther along." : "One possible future. Yours."}</h1>
      <p className="onboarding-intro">{step === 0 ? "Start with a direction that feels like yours. It can change as you do." : step === 1 ? "Choose where this imagined perspective is speaking from. At least six months gives you a little distance." : "A voice shaped by what matters to you, with room for doubt and changing your mind."}</p>
      {step === 0 && <div className="echo-onboarding-fields">
        <label>One possible version of me is…<textarea rows={3} maxLength={MAX_IDENTITY_LENGTH} value={definition} onChange={(event) => setDefinition(event.target.value)} placeholder="Someone who makes things without losing the rest of their life" required /></label>
        <label>Why does this direction matter to you? <span>Optional</span><textarea rows={2} maxLength={MAX_IDENTITY_LENGTH} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What made you want to begin?" /></label>
        <label>What do you want to hold on to? <span>Optional</span><textarea rows={2} maxLength={MAX_IDENTITY_LENGTH} value={anchor} onChange={(event) => setAnchor(event.target.value)} placeholder="My curiosity. Time with the people I love…" /></label>
      </div>}
      {step === 1 && <div className="echo-onboarding-fields"><div className="echo-horizon-options">{presets.map((value) => <button type="button" key={value} aria-pressed={!custom && months === value} onClick={() => { setMonths(value); setCustom(""); }}><strong>{value < 12 ? value : value / 12}</strong><span>{value < 12 ? "months" : value === 12 ? "year" : "years"}</span></button>)}</div><label>Or choose a month and year<input type="month" value={custom} min={addMonths(today, 6).slice(0, 7)} onChange={(event) => setCustom(event.target.value)} aria-invalid={Boolean(custom && !horizon)} /></label>{custom && !horizon && <p className="echo-error">Choose a horizon at least six months from now.</p>}</div>}
      {step === 2 && <div className="echo-onboarding-review"><div className="onboarding-future"><OrbitIcon /><div><span>{horizon?.targetMonth.slice(0, 4)} · Your Future Self</span><p>{definition}</p></div></div>{reason && <p><strong>Why I began</strong>{reason}</p>}{anchor && <p><strong>What I’m holding on to</strong>{anchor}</p>}<p>An imagined possible future, not a prediction. Warm, honest, calm. It cannot know what will happen or decide your path for you.</p><label className="echo-check-label"><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} />I am 18 or older.</label>{activeIdentity && <label className="echo-check-label"><input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} />Close my current version and begin this one. My earlier conversations and moments stay readable and do not transfer into the new chat.</label>}</div>}
      <div className="echo-form-actions">{step > 0 && <button type="button" className="echo-button outline" onClick={() => setStep(step - 1)}>Back</button>}<button type="submit" className="echo-button lilac" disabled={!canContinue}>{step === 2 ? "Meet your Future Self" : "Continue"}</button></div>
      <p className="echo-preview-note">Local preview · no account or AI connection</p>
    </form>
  </section></main>;
}
