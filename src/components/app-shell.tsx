"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { Close, Menu } from "./icons";
import { AccountPill } from "./echo/account-pill";

const links=[{href:"/now",label:"Now"},{href:"/memory",label:"Memory"},{href:"/future-self",label:"Future Self"}];
export function AppShell({ children }:{ children:React.ReactNode }) {
  const path=usePathname(); const [open,setOpen]=useState(false);
  return <div className="min-h-screen">
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-md">
      <div className="shell grid h-16 grid-cols-[1fr_auto] items-center md:h-20 md:grid-cols-[1fr_auto_1fr]"><Brand href="/now"/>
        <nav className="hidden h-full items-stretch gap-8 md:flex" aria-label="Primary navigation">{links.map(l=><Link key={l.href} href={l.href} className={`focus-ring relative flex items-center px-1 text-sm ${path.startsWith(l.href)?"text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-sun":"text-muted hover:text-ink"}`}>{l.label}</Link>)}</nav>
        <div className="hidden justify-self-end md:block"><AccountPill /></div>
        <button className="focus-ring md:hidden" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Toggle navigation">{open?<Close/>:<Menu/>}</button>
      </div>
      {open?<nav className="shell grid gap-1 border-t border-line py-4 md:hidden" aria-label="Mobile navigation">{links.map(l=><Link onClick={()=>setOpen(false)} key={l.href} href={l.href} className={`border-l px-4 py-3 text-sm ${path.startsWith(l.href)?"border-sun text-ink":"border-transparent text-muted"}`}>{l.label}</Link>)}<div className="soft-rule my-2"/><div className="px-4 py-2"><AccountPill /></div></nav>:null}
    </header>{children}</div>;
}
