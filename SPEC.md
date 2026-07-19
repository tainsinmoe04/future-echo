# Future Echo — Product and Implementation Specification

Status: **Product decisions locked; mock lifecycle UI authorized**  
Decision record: locked by the project owner on **2026-07-16** in the product-specification request that produced this revision. Earlier decisions retained here come from the pre-existing project specification and learnings. This date records documentation provenance, not an implementation or release date.

Authorization granted on **2026-07-16** now includes mock UI for verbatim Save Moment selection and consent, versioned Current/Past Horizons, read-only past conversations, Horizon Day choices, and no-active-Future-Self states. Visual redesign, active AI, Supabase, auth, payments, and provider integration remain paused.

## 1. Product concept and differentiation

Future Echo is a quiet reflective product where someone speaks with one possible future perspective they are deliberately practicing. It does not predict the future, guarantee an outcome, provide therapy, or measure personal productivity.

The core loop is:

1. Define one possible future perspective.
2. Bring a present-day thought or tension into conversation.
3. Receive a warm, honest, calm response from that chosen perspective.
4. Explicitly choose **Save this moment** when something matters.
5. Preserve the user’s selected original words as structured memory.
6. Reopen those chosen moments later.

Future Echo must offer more than a reusable chatbot persona prompt. Its differentiator is the combination of a stable user-defined perspective, explicit memory consent, clear authorship, and a durable chronological record containing only moments the user chose.

It differs from a general chatbot because memory is deliberate and legible rather than opaque. It differs from a journal because it offers a consistent alternative perspective and structured resurfacing without making AI the author of the user’s history.

## 2. Locked product rules

- A user may have only one active future self at a time.
- The active identity must be archived before another is activated.
- Archived identities and their saved memories remain readable.
- A new identity does not automatically inherit memories from an archived identity.
- The minimum future horizon is six months.
- Horizon choices are 6 months, 1 year, 3 years, 5 years, or a custom month/year.
- Exact-day precision is not required.
- There is one default personality: warm, honest, calm, and lightly mentoring.
- The persona is never omniscient, sycophantic, or authoritative over the user.
- The persona must not imply that it knows what will happen.
- Full conversation history is not used as long-term AI memory.
- Only moments explicitly confirmed by the user become structured memory.
- User-facing language is **Save this moment**, not “create milestone.”
- No streaks, progress percentages, habit scoring, or manipulative engagement loops.

### Plans, limits, and access

| Plan | Price | AI replies | Saved Moments | Conversation history |
| --- | --- | --- | --- | --- |
| Free | Free | 50 per month | 10 | 30 days |
| Plus | $7.99 per month or $59 per year | 200 per month | Unlimited | 90 days |

- Checkout supports global card/Visa payments.
- Myanmar users without cards may contact support for manually granted 3-month or annual access.
- UAB Pay may be added later; it is not a committed launch payment method.
- Ordinary conversations remain available in conversation history for up to 30 days on Free and 90 days on Plus, then leave the active conversation store. Backup-erasure timing remains unresolved and must be disclosed separately.
- Conversation-history retention does not apply to Saved Moments. A Saved Moment remains until the user deletes it, subject to account-deletion requirements.

## 3. MVP routes and user flows

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Explain the product and demonstrate conversation → save → memory |
| `/login` | Static Google and email/password login UI in the mock phase |
| `/signup` | Static Google and email/password registration UI |
| `/onboarding` | Define, set horizon, review, and activate one possible perspective |
| `/now` | Main mock conversation and Save Moment entry point |
| `/memory` | Chronological saved moments grouped by populated months |
| `/future-self` | Edit and archive the active identity; preview archived identity state |

Account settings, privacy information, and sign-out belong in an account menu. Saved moments belong inside Memory, so there is no separate Profile or Milestones primary route.

### First-use flow

`Landing → Signup/Login → Onboarding → Now → Save Moment review → Memory`

### Onboarding flow

1. Define a way of living or identity being practiced.
2. Optionally select identity dimensions such as Creative life, Health, Relationships, and Way of working.
3. Select a horizon of at least six months.
4. Review the perspective, default voice, boundaries, and one-active-identity rule.
5. Explicitly activate it.

There is no personality-selection step in the MVP.

### Returning flow

`Now → voluntary conversation → neutral session-end review → optionally save → reopen in Memory`

The product must remain useful for occasional use. It must not imply that daily participation is required.

### Identity lifecycle

- Editing identity, horizon, or principles creates a new Future Self version.
- Old conversations and Saved Moments retain the Future Self version under which they were created.
- Past Future Selves remain readable but cannot be chatted with.
- A user may start a new journey from an old path without deleting that path.
- Memories never transfer automatically. The user must explicitly choose which Saved Moments to carry forward.
- Archiving requires confirmation and preserves the old path and its memories as readable records.

### Horizon Day

When the selected horizon arrives, show a special non-AI screen headed:

> The future is now.

Ask whether the user arrived, wants to keep going, wants to reach further, or wants something different. Never use pass/fail language. The user may keep, adjust, or replace their direction; adjustments and replacements follow the identity-versioning rules above.

## 4. Save Moment and Memory behavior

### Save Moment review

Saving is always manual and explicitly confirmed. A neutral session-end prompt may ask:

> Was there a moment here you want to carry forward?

The interface must also make it safe to leave without saving.

Each saved moment contains three separate layers:

#### Original excerpt

- Contains real conversation text selected by the user.
- May include an optional related AI reply, kept visibly distinct by authorship.
- Is visually primary.
- May be redacted before confirmation.
- Becomes immutable after confirmation, except that the entire saved moment may be deleted.

#### AI interpretation

- Is clearly labeled **AI interpretation**.
- Is visually secondary to the original excerpt.
- Uses mock content in the current phase.
- Is frozen after confirmation.
- May be removed, but not directly edited.
- Must avoid diagnosis, invented causality, or claims that it represents the whole event.

#### My Note

- Is clearly user-authored.
- Is optional.
- Remains editable.
- Uses client-side state in the current mock phase.

Each Saved Moment also stores the Future Self version under which it was created and the user’s consent choice for whether that moment may be used as model context. The confirmation view must identify the year and month receiving the saved moment.

### Memory structure

- Memory is chronological and grouped by year and populated month.
- Empty months collapse quietly and do not look unfinished.
- Sparse years must remain visually intentional.
- The product must not generate filler to make a year appear complete.
- Saved-moment detail must preserve visible authorship distinctions.
- Users may edit My Note, remove AI interpretation, or delete the saved moment.
- Deleting a saved moment removes the structured record.

The MVP does not present an “annual summary.” When enough moments exist, it may show a limited patterns section with explicit evidence scope, for example:

> Patterns across the 4 moments you chose to save.

It must also clarify that this is an interpretation of selected evidence, not a summary of the user’s entire year.

## 5. Provisional dark-only wabi-sabi design direction

The current working direction is dark-only and wabi-sabi-inspired. Do not add a light theme or theme toggle during this phase. This constrains the current mock; the final visual direction remains unresolved and requires explicit approval.

### Palette

- Primary canvas: deep midnight navy-charcoal.
- Secondary canvas: softened near-black.
- Raised surface: quiet blue-charcoal.
- Primary text: soft warm white, never pure white.
- Secondary text: muted blue-grey.
- Emotional accent: warm sunshine yellow.
- Supporting accent: muted peach.
- Borders: low-contrast navy-grey.

### Character

The experience should feel quiet, warm, peaceful, human, premium, subtly cute, and safe to revisit after an ordinary or difficult day. It should be minimal but never barren.

Wabi-sabi is expressed through:

- Slight asymmetry.
- Organic spacing and natural rhythm.
- Subtle tactile grain.
- Softly imperfect dividers.
- Restrained irregularity.
- Surfaces that feel lived with rather than polished corporate glass.

Wabi-sabi must not be represented through stereotypical Japanese imagery or decoration.

### Typography and components

- Sans-serif typography only.
- Warm, slightly rounded display typography.
- Neutral, highly readable body and interface typography.
- Calm reading widths.
- Soft 12–18px radii only where tactility helps.
- Fewer discrete cards; hierarchy should also come from spacing and dividers.
- Slow, subtle motion where useful.
- Respect `prefers-reduced-motion`.

Avoid:

- Aggressive Swiss poster typography or archival pressure.
- Serif diary styling.
- Therapy-journal aesthetics.
- Generic SaaS dashboards.
- Heavy glassmorphism.
- Decorative gradient blobs or fake 3D blobs.
- Fake technical coordinates and decorative metadata.
- Neon or cyberpunk color treatment.
- Productivity metrics.

### Mascot and artwork

Mascot design and the final visual direction remain unresolved and intentionally deferred. Do not invent, generate, or introduce a mascot or treat the current styling as final without explicit approval. Landing and authentication layouts may reserve flexible visual space, but the product must remain intentional without final artwork.

## 6. Privacy and emotional-safety rules

- Never conflate stored conversation with AI long-term memory.
- A future privacy implementation must explain storage, retention, model context, and personalization separately.
- Do not claim that conversations are unstored merely because they are excluded from long-term model context.
- Long-term structured memory contains only explicitly saved moments.
- Users must be able to redact an excerpt before saving.
- Users must be able to delete saved moments.
- Preserve clear provenance between user text and generated interpretation.
- Do not silently infer or store sensitive categories.
- Avoid “I know you,” “You need to,” guaranteed-future language, or claims of privileged self-knowledge.
- The persona may offer a possible reading, ask questions, or gently challenge assumptions, but must not decide for the user.
- Do not encourage emotional dependence or describe the persona as always available.
- Do not use persona-written engagement notifications.
- Do not reward escalating disclosure or session frequency.
- Real AI integration requires safety evaluation and detailed crisis protocols consistent with the locked behavior below before release.

### Model context boundary

The model may receive only:

- The current message.
- Up to 10 recent messages from the current conversation.
- The active Future Self definition, horizon, and principles.
- Up to 3 relevant Saved Moments for which memory-use consent permits use.
- My Note only when the user has explicitly opted in to sharing it as model context.

The model must never receive full conversation history, AI interpretations, archived memories, deleted data, or payment or support information.

The server-side context builder must enforce these rules by construction. Recent messages are capped after deleted messages are removed; Saved Moments must belong to the active Future Self version, be undeleted, and carry explicit memory-use consent. Relevant Saved Moments are supplied in relevance order and capped at three. Note consent is separate: a consented moment’s My Note is still omitted unless note use was explicitly enabled.

### Safety behavior

- The initial beta is limited to adults aged 18 and over.
- During a crisis, stop Future Self persona role-play and switch to calm, direct safety guidance and human-support options.
- Do not affirm delusions or encourage emotional dependency.
- Do not provide medical, legal, or financial directives.
- Do not use persona-written engagement notifications.

## 7. Technical architecture

- Next.js App Router.
- TypeScript with strict checking.
- React client components only where local interaction requires them.
- Tailwind CSS v4 with reusable CSS custom-property design tokens.
- Shared components for branding, navigation, authentication, icons, and Save Moment review.
- Mock fixtures in `src/lib/mock-data.ts`.
- Client-side state for all current interactions.
- Inactive server route at `/api/ai`; it intentionally returns `501`.
- Provider-neutral server contract in `src/lib/ai-provider.ts`.
- OpenAI-compatible provider planned; Gemini reserved for later.
- Supabase is planned but not connected.
- No API keys or server secrets in client code.
- No full conversation history supplied as long-term model memory.
- A server-side context builder produces the only provider-facing context shape and is tested independently while `/api/ai` remains inactive.

## 8. Acceptance criteria

### Product and routes

- All seven approved UI routes load and preserve App Router navigation.
- The landing page explains why the product differs from a general chatbot and a journal.
- The language consistently frames the identity as possible rather than predicted.
- Onboarding uses three stages and offers every approved horizon option.
- Only one default voice is presented.
- `/now` visually distinguishes the user’s present voice from the possible future perspective without generic chat bubbles.
- Saving is optional, manual, reviewable, and explicitly confirmed.
- `/memory` uses sparse realistic data and collapses empty months.
- `/future-self` explains edit, archive, memory retention, and non-inheritance behavior.
- Primary navigation contains Now, Memory, and Future Self only.

### Memory integrity

- Original excerpt, AI interpretation, and My Note are visibly distinct.
- Original excerpt can be redacted before confirmation.
- AI interpretation is secondary, frozen, removable, and not editable.
- My Note is optional and editable.
- Saved moments can be deleted.
- Patterns language states the number of chosen moments used as evidence.
- No annual summary claims to represent the full year.
- Saved Moments retain their Future Self version and memory-use consent.
- Saved Moments persist until user deletion and are not removed by conversation-history expiry.

### Plans, context, lifecycle, and safety

- Free and Plus limits, prices, history windows, and payment paths match Section 2.
- Model context observes every inclusion limit and exclusion in Section 6.
- Identity, horizon, or principle edits create a new version without rewriting prior records.
- Past Future Selves are readable but unavailable for chat; carrying memories forward is explicit.
- Horizon Day is non-AI, uses no pass/fail framing, and offers keep, adjust, and replace paths.
- Crisis behavior stops persona role-play, avoids delusion or dependency reinforcement, and directs users calmly toward human support.
- The initial beta enforces the 18+ requirement.

### Design and accessibility

- Every route uses the current provisional dark-only palette.
- No light-mode toggle is present.
- Text and interactive controls maintain accessible contrast.
- Keyboard focus is visible.
- Semantic headings, labels, buttons, navigation, dialogs, and form controls are used.
- Desktop, tablet, and mobile layouts avoid clipping and horizontal overflow.
- Reduced-motion preference is respected.
- No rejected mascot or decorative placeholder is treated as final artwork.

### Technical quality

- No Supabase or AI provider is connected during the mock phase.
- `/api/ai` remains inactive and server-side.
- No API key is present in client code.
- `npm run lint` passes.
- `npm run build` passes.
- README and LEARN remain aligned with this specification.

## 9. Deferred features and unresolved decisions

### Deferred

- Final mascot and hero artwork.
- Supabase Auth.
- PostgreSQL schema, migrations, and row-level security.
- Real AI provider integration.
- Safety evaluation, detailed crisis protocols, and jurisdiction-specific support resources beyond the locked behavior in Section 6.
- Notifications and user-scheduled check-ins.
- Export or printable Memory Book.
- Multiple future identities beyond the one-active lifecycle.
- Rich search, filtering, and thematic views.
- Sharing or social features.
- Automatic resurfacing.
- UAB Pay integration.

### Unresolved decisions

- Account-deletion behavior and deletion timing across backups.
- Whether users can delete individual unsaved messages.
- The final threshold for showing patterns across saved moments.
- The detailed UI for browsing Future Self versions and starting a new journey from an old path.
- Whether category labels belong in a later Memory model and who may author them.
- Mascot direction and the final visual direction, including whether the product ultimately uses a mascot.
- Authentication details beyond the static mock controls.

## 10. Beta test and release gates

- Run a closed beta with 4–5 users for 30 days.
- Move to Public Beta after one month only if security, deletion, usage-limit, and safety gates pass.
- Continue testing with 30–50 users through months 2–3.
- “One month” and “months 2–3” are relative to the closed beta start date; no calendar launch date is implied or yet locked.
