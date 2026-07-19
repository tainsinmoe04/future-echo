"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Bookmark } from "@/components/icons";
import { useMockProductState } from "@/components/mock-product-state";
import { SaveMomentModal } from "@/components/save-moment-modal";
import type { ConversationMessage } from "@/lib/domain";
import { conversations, identityById } from "@/lib/mock-data";

const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function Now() {
  const { activeIdentity } = useMockProductState();
  const [conversationId, setConversationId] = useState(conversations[0].id);
  const [text, setText] = useState("");
  const [addedMessages, setAddedMessages] = useState<ConversationMessage[]>([]);
  const [selection, setSelection] = useState<{ user: ConversationMessage; reply?: ConversationMessage } | null>(null);
  const conversation = conversations.find(({ id }) => id === conversationId) ?? conversations[0];
  const identity = identityById.get(conversation.identityVersionId);
  const isCurrent = conversation.status === "current" && Boolean(activeIdentity);
  const messages = conversation.status === "current" ? [...conversation.messages, ...addedMessages] : [...conversation.messages];

  const send = () => {
    if (!text.trim() || !isCurrent) return;
    setAddedMessages((items) => [...items, { id: `mock-added-${items.length + 1}`, role: "user", content: text.trim(), createdAt: "2026-07-16T10:00:00Z" }]);
    setText("");
  };

  const chooseMessage = (message: ConversationMessage, index: number) => {
    const next = messages[index + 1];
    setSelection({ user: message, ...(next?.role === "assistant" ? { reply: next } : {}) });
  };

  const conversationList = <>
    <p className="eyebrow">Conversations</p>
    <div className="mt-5 space-y-1">{conversations.map((item) => {
      const source = identityById.get(item.identityVersionId);
      const unavailable = item.status === "current" && !activeIdentity;
      return <button key={item.id} onClick={() => setConversationId(item.id)} className={`w-full border-l px-4 py-3 text-left ${conversation.id === item.id ? "border-sun bg-sun/8" : "border-transparent hover:border-line"}`}>
        <span className="block text-sm font-semibold">{item.title}</span>
        <span className="mt-2 block text-xs leading-5 text-muted">{item.status === "past" ? "Past · read only" : unavailable ? "No active Future Self" : "Current"}<br />Future Self v{source?.version} · {formatDate(item.startedAt)}</span>
      </button>;
    })}</div>
    <div className="soft-rule my-7" />
    <p className="text-xs leading-5 text-muted">Each conversation keeps the Future Self version it began with. Past conversations remain readable and cannot be continued.</p>
  </>;

  return <AppShell>
    <main className="shell py-8 sm:py-14">
      <details className="mb-9 border-y border-line py-4 lg:hidden">
        <summary className="cursor-pointer list-none text-sm font-semibold">Conversations</summary>
        <div className="pt-5">{conversationList}</div>
      </details>
      <div className="grid items-start gap-12 lg:grid-cols-[230px_minmax(0,760px)] lg:justify-center xl:gap-20">
        <aside className="sticky top-28 hidden lg:block">{conversationList}</aside>
        <section className="min-w-0">
          {conversation.status === "current" && !activeIdentity ? <div className="panel p-7 sm:p-10">
            <p className="eyebrow text-peach">No active Future Self</p>
            <h1 className="display mt-4 text-4xl sm:text-5xl">There is no current conversation to continue.</h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-muted">Your past conversations and Saved Moments are still readable. Start a new direction when you are ready; nothing transfers automatically.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link href="/onboarding" className="button-primary">Define a new direction</Link><button onClick={() => setConversationId("conversation-past")} className="button-secondary">Read a past conversation</button></div>
          </div> : <>
            <header className="max-w-2xl">
              <p className="eyebrow">{conversation.status === "past" ? "Past conversation · read only" : `Now · ${formatDate(conversation.startedAt)}`}</p>
              <h1 className="display mt-3 text-4xl sm:text-5xl">{conversation.title}</h1>
              <p className="mt-4 text-sm leading-6 text-muted">Future Self v{identity?.version} · “{identity?.definition}” · Horizon {identity?.horizon.label}</p>
            </header>
            {conversation.status === "past" ? <div className="mt-7 rounded-xl border border-peach/60 bg-canvas-soft p-4 text-sm leading-6 text-muted">This conversation belongs to a past Future Self. You can read it and save its verbatim text, but you cannot send another message here.</div> : null}
            <div className="mt-12 space-y-12">{messages.map((message, index) => <article key={message.id} className={`border-l pl-5 sm:pl-8 ${message.role === "user" ? "border-peach sm:pr-14" : "border-sun sm:ml-14"}`}>
              <p className={`eyebrow ${message.role === "user" ? "text-peach" : "text-sun"}`}>{message.role === "user" ? "You" : `Possible future · v${identity?.version}`}</p>
              <p className="mt-3 font-display text-xl leading-8">{message.content}</p>
              {message.role === "user" ? <button onClick={() => chooseMessage(message, index)} className="button-secondary mt-5"><Bookmark className="size-4" />Select this text to save</button> : null}
            </article>)}</div>
            {isCurrent ? <form className="sticky bottom-0 z-10 mt-14 border-t border-line bg-canvas/95 py-5 backdrop-blur-md" onSubmit={(event) => { event.preventDefault(); send(); }}>
              <label className="eyebrow" htmlFor="message">Write from where you are</label>
              <textarea id="message" className="field mt-3 min-h-24 resize-y sm:min-h-28" value={text} onChange={(event) => setText(event.target.value)} placeholder="What feels true today?" />
              <div className="mt-3 flex justify-end"><button className="button-primary" type="submit">Add to conversation</button></div>
            </form> : <div className="mt-12 border-t border-line pt-6"><p className="text-sm font-semibold">Conversation complete</p><p className="mt-2 text-sm text-muted">The composer is unavailable for past conversations.</p></div>}
            <div className="mt-14 border-y border-line py-7"><h2 className="font-display text-xl font-bold">Was there a moment here you want to carry forward?</h2><p className="mt-2 text-sm leading-6 text-muted">Choose a real message above. Nothing is saved unless you review and confirm it.</p></div>
          </>}
        </section>
      </div>
    </main>
    {selection && identity ? <SaveMomentModal key={selection.user.id} userMessage={selection.user} relatedAiReply={selection.reply} identityVersion={identity} onClose={() => setSelection(null)} /> : null}
  </AppShell>;
}
