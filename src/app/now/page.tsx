"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { Arrow } from "@/components/icons";
import { useMockProductState } from "@/components/mock-product-state";
import {
  isVerbatimRedaction,
  MAX_EXCERPT_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_NOTE_LENGTH,
} from "@/lib/redaction";
import { addMonths, createJourneyMoment } from "@/lib/moment-lifecycle";

interface ThreadMessage {
  id: string;
  role: "user" | "future";
  content: string;
}

interface Exchange {
  user: ThreadMessage;
  reply: ThreadMessage;
}

const INITIAL_USER_MESSAGE: ThreadMessage = {
  id: "example-user",
  role: "user",
  content: "I don't know if I chose the right path. Everyone seems further ahead than me.",
};

const INITIAL_FUTURE_MESSAGE: ThreadMessage = {
  id: "example-future",
  role: "future",
  content:
    "I remember this part of the road feeling longer than it looked from the beginning.\n\nI also wondered whether choosing differently would have made everything easier. What kept me moving was not certainty. It was remembering that this direction still felt like mine when I stopped comparing my pace to everyone else's.\n\nI'm farther along now. The view is beautiful\u2014but I'm most grateful that you did not abandon yourself just because the middle was difficult.",
};

const LATER_REPLY =
  "The middle can make difficulty feel like proof. I cannot know from here whether this road still fits you. Try to notice the difference between wanting relief from a hard stretch and knowing the direction no longer feels like yours. You are allowed to answer honestly.";

const AI_INTERPRETATION =
  "One possible reading is that comparison and exhaustion were making the chosen direction harder to recognize, without deciding whether it still fits.";

const REVISIT_MONTHS = 6;

export default function Now() {
  const { activeIdentity, saveJourneyMoment } = useMockProductState();
  const [messages, setMessages] = useState<ThreadMessage[]>([
    INITIAL_USER_MESSAGE,
    INITIAL_FUTURE_MESSAGE,
  ]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [latestExchange, setLatestExchange] = useState<Exchange | null>({
    user: INITIAL_USER_MESSAGE,
    reply: INITIAL_FUTURE_MESSAGE,
  });
  const [settledReplyIds, setSettledReplyIds] = useState<Set<string>>(new Set());
  const [savingReplyId, setSavingReplyId] = useState<string | null>(null);
  const [savedReplyId, setSavedReplyId] = useState<string | null>(null);
  const [excerpt, setExcerpt] = useState(INITIAL_USER_MESSAGE.content);
  const [note, setNote] = useState("");
  const [memoryConsent, setMemoryConsent] = useState(false);
  const [noteConsent, setNoteConsent] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const destinationYear = activeIdentity?.horizon.targetMonth.slice(0, 4) ?? "2036";
  const yearsAhead = Math.max(Number(destinationYear) - now.getUTCFullYear(), 1);
  const currentMonthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const excerptIsValid = latestExchange
    ? isVerbatimRedaction(latestExchange.user.content, excerpt)
    : false;

  const conversationLabel = useMemo(
    () => `${destinationYear} / Your Future Self`,
    [destinationYear],
  );

  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
    },
    [],
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    bottomRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, typing, savingReplyId, savedReplyId]);

  const send = () => {
    const content = draft.trim();
    if (!content || typing || !activeIdentity) return;

    const userMessage: ThreadMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setLatestExchange(null);
    setSavingReplyId(null);
    setTyping(true);

    replyTimer.current = setTimeout(() => {
      const reply: ThreadMessage = {
        id: `future-${Date.now()}`,
        role: "future",
        content: LATER_REPLY,
      };
      setMessages((current) => [...current, reply]);
      setLatestExchange({ user: userMessage, reply });
      setExcerpt(userMessage.content);
      setNote("");
      setMemoryConsent(false);
      setNoteConsent(false);
      setTyping(false);
    }, 1100);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const beginSaving = (exchange: Exchange) => {
    setLatestExchange(exchange);
    setExcerpt(exchange.user.content);
    setSavingReplyId(exchange.reply.id);
    setSavedReplyId(null);
  };

  const leaveExchange = (replyId: string) => {
    setSettledReplyIds((current) => new Set(current).add(replyId));
    setSavingReplyId(null);
  };

  const confirmSave = () => {
    if (!activeIdentity || !latestExchange || !excerptIsValid) return;

    const moment = createJourneyMoment({
      id: `journey-${Date.now()}`,
      identityVersionId: activeIdentity.id,
      occurredAt: now.toISOString(),
      revisitAt: addMonths(now.toISOString(), REVISIT_MONTHS),
      excerpt,
      relatedAiReply: latestExchange.reply.content,
      note,
      aiInterpretation: AI_INTERPRETATION,
      useInAiContext: memoryConsent,
      includeMyNoteInAiContext: noteConsent,
      consentRecordedAt: now.toISOString(),
    });
    if (!moment) return;

    saveJourneyMoment(moment);

    setSavedReplyId(latestExchange.reply.id);
    setSavingReplyId(null);
    setSettledReplyIds((current) => new Set(current).add(latestExchange.reply.id));
  };

  if (!activeIdentity) {
    return (
      <AppShell>
        <main className="journey-shell py-14 sm:py-24">
          <p className="eyebrow text-peach">No active Future Self</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">
            Choose a direction before opening this conversation.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
            Past conversations and Saved Moments remain readable. Nothing transfers automatically.
          </p>
          <Link href="/onboarding" className="button-primary mt-8">
            Define a direction
          </Link>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="messenger-page">
        <section className="messenger-frame" aria-label="Conversation with your possible future self">
          <header className="messenger-header">
            <div className="min-w-0">
              <p className="messenger-identity">{conversationLabel}</p>
              <h1 className="messenger-destination">{activeIdentity.definition}</h1>
              <p className="mt-1 text-xs text-muted">
                {yearsAhead} years ahead / imagined perspective, not a prediction
              </p>
            </div>
            <div className="time-signal" aria-hidden="true">
              <span>Now</span>
              <span className="time-signal-line" />
              <span>{destinationYear}</span>
            </div>
          </header>

          <div
            className="messenger-thread"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Messages"
          >
            <div className="conversation-day">
              <span>Tonight / 11:40 PM</span>
            </div>

            {messages.map((message, index) => {
              const pairedUser =
                message.role === "future"
                  ? [...messages.slice(0, index)].reverse().find((item) => item.role === "user")
                  : undefined;
              const exchange =
                message.role === "future" && pairedUser
                  ? { user: pairedUser, reply: message }
                  : undefined;
              const actionsVisible =
                exchange &&
                latestExchange?.reply.id === message.id &&
                !settledReplyIds.has(message.id) &&
                !typing;

              return (
                <div
                  key={message.id}
                  className={message.role === "user" ? "message-row message-row-user" : "message-row"}
                >
                  <article
                    className={
                      message.role === "user"
                        ? "message-surface message-present"
                        : "message-surface message-future"
                    }
                  >
                    <p className="message-author">
                      {message.role === "user" ? "You / now" : conversationLabel}
                    </p>
                    <p className="message-copy whitespace-pre-line">{message.content}</p>
                  </article>

                  {actionsVisible && exchange ? (
                    <div className="message-actions" aria-label="Actions for this exchange">
                      <button onClick={() => beginSaving(exchange)}>Save this moment</button>
                      <button onClick={() => leaveExchange(message.id)}>Leave it here</button>
                    </div>
                  ) : null}

                  {savingReplyId === message.id && latestExchange ? (
                    <section className="message-save" aria-labelledby="save-message-title">
                      <p className="eyebrow text-sun">Save this moment / {currentMonthLabel}</p>
                      <h2 id="save-message-title" className="mt-2 font-display text-xl font-bold">
                        Keep the exchange together.
                      </h2>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Your selected words stay primary. You may redact them before saving.
                      </p>

                      <label className="mt-5 block text-sm">
                        <span className="mb-2 block font-semibold">Your words / redact only</span>
                        <textarea
                          className="field min-h-24 resize-y"
                          value={excerpt}
                          maxLength={MAX_EXCERPT_LENGTH}
                          onChange={(event) => setExcerpt(event.target.value)}
                          aria-invalid={!excerptIsValid}
                        />
                      </label>
                      {!excerptIsValid ? (
                        <p className="mt-2 text-xs leading-5 text-danger">
                          Keep words in their original order.
                        </p>
                      ) : null}

                      <label className="mt-5 block border-t border-line pt-5 text-sm">
                        <span className="mb-2 block font-semibold">My Note / optional</span>
                        <textarea
                          className="field min-h-20 resize-y"
                          value={note}
                          maxLength={MAX_NOTE_LENGTH}
                          onChange={(event) => {
                            setNote(event.target.value);
                            if (!event.target.value.trim()) setNoteConsent(false);
                          }}
                          placeholder="What do you want to remember?"
                        />
                      </label>

                      <details className="mt-5 border-t border-line pt-5">
                        <summary className="cursor-pointer text-sm font-semibold">
                          Memory context and interpretation
                        </summary>
                        <p className="mt-3 text-xs leading-5 text-muted">
                          AI interpretation is frozen after saving and remains secondary to your
                          words. Saving does not automatically allow future model use.
                        </p>
                        <label className="mt-4 flex items-start gap-3 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1 size-4 accent-sun"
                            checked={memoryConsent}
                            onChange={(event) => {
                              setMemoryConsent(event.target.checked);
                              if (!event.target.checked) setNoteConsent(false);
                            }}
                          />
                          Allow this Saved Moment in future AI context
                        </label>
                        {memoryConsent && note.trim() ? (
                          <label className="mt-3 flex items-start gap-3 pl-7 text-sm text-muted">
                            <input
                              type="checkbox"
                              className="mt-1 size-4 accent-sun"
                              checked={noteConsent}
                              onChange={(event) => setNoteConsent(event.target.checked)}
                            />
                            Also allow My Note
                          </label>
                        ) : null}
                      </details>

                      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          className="button-secondary"
                          onClick={() => setSavingReplyId(null)}
                        >
                          Back
                        </button>
                        <button
                          className="button-primary"
                          disabled={!excerptIsValid}
                          onClick={confirmSave}
                        >
                          Confirm and save
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {savedReplyId === message.id ? (
                    <div className="message-saved" role="status">
                      <span>Saved with your words.</span>
                      <Link href="/memory">Open Memory</Link>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {typing ? (
              <div className="message-row" role="status">
                <div className="typing-presence">
                  <p>{conversationLabel} is typing...</p>
                  <span className="typing-pulse" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <form
            className="messenger-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label className="sr-only" htmlFor="message">
              Message your possible future self
            </label>
            <textarea
              id="message"
              rows={2}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Message your possible future self..."
              disabled={typing}
            />
            <button type="submit" disabled={!draft.trim() || typing} aria-label="Send message">
              <span>Send</span>
              <Arrow className="size-4" />
            </button>
            <p className="composer-hint">Ctrl or Cmd + Enter to send</p>
          </form>
        </section>
      </main>
    </AppShell>
  );
}
