"use client";

import { useState } from "react";
import type { ConversationMessage, FutureSelfIdentityVersion } from "@/lib/domain";
import { Close } from "./icons";

interface SaveMomentModalProps {
  userMessage: ConversationMessage;
  relatedAiReply?: ConversationMessage;
  identityVersion: FutureSelfIdentityVersion;
  onClose: () => void;
}

function isVerbatimRedaction(original: string, candidate: string) {
  if (!candidate.trim()) return false;
  const originalTokens = original.trim().split(/\s+/);
  let cursor = 0;
  return candidate.trim().split(/\s+/).every((token) => {
    const index = originalTokens.indexOf(token, cursor);
    if (index < 0) return false;
    cursor = index + 1;
    return true;
  });
}

export function SaveMomentModal({ userMessage, relatedAiReply, identityVersion, onClose }: SaveMomentModalProps) {
  const [excerpt, setExcerpt] = useState(userMessage.content);
  const [includeReply, setIncludeReply] = useState(Boolean(relatedAiReply));
  const [memoryConsent, setMemoryConsent] = useState(false);
  const [noteConsent, setNoteConsent] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const excerptIsValid = isVerbatimRedaction(userMessage.content, excerpt);

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#080d14]/80 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="save-title"><div className="panel flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-b-none sm:max-h-[92vh] sm:rounded-[16px_13px_17px_14px]"><div className="flex items-start justify-between border-b border-line px-5 py-5 sm:px-8"><div><p className="eyebrow text-sun">Carry forward · Future Self v{identityVersion.version}</p><h2 id="save-title" className="display mt-2 text-3xl">{saved?"Moment saved.":"Save this moment"}</h2></div><button onClick={onClose} aria-label="Close" className="focus-ring rounded-lg p-2"><Close/></button></div>{saved?<div className="overflow-y-auto px-6 py-16 text-center"><p className="text-lg">Added to Memory · July 2026</p><p className="mt-3 text-sm text-muted">Original excerpt saved under Future Self v{identityVersion.version}. Memory context is {memoryConsent?"allowed":"off"}.</p><p className="mt-2 text-xs text-muted">Related AI reply {includeReply?"included":"not included"}.</p><button onClick={onClose} className="button-primary mt-7">Done</button></div>:<><div className="overflow-y-auto px-5 py-6 sm:px-8 sm:py-8"><p className="max-w-2xl text-sm leading-6 text-muted">This starts with the exact conversation text you selected. You may redact words before confirming, but cannot add text that was not in the message.</p><div className="mt-7 grid gap-8 md:grid-cols-[1.1fr_.9fr]"><div><label className="block text-sm"><span className="mb-2 block font-semibold text-ink">Selected verbatim excerpt · redact only</span><textarea className="field min-h-36 resize-y text-base leading-7" value={excerpt} onChange={event=>setExcerpt(event.target.value)} aria-invalid={!excerptIsValid}/></label>{!excerptIsValid?<p className="mt-2 text-xs text-danger">Use only words from the selected message, in their original order.</p>:null}{relatedAiReply?<label className="mt-5 flex items-start gap-3 border-l border-sun pl-4 text-sm"><input type="checkbox" className="mt-1 size-4 accent-sun" checked={includeReply} onChange={event=>setIncludeReply(event.target.checked)}/><span><strong className="block">Include the related AI reply</strong><span className="mt-2 block leading-6 text-muted">“{relatedAiReply.content}”</span></span></label>:null}</div><div><label className="block text-sm"><span className="mb-2 block">Optional title</span><input className="field" value={title} onChange={event=>setTitle(event.target.value)} placeholder="A name you will recognize later"/></label><details className="mt-5 border-t border-line pt-4"><summary className="cursor-pointer list-none text-sm font-semibold">AI interpretation · frozen after confirmation</summary><p className="mt-3 text-sm leading-6 text-muted">You noticed a choice without using it as a verdict about who you are becoming.</p></details><label className="mt-5 block border-t border-line pt-4 text-sm"><span className="mb-2 block">My Note · optional</span><textarea className="field min-h-24 resize-y" value={note} onChange={event=>setNote(event.target.value)} placeholder="What do you want to remember about this?"/></label><fieldset className="mt-5 border-t border-line pt-4"><legend className="text-sm font-semibold">AI memory context</legend><label className="mt-3 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-sun" checked={memoryConsent} onChange={event=>{setMemoryConsent(event.target.checked);if(!event.target.checked)setNoteConsent(false)}}/><span><strong className="block">Allow this Saved Moment in future AI context</strong><span className="mt-1 block leading-5 text-muted">Optional. You can save the moment without allowing memory use.</span></span></label>{memoryConsent&&note?<label className="mt-4 flex items-start gap-3 border-t border-line pt-4 text-sm"><input type="checkbox" className="mt-1 size-4 accent-sun" checked={noteConsent} onChange={event=>setNoteConsent(event.target.checked)}/><span>Also allow My Note in AI context</span></label>:null}</fieldset></div></div></div><div className="flex flex-col-reverse gap-3 border-t border-line bg-surface px-5 py-4 sm:flex-row sm:justify-end sm:px-8"><button onClick={onClose} className="button-secondary">Not now</button><button disabled={!excerptIsValid} onClick={()=>setSaved(true)} className="button-primary disabled:cursor-not-allowed disabled:opacity-50">Confirm and save</button></div></>}</div></div>;
}
