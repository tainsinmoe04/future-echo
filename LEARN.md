# Future Echo — Project Learnings

This file preserves durable decisions and lessons so future sessions do not repeat rejected product, UX, design, or technical approaches. Requirements and acceptance criteria live in [SPEC.md](./SPEC.md).

Decision provenance: the pricing, access, context, Save Moment, identity lifecycle, Horizon Day, safety, and beta-testing decisions below were locked by the project owner on **2026-07-16**. The date is the documentation decision date, not a launch date. Older retained decisions and verification records are identified separately.

## 1. Product purpose

Future Echo is a quiet reflective product for speaking with one possible future perspective a user is deliberately practicing. It is not prediction, therapy, or productivity tracking.

The essential loop is:

`conversation → Save this moment → preserve selected original words → reopen later`

The product succeeds only if this loop provides clearer continuity and memory consent than a reusable general-chatbot persona prompt.

## 2. Decisions made and reasons

- **One active future self:** creates a coherent conversational perspective. Multiple active identities would fragment the MVP before the core value is proven.
- **Archive before activating another:** gives identities a clear lifecycle while preserving their history.
- **Minimum six-month horizon:** maintains meaningful psychological distance in this phase without requiring exact-day precision.
- **One default voice:** warm, honest, calm, and lightly mentoring. Personality configuration was removed because it adds choices before users understand the experience.
- **Explicit memory only:** full conversation history is not long-term AI memory. Users must knowingly choose what becomes structured memory.
- **Save this moment:** this language welcomes ordinary but meaningful change better than the grander word “milestone.”
- **Three authorship layers:** original excerpt, AI interpretation, and My Note remain separate because generated interpretation must never overwrite the user’s record.
- **Original words remain primary:** AI synthesis can distort personal memory, especially when evidence is sparse.
- **Frozen AI interpretation:** removal is allowed, but direct editing would blur whether text was generated or user-authored.
- **Sparse chronological Memory:** real users may save only a handful of moments. Empty months collapse so low volume does not look like failure.
- **Scoped patterns, not annual summaries:** selected moments cannot reliably represent an entire year.
- **Now, Memory, Future Self navigation:** Profile belongs in an account menu, while saved moments belong inside Memory rather than a duplicate Milestones destination.
- **Non-manipulative retention:** value should come from voluntarily revisiting chosen evidence, not pressure to return daily.
- **Plan limits:** Free includes 50 AI replies per month, 10 Saved Moments, and 30 days of conversation history. Plus costs $7.99/month or $59/year and includes 200 AI replies per month, unlimited Saved Moments, and 90 days of conversation history.
- **Saved Moment durability:** conversation expiry never expires Saved Moments; they remain until the user deletes them.
- **Payment path:** global card/Visa checkout is primary. Myanmar users without cards may contact support for manual 3-month or annual access. UAB Pay remains a possible later addition.
- **Bounded model context:** only the current message, up to 10 recent current-conversation messages, the active Future Self definition/horizon/principles, and up to 3 consented relevant Saved Moments may be sent. My Note requires explicit opt-in.
- **Strict context exclusions:** never send full history, AI interpretations, archived memories, deleted data, payment information, or support information to the model.
- **Retention is separate from context:** ordinary conversation history is available for up to 30 days on Free and 90 days on Plus, then leaves the active store. Saved Moments do not expire with conversations. Backup-erasure timing remains unresolved.
- **Context boundary by construction:** provider-facing types contain no interpretation, payment, support, archive, or deletion fields. The builder filters first, then caps recent messages at 10 and relevant consented moments at 3.
- **Versioned identity:** changing identity, horizon, or principles creates a new version. Existing conversations and moments retain their original Future Self version.
- **No automatic memory transfer:** starting a new journey from an old path preserves the old path and requires the user to carry individual moments forward explicitly.
- **Horizon Day:** use a non-AI “The future is now.” screen that offers arrived, keep going, reach further, and something different without pass/fail framing.
- **Mock lifecycle UI:** current and past records use dated identity-version fixtures. Past conversations remain readable but their composer is unavailable; archiving the active version exposes a calm empty state rather than silently activating another path.

## 3. Rejected product directions

- **Multiple active future selves in MVP:** weakens continuity and adds premature complexity.
- **Separate Milestones primary navigation:** overlaps Memory and confuses where saved records live.
- **Many selectable AI personalities:** turns onboarding into configuration instead of demonstrating value.
- **Automatic memory extraction:** violates the explicit-consent model even if users can delete later.
- **Editable AI interpretations:** damages authorship and provenance.
- **Streaks and progress percentages:** convert reflection into performance and imply an ideal pace.
- **Goals, habits, or productivity dashboards:** make Future Echo interchangeable with self-improvement software.
- **Social features:** introduce privacy and comparison risks without strengthening the private core loop.
- **Aggressive or persona-written notifications:** risk emotional dependence and manipulative engagement.
- **Full annual summaries from limited data:** manufacture coherence from a narrow, self-selected sample.
- **Proactive pressure to save:** frequent AI suggestions would tell users what should matter. A neutral session-end review is safer.

## 4. Rejected visual directions

### Warm creamy diary aesthetic

Rejected because it felt generic, resembled therapy and journaling templates, and lacked a distinctive Future Echo identity.

### Strict Swiss editorial system

Rejected because aggressive typography, numbering, and archival structure felt cold and pressuring. It moved the product toward an archive or productivity system rather than peaceful personal company.

### Bright white premium interface

Rejected after the product became dark-only. Landing, authentication, and signed-in surfaces should share one warm nighttime atmosphere.

### Generic SaaS dark mode

Rejected because glass panels, glowing gradients, telemetry-like metadata, and dashboard cards conflict with the product’s quiet human character.

## 5. Rejected mascot attempts

The following mascot directions were rejected and must not be used as production assets:

- White floating ghost/blob.
- Blue speech-bubble-like character.
- Red character too close to a reference.
- Bulky yellow star.
- Side-profile star that lost its silhouette.

Mascot design remains unresolved. Do not invent or add one without explicit approval. Layouts may reserve flexible artwork space but cannot depend on final mascot art.

## 6. Provisional visual direction

The following is the current mock constraint, not a final approved visual system. Both mascot direction and final visual direction remain unresolved.

- Dark-only midnight navy and softened charcoal.
- Warm-white primary text and muted blue-grey secondary text.
- Sunshine-yellow emotional accent and muted-peach support.
- Calm, warm, subtly cute sans-serif typography.
- Minimal but not empty.
- Wabi-sabi-inspired asymmetry, tactile grain, imperfect dividers, and natural spacing.
- Wabi-sabi must never become stereotypical Japanese decoration.
- No aggressive Swiss typography, therapy-journal styling, SaaS dashboard treatment, heavy glassmorphism, or decorative gradient blobs.

## 7. Privacy and emotional-safety lessons

- Stored conversation and AI long-term memory are different concepts. Future policy must explain storage, retention, model context, and personalization separately.
- “Not long-term memory” must never be used to imply “not stored.”
- The future persona must not claim authority, hidden self-knowledge, or certainty about outcomes.
- Avoid “I know you,” “You need to,” “I’m always here,” and guaranteed-future language.
- Warmth must not become sycophancy; the persona may offer a counter-reading and acknowledge uncertainty.
- Do not encourage emotional dependence or reward escalating disclosure.
- Do not send engagement notifications written in the persona’s voice.
- Users must be able to redact before saving and delete saved moments.
- Original user text must remain visibly distinct from generated interpretation.
- The initial beta is 18+.
- Crisis handling must stop persona role-play and switch to calm safety guidance and human support.
- Never affirm delusions or emotional dependency.
- Do not provide medical, legal, or financial directives.

### Save Moment provenance

- A user selects real conversation text and may optionally include the related AI reply.
- Redaction happens before confirmation; afterward the original excerpt is immutable unless the entire moment is deleted.
- My Note is optional and editable. AI interpretation is frozen and removable.
- Each moment stores the Future Self version and the user’s memory-use consent.
- My Note is excluded from model context unless the user explicitly opts in.

## 8. Important technical lessons

- Preserve Next.js App Router, TypeScript, React, and Tailwind CSS v4.
- Keep mock data and local interaction state in the client during this phase.
- AI integrations must remain behind a server boundary; never expose API keys in client code. The context builder is server-side and independently testable.
- `/api/ai` intentionally returns `501` until a provider and safety policy are approved.
- The provider contract is OpenAI-compatible while keeping Gemini reserved for later.
- Supabase is planned but not connected.
- WSL workspaces must be verified with the WSL-native Node runtime. Windows Node against a WSL UNC path caused native optional-package and path-resolution failures that were environmental, not application defects.
- Sparse fixtures are more honest than filling every month for visual effect.
- Documentation must be updated when product rules or rejected approaches change.

## 9. Current information architecture

Approved UI routes:

- `/`
- `/login`
- `/signup`
- `/onboarding`
- `/now`
- `/memory`
- `/future-self`

Account settings, privacy information, and sign-out live in an account menu. Saved moments are part of Memory.

## 10. Current unresolved questions

- Account-deletion behavior and deletion timing across backups.
- Whether individual unsaved messages can be deleted.
- Detailed UI for browsing Future Self versions and starting a new journey from an old path.
- The evidence threshold for showing patterns across saved moments.
- Whether categories belong in a later Memory model.
- Mascot direction and final visual direction, including whether a mascot is used at all.
- Detailed crisis protocols, support-resource localization, and safety evaluation required before connecting a real model.
- Authentication details beyond the static mock.

## 11. Deferred work

Final mascot/hero art and visual system; Supabase Auth; PostgreSQL schema and RLS; real AI provider; retention/deletion persistence; detailed safety evaluation; notifications; export/print; multiple identity support; rich search and thematic views; UAB Pay.

## 12. Beta testing and release gates

- Closed beta: 4–5 users for 30 days.
- Public Beta: only after one month and only if security, deletion, usage-limit, and safety gates pass.
- Months 2–3: continue testing with 30–50 users.
- These periods are relative to the closed beta start. No calendar launch date is locked.

## 13. Verification history

The following is inherited command-result provenance from the pre-existing LEARN.md, not verification performed during the 2026-07-16 documentation update:

- `npm run lint`: passed on 2026-07-14.
- `npm run build`: passed on 2026-07-14 with Next.js 16.2.10.
- All approved UI routes prerendered successfully; `/api/ai` remained dynamic and inactive.
- Existing dependency audit reported two moderate findings. No forced breaking upgrade was applied.
