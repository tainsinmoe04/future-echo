import type { Metadata } from "next";
import { Caveat, Lora, Manrope, Nunito_Sans } from "next/font/google";
import { MockProductStateProvider } from "@/components/mock-product-state";
import { openRouterTrialEnabled } from "@/server/openrouter-provider";
import { seaLionTrialEnabled } from "@/server/sealion-provider";
import { backendConfig } from "@/server/backend-config";
import "./globals.css";
import "./echo.css";
import "./auth.css";
import "./journal-romantic.css";
import "./interface.css";

const body = Manrope({ variable:"--font-body", subsets:["latin"] });
const display = Nunito_Sans({ variable:"--font-display", subsets:["latin"] });
const handwritten = Caveat({ variable: "--font-handwritten", subsets: ["latin"], display: "swap", preload: false });
const book = Lora({ variable: "--font-book", subsets: ["latin"], display: "swap", preload: false });
export const metadata: Metadata = { title:{ default:"Future Echo", template:"%s — Future Echo" }, description:"A quiet conversation with one possible future perspective.", icons: { apple: "/brand/future-echo-across.png" } };
export default function RootLayout({ children }:{ children:React.ReactNode }) { const seaLion = seaLionTrialEnabled(), config = backendConfig(); return <html lang="en"><body className={`${body.variable} ${display.variable} ${handwritten.variable} ${book.variable}`}><MockProductStateProvider trialAI={seaLion || (openRouterTrialEnabled() && process.env.FUTURE_ECHO_SEALION_TRIAL !== "true")} trialProvider={seaLion ? "SEA-LION" : "OpenRouter"} liveAIAvailable={config.aiEnabled} connectedProvider={config.provider === "sealion" ? "SEA-LION" : "Gemini"}>{children}</MockProductStateProvider></body></html>; }
