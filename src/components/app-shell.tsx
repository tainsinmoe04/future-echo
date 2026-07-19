"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./brand";
import { Close, Menu } from "./icons";

const links=[{href:"/now",label:"Now"},{href:"/memory",label:"Memory"},{href:"/future-self",label:"Future Self"}];
export function AppShell({ children }:{ children:React.ReactNode }) {
  const path=usePathname(); const [open,setOpen]=useState(false); const [account,setAccount]=useState(false);
  return <div className="min-h-screen">
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-md">
      <div className="shell grid h-16 grid-cols-[1fr_auto] items-center md:h-20 md:grid-cols-[1fr_auto_1fr]"><Brand href="/now"/>
        <nav className="hidden h-full items-stretch gap-8 md:flex" aria-label="Primary navigation">{links.map(l=><Link key={l.href} href={l.href} className={`focus-ring relative flex items-center px-1 text-sm ${path.startsWith(l.href)?"text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-sun":"text-muted hover:text-ink"}`}>{l.label}</Link>)}</nav>
        <div className="relative hidden justify-self-end md:block"><button className="focus-ring grid size-9 place-items-center rounded-full bg-peach text-sm font-bold text-canvas" onClick={()=>setAccount(v=>!v)} aria-expanded={account} aria-label="Open account menu">AM</button>{account&&<div className="panel absolute right-0 mt-3 w-64 p-3"><p className="px-3 py-2 text-sm font-semibold">Alex Morgan</p><p className="px-3 pb-3 text-xs text-muted">alex@example.com</p><div className="soft-rule"/><button className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas-soft">Privacy & data</button><button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas-soft">Sign out</button></div>}</div>
        <button className="focus-ring md:hidden" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-label="Toggle navigation">{open?<Close/>:<Menu/>}</button>
      </div>
      {open?<nav className="shell grid gap-1 border-t border-line py-4 md:hidden" aria-label="Mobile navigation">{links.map(l=><Link onClick={()=>setOpen(false)} key={l.href} href={l.href} className={`border-l px-4 py-3 text-sm ${path.startsWith(l.href)?"border-sun text-ink":"border-transparent text-muted"}`}>{l.label}</Link>)}<div className="soft-rule my-2"/><button className="px-4 py-2 text-left text-sm text-muted">Privacy & data</button><button className="px-4 py-2 text-left text-sm text-muted">Sign out</button></nav>:null}
    </header>{children}</div>;
}
