"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { backendRequest } from "@/lib/backend-client";

const copy = {
  en: {
    login: "Log in", signup: "Meet your future self", resume: "Continue conversation", locale: "Page language",
    eyebrow: "A conversation across time", heading: "Somewhere ahead.\nStill you.",
    description: "Talk with an imagined version of yourself, shaped by the direction you choose.",
    truth: "One possible future. Never a prediction.",
    example: "A fictional exchange", today: "You · today", future: "Your imagined future self",
    presentWords: "What if I’m not where I thought I’d be by now?",
    futureWords: "I remember that feeling. What still feels like yours to choose today?",
    memory: "Keep only what you choose", memoryBody: "Save a moment on purpose. Your words stay yours, and saving alone doesn’t give AI permission to use them.",
  },
  my: {
    login: "ဝင်ရန်", signup: "အနာဂတ်က ကိုယ်နဲ့ တွေ့မယ်", resume: "စကားဆက်ပြောမယ်", locale: "စာမျက်နှာ ဘာသာစကား",
    eyebrow: "အချိန်ကို ဖြတ်ကျော်တဲ့ စကားဝိုင်း", heading: "ရှေ့တစ်နေရာမှာ။\nကိုယ်ပဲ ရှိနေတယ်။",
    description: "ကိုယ်ရွေးထားတဲ့ လမ်းကြောင်းအတိုင်း စိတ်ကူးထားတဲ့ အနာဂတ်က ကိုယ်နဲ့ စကားပြောကြည့်ပါ။",
    truth: "ဖြစ်နိုင်တဲ့ အနာဂတ်တစ်ခုပါ။ ကြိုတင်ဟောကိန်း မဟုတ်ပါ။",
    example: "စိတ်ကူးယဉ် နမူနာစကားဝိုင်း", today: "ယနေ့က ကိုယ်", future: "စိတ်ကူးထားတဲ့ အနာဂတ်က ကိုယ်",
    presentWords: "ဒီအချိန်မှာ ရောက်နေမယ်လို့ ထင်ခဲ့တဲ့ နေရာကို မရောက်သေးရင်ရော။",
    futureWords: "အဲဒီခံစားချက်ကို မှတ်မိတယ်။ ဒီနေ့ ကိုယ်တိုင် ရွေးလို့ရသေးတာ ဘာရှိလဲ။",
    memory: "ကိုယ်ရွေးတာကိုပဲ သိမ်းပါ", memoryBody: "သိမ်းချင်တဲ့ အခိုက်အတန့်ကို ကိုယ်တိုင်ရွေးပါ။ သိမ်းလိုက်ရုံနဲ့ AI သုံးဖို့ ခွင့်ပြုလိုက်တာ မဟုတ်ပါ။",
  },
};

type Locale = keyof typeof copy;
const localeKey = "future-echo-home-language";
const localeEvent = "future-echo-home-language-change";
let volatileLocale: Locale | undefined;
function readLocale(): Locale {
  if (volatileLocale) return volatileLocale;
  try { return localStorage.getItem(localeKey) === "my" ? "my" : "en"; } catch { return "en"; }
}
function subscribeLocale(listener: () => void) {
  window.addEventListener(localeEvent, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(localeEvent, listener); window.removeEventListener("storage", listener); };
}
function changeLocale(locale: Locale) {
  try { localStorage.setItem(localeKey, locale); volatileLocale = undefined; } catch { volatileLocale = locale; }
  window.dispatchEvent(new Event(localeEvent));
}

export function EchoLanding() {
  const locale = useSyncExternalStore(subscribeLocale, readLocale, () => "en" as Locale);
  const t = copy[locale];
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let active = true;
    void backendRequest<{ user: { id: string } | null }>("/api/auth/session")
      .then(({ user }) => { if (active) setSignedIn(Boolean(user?.id)); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <main className="across-home" lang={locale}>
    <header className="across-header">
      <Link href="/" className="across-wordmark"><Image src="/brand/across-mark.svg" alt="" width={23} height={23} />Future Echo</Link>
      <div className="across-header-actions">
        <div className="across-languages" role="group" aria-label={t.locale}>
          <button type="button" lang="en" aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
          <button type="button" lang="my" aria-pressed={locale === "my"} onClick={() => changeLocale("my")}>မြန်မာ</button>
        </div>
        {!signedIn && <Link href="/login" className="across-login">{t.login}</Link>}
      </div>
    </header>
    <section className="across-hero" aria-labelledby="across-title">
      <div className="across-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
      <Image className="across-emblem" src="/brand/across-mark.svg" alt="" width={96} height={96} priority />
      <div className="across-hero-copy">
        <p className="across-kicker">{t.eyebrow}</p>
        <h1 id="across-title">{t.heading}</h1>
        <p className="across-description">{t.description}</p>
        <Link href={signedIn ? "/now" : "/signup"} className="across-primary">{signedIn ? t.resume : t.signup}<span aria-hidden="true">↗</span></Link>
        <p className="across-truth">{t.truth}</p>
      </div>
    </section>
    <section className="across-exchange" aria-label={t.example}>
      <p className="across-kicker">{t.example}</p>
      <div className="across-line across-present"><span>{t.today}</span><p>{t.presentWords}</p></div>
      <div className="across-line across-future"><span>{t.future}</span><p>{t.futureWords}</p></div>
    </section>
    <footer className="across-footer"><h2>{t.memory}</h2><p>{t.memoryBody}</p></footer>
  </main>;
}
