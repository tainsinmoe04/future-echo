"use client";
import { useRef, useState } from "react";
import { useMockProductState } from "@/components/mock-product-state";
import { addMonths, createJourneyMoment } from "@/lib/moment-lifecycle";
import { isVerbatimRedaction, MAX_EXCERPT_LENGTH, MAX_NOTE_LENGTH } from "@/lib/redaction";
import type { ConversationMessage } from "@/lib/domain";

export function SaveReview({ user, reply, identityId, onCancel, onSave }: {
  user: ConversationMessage; reply: ConversationMessage; identityId: string;
  onCancel: () => void; onSave: (id: string) => void;
}) {
  const { saveJourneyMoment } = useMockProductState();
  const [excerpt, setExcerpt] = useState(user.content);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [allowContext, setAllowContext] = useState(false);
  const [allowNote, setAllowNote] = useState(false);
  const submitted = useRef(false);
  const valid = isVerbatimRedaction(user.content, excerpt);
  const month = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return <form className="echo-save-review" aria-label="Save moment review" onSubmit={(event) => {
    event.preventDefault();
    if (!valid || submitted.current) return;
    const stamp = new Date().toISOString();
    const moment = createJourneyMoment({ id: crypto.randomUUID(), identityVersionId: identityId,
      occurredAt: stamp, revisitAt: addMonths(stamp, 6), excerpt, relatedAiReply: reply.content,
      note, useInAiContext: allowContext, includeMyNoteInAiContext: allowNote, consentRecordedAt: stamp });
    if (!moment) return;
    submitted.current = true;
    saveJourneyMoment({ ...moment, kind: "conversation", title: title.trim() || "A conversation worth keeping", stickers: [] });
    onSave(moment.id);
  }}>
    <h2>Keep the exchange together.</h2>
    <p className="echo-muted">In your {month} memory book.</p>
    <label>A name for this moment <span>(optional)</span>
      <input maxLength={80} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A few words to find it again" />
    </label>
    <label>Your words · redact only
      <textarea autoFocus value={excerpt} maxLength={MAX_EXCERPT_LENGTH} onChange={(event) => setExcerpt(event.target.value)} aria-invalid={!valid} aria-describedby={!valid ? "redaction-error" : undefined} rows={3} />
    </label>
    {!valid && <p className="echo-error" id="redaction-error">Remove words if you need to; keep the remaining words in their original order.</p>}
    <div className="echo-save-reply"><span>From our conversation</span><p>{reply.content}</p></div>
    <label>My Note <span>(optional)</span>
      <textarea value={note} maxLength={MAX_NOTE_LENGTH} onChange={(event) => { setNote(event.target.value); if (!event.target.value.trim()) setAllowNote(false); }} rows={2} placeholder="What do you want to remember?" />
    </label>
    <fieldset className="echo-consent"><legend>Future AI context</legend>
      <p>Saving keeps this record. Model use is a separate choice; no AI is connected in this preview.</p>
      <label><input type="checkbox" checked={allowContext} onChange={(event) => { setAllowContext(event.target.checked); if (!event.target.checked) setAllowNote(false); }} />Allow my saved words in future AI context</label>
      {allowContext && note.trim() && <label><input type="checkbox" checked={allowNote} onChange={(event) => setAllowNote(event.target.checked)} />Also allow My Note</label>}
    </fieldset>
    <div className="echo-form-actions"><button type="button" className="echo-button outline" onClick={onCancel}>Leave it here</button><button type="submit" className="echo-button butter" disabled={!valid}>Confirm and save</button></div>
  </form>;
}
