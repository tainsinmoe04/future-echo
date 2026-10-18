"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DemoJourney } from "./echo/demo-journey";
import { Brand } from "./brand";
import { Eye, Lock, Mail } from "./icons";
import { backendRequest } from "@/lib/backend-client";
export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup", router = useRouter();
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  async function submit(form: HTMLFormElement) {
    const data = new FormData(form); setBusy(true); setNotice("");
    try {
      const result = await backendRequest<{ signedIn?: boolean; message?: string }>(`/api/auth/${mode}`, { email: data.get("email"), password: data.get("password"), ...(signup ? { name: data.get("name") } : {}), adultConfirmed: data.get("adult") === "on" });
      if (result.signedIn) router.push(signup ? "/onboarding" : "/now"); else setNotice(result.message ?? "Check your email before signing in.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Sign-in is unavailable."); } finally { setBusy(false); }
  }
  return <main className="echo-public shell grid min-h-screen gap-10 py-7 lg:grid-cols-[1fr_.9fr]"><section className="flex flex-col"><Brand /><div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14"><p className="eyebrow">{signup ? "Make a private space" : "Welcome back"}</p><h1 className="display mt-4 text-5xl sm:text-6xl">{signup ? "Begin with one possible direction." : "Return to what you chose to carry."}</h1><p className="mt-5 leading-7 text-muted">An imagined possible future, not a prediction. Signing in does not upload your local journal. Connect AI separately in Your Space settings.</p><p className="mt-6 text-sm text-muted">Email sign-in · Google sign-in is not configured.</p>
    <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
      {signup && <label className="block text-sm"><span className="mb-2 block">Name</span><input name="name" className="field" maxLength={120} autoComplete="name" /></label>}
      <label className="block text-sm"><span className="mb-2 block">Email</span><span className="relative block"><Mail className="absolute left-4 top-4 text-muted" /><input name="email" type="email" required maxLength={254} autoComplete="email" className="field pl-12" placeholder="you@example.com" /></span></label>
      <label className="block text-sm"><span className="mb-2 block">Password</span><span className="relative block"><Lock className="absolute left-4 top-4 text-muted" /><input name="password" type={show ? "text" : "password"} required minLength={8} maxLength={256} autoComplete={signup ? "new-password" : "current-password"} className="field px-12" placeholder="At least 8 characters" /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)} className="absolute right-4 top-4 text-muted"><Eye /></button></span></label>
      <label className="flex items-start gap-3 text-sm"><input name="adult" type="checkbox" required className="mt-1" /><span>I confirm I am 18 or older. This beta is for adults.</span></label>
      {notice && <p role="status" className="text-sm leading-6">{notice}</p>}<button type="submit" disabled={busy} className="button-primary mt-2 w-full">{busy ? "Please wait…" : signup ? "Create my space" : "Log in"}</button>
    </form><p className="mt-7 text-center text-sm text-muted">{signup ? "Already have an account?" : "New to Future Echo?"} <Link className="quiet-link" href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p><Link href="/onboarding" className="quiet-link mt-5 text-center text-sm">Start on this device without an account</Link></div></section><aside className="hidden items-center justify-center lg:flex"><div className="w-full max-w-md"><DemoJourney /><p className="mt-5 max-w-sm text-sm leading-6 text-muted">Quiet company without pretending to know your future.</p></div></aside></main>;
}
