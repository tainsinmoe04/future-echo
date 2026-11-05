import type { Metadata } from "next";
import { Caveat, Lora, Manrope, Noto_Sans_Myanmar, Noto_Serif_Myanmar, Nunito_Sans, Padauk } from "next/font/google";
import { MockProductStateProvider } from "@/components/mock-product-state";
import { openRouterTrialEnabled } from "@/server/openrouter-provider";
import { seaLionTrialEnabled } from "@/server/sealion-provider";
import { aiConfigured, backendConfig } from "@/server/backend-config";
import "./globals.css";
import "./echo.css";
import "./auth.css";

const body = Manrope({ variable:"--font-body", subsets:["latin"] });
const display = Nunito_Sans({ variable:"--font-display", subsets:["latin"] });
const handwritten = Caveat({ variable: "--font-handwritten", subsets: ["latin"], display: "swap", preload: false });
const book = Lora({ variable: "--font-book", subsets: ["latin"], display: "swap", preload: false });
const myanmar = Noto_Sans_Myanmar({ variable: "--font-myanmar", subsets: ["myanmar"], weight: ["400", "600"], display: "swap", preload: false });
const myanmarSoft = Padauk({ variable: "--font-myanmar-soft", subsets: ["myanmar"], weight: "400", display: "swap", preload: false });
const myanmarBook = Noto_Serif_Myanmar({ variable: "--font-myanmar-book", subsets: ["myanmar"], weight: "400", display: "swap", preload: false });
export const metadata: Metadata = { title:{ default:"Future Echo", template:"%s — Future Echo" }, description:"A quiet conversation with one possible future perspective." };
export default function RootLayout({ children }:{ children:React.ReactNode }) { const seaLion = seaLionTrialEnabled(), config = backendConfig(); return <html lang="en"><body className={`${body.variable} ${display.variable} ${handwritten.variable} ${book.variable} ${myanmar.variable} ${myanmarSoft.variable} ${myanmarBook.variable}`}><MockProductStateProvider trialAI={seaLion || (openRouterTrialEnabled() && process.env.FUTURE_ECHO_SEALION_TRIAL !== "true")} trialProvider={seaLion ? "SEA-LION" : "OpenRouter"} liveAIAvailable={aiConfigured(config)} connectedProvider={config.provider === "sealion" ? "SEA-LION" : "Gemini"}>{children}</MockProductStateProvider></body></html>; }
