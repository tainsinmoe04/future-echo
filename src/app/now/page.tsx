"use client";

import Link from "next/link";
import { Fragment, Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMockProductState } from "@/components/mock-product-state";
import { EchoDialog } from "@/components/echo/dialog";
import { PersonalSpace } from "@/components/echo/personal-space";
import { SaveReview } from "@/components/echo/save-review";
import { BackIcon, ClipIcon, OrbitIcon, PlusIcon, SendIcon } from "@/components/echo/icons";
import { MessageActions } from "@/components/echo/message-actions";
import { MAX_MESSAGE_LENGTH } from "@/lib/redaction";
import { horizonDistance } from "@/lib/personal-space";
import { localDate } from "@/lib/local-date";
import type { MessengerThread } from "@/lib/mock-messenger";
import { PlaylistCard } from "@/components/echo/playlist-card";

const emptyThread: MessengerThread = { messages: [], draft: "", typing: false };

function Conversation() {
  const { activeIdentity, identityVersions, threads, setThreadDraft, sendMessage, ensureGreeting, connectedAI, connectedProvider, liveAIAvailable, trialAI, trialProvider, connectionError, loadPastConversation, connectAI } = useMockProductState();
  const query = useSearchParams();
  const pastIdentity = identityVersions.find((identity) => identity.id === query.get("past") && identity.status === "past");
  const identity = pastIdentity ?? activeIdentity;
  const readOnly = Boolean(pastIdentity);
  const thread = identity ? threads[identity.id] ?? emptyThread : emptyThread;
  const [space, setSpace] = useState<{ momentId?: string; create?: boolean } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [settled, setSettled] = useState<Record<string, string | true>>({});
  const [about, setAbout] = useState(false);
  const [connectAdult,setConnectAdult]=useState(false),[connectBusy,setConnectBusy]=useState(false),[connectNotice,setConnectNotice]=useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const following = useRef(true);
  const reviewTrigger = useRef<HTMLElement | null>(null);
  const year = identity?.horizon.targetMonth.slice(0, 4);

  useEffect(() => {
    if (identity && !readOnly) ensureGreeting(identity.id);
  }, [identity, readOnly, ensureGreeting]);
  useEffect(() => { if (pastIdentity && connectedAI) void loadPastConversation(pastIdentity.id); }, [pastIdentity, connectedAI, loadPastConversation]);

  useEffect(() => {
    const element = scroller.current;
    if (element && !saving && following.current) element.scrollTop = element.scrollHeight;
  }, [thread.messages.length, thread.typing, saving]);

  const submit = () => {
    if (!identity || readOnly || !thread.draft.trim() || thread.typing) return;
    following.current = true;
    setSaving(null);
    sendMessage(identity.id, thread.draft);
    requestAnimationFrame(() => composer.current?.focus());
  };
  const connect=async()=>{if(!connectAdult||connectBusy)return;setConnectBusy(true);setConnectNotice("");try{await connectAI();setAbout(false);}catch(error){setConnectNotice(error instanceof Error?error.message:"Live connection could not be made.");}finally{setConnectBusy(false);}};

  if (!identity) return <div className="echo-ui echo-stage"><main className="echo-empty-chat"><OrbitIcon /><h1>A new direction can begin here.</h1><p>Your earlier conversations and moments are still yours.</p><Link className="echo-button lilac" href="/onboarding">Create your Future Self</Link><Link className="echo-text-button" href="/memory">Open Your Space</Link></main></div>;

  return <div className="echo-ui echo-stage">
    <main className="echo-chat" aria-label="Future Echo conversation">
      <div className="echo-header-light" aria-hidden="true" />
      <header className="echo-chat-header">
        {readOnly && <Link href="/now" className="echo-icon-button" aria-label="Return to current conversation"><BackIcon /></Link>}
        <div className="echo-chat-heading">{!readOnly && identity.horizon.targetMonth <= localDate().slice(0, 7) && <Link href="/future-self" className="echo-context-link">Your horizon is here · take a moment</Link>}<h1>{year} <span>·</span> Your Future Self</h1><p>{horizonDistance(identity.horizon.targetMonth, localDate())}{readOnly ? " · Read only" : ""}</p><button className="echo-context-link" onClick={() => setAbout(true)}>An imagined possible future</button></div>
        <button className="echo-orbit-button" onClick={() => setSpace({})} aria-label="Open Your Space"><OrbitIcon /><span>Your Space</span></button>
      </header>
      <div className="echo-chat-scroll" ref={scroller} onScroll={(event) => { const el = event.currentTarget; following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
        <div className="echo-presence">
          <span className="echo-presence-rest">{readOnly ? "From an earlier direction" : "A little farther along"}</span>
        </div>
        <div role="log" aria-label="Conversation messages" aria-live="polite" aria-relevant="additions text" className="echo-messages">
          {thread.messages.map((message, index) => {
            const previousUser=message.role==="assistant"?thread.messages.slice(0,index).findLast(item=>item.role==="user"):undefined;
            const options=Boolean(previousUser&&!readOnly&&!settled[message.id]);
            return <Fragment key={message.id}>
              <article className={`echo-message ${message.role==="user"?"from-present":"from-future"}${options?" has-options":""}`}>
                <span className="sr-only">{message.role==="user"?"You":message.safety==="support"?"Support outside the future-self perspective":"Your possible future self"}: </span>
                {message.id.startsWith("welcome-")&&<small>Welcome · written by Future Echo</small>}{message.safety==="support"&&<small>Stepping out of the future-self perspective</small>}
                <p>{message.content}</p>{message.playlist&&<PlaylistCard playlist={message.playlist} messageId={message.id}/>}
                {options&&<MessageActions disabled={saving===message.id} onSave={trigger=>{reviewTrigger.current=trigger;setSaving(message.id);}} onLeave={()=>{setSettled(current=>({...current,[message.id]:true}));composer.current?.focus();}}/>}
              </article>
              {previousUser&&saving===message.id&&<SaveReview key={message.id} user={previousUser} reply={message} identityId={identity.id} onCancel={()=>{setSaving(null);requestAnimationFrame(()=>reviewTrigger.current?.focus());}} onSave={id=>{setSettled(current=>({...current,[message.id]:id}));setSaving(null);requestAnimationFrame(()=>composer.current?.focus());}}/>}
              {typeof settled[message.id]==="string"&&<div className="echo-saved-line" role="status">Kept in your memory book. <button onClick={()=>setSpace({momentId:String(settled[message.id])})}>Open moment</button></div>}
            </Fragment>;
          })}
        </div>
        {thread.typing && !readOnly && <div className="echo-presence echo-typing is-typing" role="status"><span><i aria-hidden="true"><b /><b /><b /></i>{year} · Your Future Self is typing…</span></div>}
        {readOnly && !thread.messages.length && <p className="echo-muted">No conversation was kept for this version.</p>}
      </div>
      {readOnly ? <footer className="echo-readonly"><p>This conversation belongs to an earlier direction.</p><Link href="/now" className="echo-button white">Return to your current chat</Link></footer> : <footer className="echo-composer-area">
        {connectionError && <p className="echo-muted" role="alert">{connectionError} Your words remain here; check before sending again.</p>}
        {connectionError&&connectedAI&&thread.draft&&<button className="echo-text-button" disabled={thread.typing} onClick={submit}>Try sending again</button>}
        <div className="echo-composer-above"><span>{trialAI ? `${trialProvider} · private cloud trial` : connectedAI ? `Connected · ${connectedProvider} · imagined perspective` : liveAIAvailable ? <button className="echo-text-button" onClick={() => setAbout(true)}>Connect live AI</button> : "Local preview · replies are examples"}</span><button className="echo-add-button" aria-label="Add a personal moment" onClick={() => setSpace({ create: true })}><PlusIcon /></button></div>
        <form className="echo-composer" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <button type="button" className="echo-icon-button" aria-label="Add a moment with photos" onClick={() => setSpace({ create: true })}><ClipIcon /></button>
          <label htmlFor="echo-message" className="sr-only">Message your future self</label>
          <textarea id="echo-message" ref={composer} rows={1} placeholder="Message your future self…" value={thread.draft} maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => { setThreadDraft(identity.id, event.target.value); event.target.style.height = "auto"; event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`; }}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && (event.ctrlKey || event.metaKey)) { event.preventDefault(); submit(); } }} />
          <button className="echo-send" type="submit" disabled={!thread.draft.trim() || thread.typing} aria-label="Send message"><SendIcon /></button>
        </form>
      </footer>}
    </main>
    <EchoDialog open={Boolean(space)} label="Your Space" onClose={() => setSpace(null)} className="echo-space-drawer"><PersonalSpace onClose={() => setSpace(null)} initialMomentId={space?.momentId} initialCreate={space?.create} /></EchoDialog>
    <EchoDialog open={about} label="About this possible future" onClose={()=>setAbout(false)} className="echo-about-dialog"><section className="echo-about">
      <OrbitIcon/><h2>A perspective you chose.</h2><p>{identity.definition}</p><p>This is an imagined possible future, not a prediction or a person contacting you across time. You can change direction. Nothing here can know what will happen.</p>
      <p className="echo-muted">{trialAI?`Replies send your direction, current message, up to ten recent messages and up to three permitted excerpts to ${trialProvider}. Notes require separate permission. This is not E2EE or professional care.`:liveAIAvailable?`${connectedProvider} processes your direction, messages and up to three separately permitted excerpts. Notes require their own permission; photos and drafts stay here. Account conversations are separate from your local journal. Zero retention and non-training are not established. This is not E2EE or professional care.`:"This preview uses sample replies. No AI provider is connected."}</p>
      {liveAIAvailable&&!trialAI&&!connectedAI&&<><label className="echo-check-label"><input type="checkbox" checked={connectAdult} onChange={event=>setConnectAdult(event.target.checked)}/>I am 18 or older and want to connect this direction to live AI.</label><p className="echo-muted">After this one-time choice, this browser tab can reconnect the same account and direction until you disconnect or close it.</p><button className="echo-button lilac" disabled={!connectAdult||connectBusy} onClick={()=>void connect()}>{connectBusy?"Connecting…":"Connect and continue"}</button>{connectNotice&&<p role="alert">{connectNotice}</p>}</>}
      <button className="echo-button outline" onClick={()=>setAbout(false)}>Back to our conversation</button>
    </section></EchoDialog>
  </div>;
}

export default function Now() { return <Suspense fallback={<div className="echo-ui echo-stage" />}><Conversation /></Suspense>; }
