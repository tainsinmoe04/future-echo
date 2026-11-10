"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { Eye, Lock, Mail } from "./icons";
import { backendRequest } from "@/lib/backend-client";

export function AuthShell({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup", router = useRouter();
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();
  const submitting = useRef(false), feedback = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (notice) feedback.current?.focus(); }, [notice]);
  useEffect(() => { const timer=setTimeout(()=>{ if(new URLSearchParams(window.location.search).get("google")==="failed") setNotice({text:"Google sign-in was not completed or expired. Please try again.",error:true}); },0); return ()=>clearTimeout(timer); },[]);
  async function google() {
    if (submitting.current) return;
    const adult=formRef.current?.elements.namedItem("adult") as HTMLInputElement|null;
    if (!adult?.checked) { adult?.reportValidity(); adult?.focus(); return; }
    submitting.current=true; setBusy(true); setNotice(undefined);
    try { const result=await backendRequest<{url:string}>("/api/auth/google",{adultConfirmed:true,signup}); sessionStorage.setItem("future-echo-account-start", "yes"); window.location.assign(result.url); }
    catch(error) { setNotice({text:error instanceof Error?error.message:"Google sign-in is unavailable.",error:true}); submitting.current=false;setBusy(false); }
  }

  async function submit(form: HTMLFormElement) {
    if (submitting.current) return;
    submitting.current = true;
    const data = new FormData(form);
    setBusy(true); setNotice(undefined);
    try {
      const result = await backendRequest<{ signedIn?: boolean; message?: string }>(`/api/auth/${mode}`, {
        email: data.get("email"), password: data.get("password"),
        ...(signup ? { name: data.get("name") } : {}), adultConfirmed: data.get("adult") === "on",
      });
      if (result.signedIn) {
        sessionStorage.setItem("future-echo-account-start", "yes");
        form.reset();
        router.push(signup ? "/onboarding" : "/now");
      } else setNotice({ text: result.message ?? "Check your email before signing in.", error: false });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Sign-in is unavailable. Please try again.", error: true });
    } finally { submitting.current = false; setBusy(false); }
  }

  return <main className="echo-public auth-page">
    <header className="auth-header"><Brand /><Link href="/" className="auth-back-link">Back to home</Link></header>
    <section className="auth-content" aria-labelledby="auth-heading">
      <div className="auth-heading">
        <h1 id="auth-heading">{signup ? "A space of your own." : "Welcome back."}</h1>
        <p>{signup ? "Create your account, then meet one possible future you." : "Come back to your conversation."}</p>
      </div>
      <form ref={formRef} className="auth-form" aria-label={signup ? "Create an account" : "Log in"} aria-busy={busy} onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
        <fieldset disabled={busy}>
          {signup && <label className="auth-label" htmlFor="auth-name">Name <span className="auth-optional">optional</span><input id="auth-name" name="name" className="auth-input" maxLength={120} autoComplete="name" /></label>}
          <label className="auth-label" htmlFor="auth-email">Email</label>
          <div className="auth-input-wrap"><Mail aria-hidden="true" /><input id="auth-email" name="email" type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} className="auth-input auth-input-email" placeholder="you@example.com" /></div>
          <label className="auth-label" htmlFor="auth-password">Password</label>
          <div className="auth-input-wrap"><Lock aria-hidden="true" /><input id="auth-password" name="password" type={show ? "text" : "password"} required minLength={8} maxLength={256} autoComplete={signup ? "new-password" : "current-password"} aria-describedby={signup ? "auth-password-help" : undefined} className="auth-input auth-input-password" placeholder={signup ? "Create a password" : "Enter your password"} /><button type="button" className="auth-password-toggle" aria-label={show ? "Hide password" : "Show password"} aria-pressed={show} onClick={() => setShow(current => !current)}><Eye aria-hidden="true" /></button></div>
          {signup && <p id="auth-password-help" className="auth-field-help">At least 8 characters.</p>}
          <label className="auth-adult"><input name="adult" type="checkbox" required /><span>I am 18 or older.<small>This beta is for adults.</small></span></label>
          <p className="auth-field-help">Continuing prepares your AI conversation automatically once you choose your Future Self. Your messages and direction are processed by our AI service. Saved moments are shared only with your separate permission; photos and journal drafts stay on this device. This is not end-to-end encrypted. You can disconnect in Settings.</p>
          <button type="submit" className="auth-submit" disabled={busy}>{busy ? signup ? "Creating your account…" : "Signing in…" : signup ? "Create account" : "Log in"}</button>
          <button type="button" className="auth-submit" disabled={busy} onClick={()=>void google()}>Continue with Google</button>
        </fieldset>
        {notice && <p ref={feedback} tabIndex={-1} role={notice.error ? "alert" : "status"} className={`auth-feedback ${notice.error ? "is-error" : ""}`}>{notice.text}</p>}
      </form>
      <p className="auth-switch">{signup ? "Already have an account?" : "New here?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link></p>
      <div className="auth-device-option"><span>Or keep it on this device</span><Link href="/onboarding">Continue without an account</Link></div>
      <div className="auth-privacy"><p>Your journal stays on this device. Signing in does not upload it.</p><p>An imagined possible future self, not a prediction.</p><details><summary>About account access</summary><p>Email/password and Google sign-in require server and provider setup. Password recovery is not available in this beta. You can use the local journal without an account.</p></details></div>
    </section>
  </main>;
}
