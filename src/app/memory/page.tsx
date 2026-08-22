"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useMockProductState } from "@/components/mock-product-state";
import { Trash } from "@/components/icons";
import { identityById } from "@/lib/mock-data";
import { MAX_NOTE_LENGTH } from "@/lib/redaction";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });

export default function Memory() {
  const { journeyMoment, saveJourneyMoment, deleteJourneyMoment } = useMockProductState();
  const [reflection, setReflection] = useState("");
  const [keptReflection, setKeptReflection] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(journeyMoment?.myNote ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!journeyMoment) {
    return (
      <AppShell>
        <main className="journey-shell py-14 sm:py-24">
          <p className="eyebrow text-peach">Memory</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">This moment is no longer here.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
            Deleting removed the structured record. Nothing is kept as long-term memory unless you
            choose to save it again.
          </p>
          <Link href="/now" className="button-primary mt-8">
            Return to Now
          </Link>
        </main>
      </AppShell>
    );
  }

  const identity = identityById.get(journeyMoment.identityVersionId);

  const updateNote = () => {
    const note = noteDraft.trim();
    saveJourneyMoment({ ...journeyMoment, myNote: note || undefined });
    setEditingNote(false);
  };

  const removeInterpretation = () => {
    saveJourneyMoment({ ...journeyMoment, aiInterpretation: undefined });
  };

  return (
    <AppShell>
      <main className="journey-shell py-10 sm:py-16">
        <header className="max-w-2xl">
          <p className="eyebrow">Six months later · {formatDate(journeyMoment.revisitAt)}</p>
          <h1 className="display mt-4 text-4xl leading-tight sm:text-5xl">
            You chose to keep this moment.
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-muted">
            Revisit it without asking whether the past was right or wrong. The record remains as you
            chose to preserve it.
          </p>
        </header>

        <div className="journey-rule mt-10 sm:mt-14" />

        <article className="py-10 sm:py-14" aria-labelledby="then-heading">
          <header>
            <p className="eyebrow text-peach">
              Then · {formatDate(journeyMoment.occurredAt)} · {formatTime(journeyMoment.occurredAt)}
            </p>
            <h2 id="then-heading" className="sr-only">
              The saved moment
            </h2>
            <p className="mt-3 text-xs leading-5 text-muted">
              Future Self v{identity?.version} · Horizon {identity?.horizon.label}
            </p>
          </header>

          <section className="mt-10" aria-labelledby="original-message">
            <p id="original-message" className="eyebrow text-peach">
              Your words
            </p>
            <blockquote className="journey-user-words mt-5">
              “{journeyMoment.originalExcerpt}”
            </blockquote>
          </section>

          <section className="journey-reply mt-12 border-l border-sun pl-5 sm:ml-12 sm:pl-7" aria-labelledby="saved-reply">
            <p id="saved-reply" className="eyebrow text-sun">
              Possible-future perspective
            </p>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {journeyMoment.relatedAiReply}
            </p>
          </section>

          <section className="mt-12 border-t border-line pt-8" aria-labelledby="my-note">
            <div className="flex items-baseline justify-between gap-4">
              <p id="my-note" className="eyebrow">
                My Note
              </p>
              {!editingNote ? (
                <button className="quiet-link text-xs" onClick={() => setEditingNote(true)}>
                  Edit note
                </button>
              ) : null}
            </div>
            {editingNote ? (
              <div className="mt-4">
                <textarea
                  className="field min-h-24 resize-y"
                  value={noteDraft}
                  maxLength={MAX_NOTE_LENGTH}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  aria-label="My Note"
                />
                <div className="mt-3 flex justify-end gap-3">
                  <button
                    className="button-secondary"
                    onClick={() => {
                      setNoteDraft(journeyMoment.myNote ?? "");
                      setEditingNote(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button className="button-primary" onClick={updateNote}>
                    Update note
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 font-display text-xl leading-8">
                {journeyMoment.myNote || "No note was added."}
              </p>
            )}
          </section>

          <details className="mt-10 border-t border-line pt-6">
            <summary className="focus-ring cursor-pointer rounded-sm text-sm font-semibold">
              Record details and controls
            </summary>
            <div className="mt-6 space-y-7">
              {journeyMoment.aiInterpretation ? (
                <section className="border-l border-line pl-5">
                  <p className="eyebrow">AI interpretation · frozen</p>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                    {journeyMoment.aiInterpretation}
                  </p>
                  <button className="quiet-link mt-4 text-xs" onClick={removeInterpretation}>
                    Remove AI interpretation
                  </button>
                </section>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  AI interpretation removed. Your words and note remain unchanged.
                </p>
              )}

              <section className="border-t border-line pt-6">
                <p className="text-sm font-semibold">
                  Future AI context: {journeyMoment.consent.useInAiContext ? "Allowed" : "Off"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  My Note context is{" "}
                  {journeyMoment.consent.includeMyNoteInAiContext ? "allowed" : "off"}. Saved
                  conversation text and long-term AI memory are separate.
                </p>
              </section>

              <section className="border-t border-line pt-6">
                {!confirmDelete ? (
                  <button
                    className="inline-flex items-center gap-2 text-xs text-danger hover:underline"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash className="size-4" />
                    Delete saved moment
                  </button>
                ) : (
                  <div>
                    <p className="text-sm font-semibold">Delete this saved moment?</p>
                    <p className="mt-2 text-xs leading-5 text-muted">
                      This removes the structured record. It cannot be recovered in this mock.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button className="button-secondary" onClick={() => setConfirmDelete(false)}>
                        Keep it
                      </button>
                      <button
                        className="inline-flex min-h-11 items-center rounded-xl border border-danger px-4 text-xs font-bold text-danger"
                        onClick={deleteJourneyMoment}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </details>
        </article>

        <section className="border-t border-line py-10 sm:py-14" aria-labelledby="now-heading">
          <p className="eyebrow text-sun">Now · {formatDate(journeyMoment.revisitAt)}</p>
          <h2 id="now-heading" className="display mt-4 text-3xl sm:text-4xl">
            What feels clearer now than it did then?
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
            You do not need to prove that you changed, arrived, or made the right choice.
          </p>

          {keptReflection ? (
            <div className="journey-resolution mt-8 border-l border-peach pl-5" role="status">
              <p className="eyebrow text-peach">Your reflection</p>
              <p className="mt-3 font-display text-xl leading-8">{keptReflection}</p>
              <button
                className="quiet-link mt-5 text-xs"
                onClick={() => {
                  setReflection(keptReflection);
                  setKeptReflection("");
                }}
              >
                Edit reflection
              </button>
            </div>
          ) : (
            <div className="mt-8">
              <label htmlFor="reflection" className="sr-only">
                Reflection
              </label>
              <textarea
                id="reflection"
                className="journey-textarea min-h-32"
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                placeholder="A sentence is enough. You can also leave this blank."
              />
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link href="/now" className="button-secondary">
                  Leave it here
                </Link>
                <button
                  className="button-primary"
                  disabled={!reflection.trim()}
                  onClick={() => setKeptReflection(reflection.trim())}
                >
                  Keep this reflection
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
