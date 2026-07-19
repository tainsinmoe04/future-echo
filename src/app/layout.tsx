import type { Metadata } from "next";
import { Manrope, Nunito_Sans } from "next/font/google";
import { MockProductStateProvider } from "@/components/mock-product-state";
import "./globals.css";

const body = Manrope({ variable:"--font-body", subsets:["latin"] });
const display = Nunito_Sans({ variable:"--font-display", subsets:["latin"] });
export const metadata: Metadata = { title:{ default:"Future Echo", template:"%s — Future Echo" }, description:"A quiet conversation with one possible future perspective." };
export default function RootLayout({ children }:{ children:React.ReactNode }) { return <html lang="en"><body className={`${body.variable} ${display.variable}`}><MockProductStateProvider>{children}</MockProductStateProvider></body></html>; }
