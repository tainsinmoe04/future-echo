# Future Echo — Project Learnings

## 30. Discoverable rotation and transparent welcome — 2026-10-19

- Owner rejected the added fixed 15-degree rotation buttons. Removed only those two toolbar actions; photos retain the same continuous round-handle mouse/touch rotation as stickers. Focused Chrome checks at desktop/mobile sizes rotated a photo approximately 23 degrees via actual mouse / emulated touch, verified no 15-degree snapping, Undo/Redo, keyboard fallback and saved transform. Lint passes. Physical hardware remains untested; no other design changes.

- Rotation already existed behind Arrange, but the owner could not discover it. Add Arrange photo beside framing and concise rotation actions; keep existing round handle, two-finger twist and keyboard support. Collapse collection/help content so arranging does not begin with a long tool card. Apple/Emil guidance informed direct manipulation and progressive disclosure, not extra decorative motion or a new UI direction.
- The requested first-contact feeling must not become a literal time-travel claim. The private trial now uses a short horizon/language-aware built-in welcome, identified as written by Future Echo, without spending a model request. It is separate from actual AI responses, not a fallback. Production connected accounts are not silently given a fabricated server record. Session refresh may show it again because chats remain session-only.
- 102 tests, lint/build and isolated desktop/mobile rendered checks pass. The full e2e suite and physical-device gestures were not rerun. BarCamp audience access still requires hosting and multi-user/privacy/reliability gates; localhost alone is not a remotely usable demo.

## 29. OpenRouter private trial continuation — 2026-10-19

- The owner rejected Ollama, supplied OpenRouter credentials privately, and authorized continuing from the backed-up WIP. Frontend wiring now uses `/api/trial-ai`; production remains disabled. Do not keep the old local-only privacy claims: selected context is sent to OpenRouter and its provider. No Supabase account or journal upload occurs in this trial.
- The approved free model is fixed; zero-price, no-fallback and data-collection-deny guards stay intact. The official endpoint inventory lists Google AI Studio; that does not prove this account can generate or establish zero retention. One fictional live app request returned 429/router_limit. No automatic retry, privacy relaxation or paid fallback was attempted. Real reply tone and bilingual safety remain unverified.
- Conversational messages preserve actual roles rather than serializing the whole conversation as one user message. The shared prompt asks for specific, short, familiar Burmese while retaining crisis, honesty and uncertainty boundaries. Prompt instructions alone are not evidence of model compliance.
- Typing now follows the final message, left-aligned. Isolated Chrome desktop/mobile checks verify geometry, keyboard submit, reduced motion, inline saving with consent off, truthful settings, session-only refresh and duplicate-free error retry. Success-path UI replies were intercepted and are not live-model evidence. Existing user browser data was not edited.

## 28. Private local Gemma trial — 2026-10-18

- Owner confirmed `gemma3:12b` (8.2 GB) in PowerShell and explicitly requested temporary local inference, leaving public launch for later. This supersedes the provider pause only for the private dev trial. Do not infer public release, E2EE implementation, cloud fallback or key changes.
- Windows Ollama was reachable but WSL loopback was not. Use the opt-in fixed Windows localhost bridge with JSON on stdin, never user text in command source; do not expose the Ollama port to the network. The dev route validates narrow browser-owned local data and reuses the server context builder. It is not reusable as a production authenticated context endpoint.
- Local mode bypasses account sync/auth/history/playlist APIs. Settings disclose the model, session-only chats and unencrypted local storage; explicitly saved playlists use local journal persistence, not cloud or memory. No fake greeting or example fallback is inserted in this mode. Same-text failed retries preserve the existing user message rather than duplicating it; lifecycle changes discard late responses.
- Actual fabricated English request returned HTTP 200 through app → WSL bridge → Windows Ollama → schema-validated reply in about 22 seconds. Tests and live-model behavior are separate evidence; neither is a completed bilingual safety assessment.
- Default Turbopack production build passed. Dev browser compilation encountered the known worker spawn `No such file or directory` panic for CSS on `/onboarding`; the local trial uses `dev:local` with Webpack without deleting caches or changing unrelated parent lockfiles.

## 27. Confirmed hosted migration and Gemini diagnostics — 2026-10-17

- The owner signed in to the Supabase dashboard and gave explicit action-time approval for the six-table migration and its RLS/server-only permissions. Public schema inventory was empty. The migration ran successfully in SQL Editor with transaction boundaries intact; all six tables were reachable via server API-key-only GET with limit=0 afterward. Read-only catalog checks matched all ten expected security settings. No account/journal rows were created or removed; authenticated two-account, Auth email/session and concurrency checks remain outstanding.
- SQL Editor can auto-indent/auto-close multiline text entered as typing. Select/copy back and compare normalized text before Run; use a clipboard paste if typing alters it. The applied migration matched the reviewed 12,556-character LF source. Do not rerun a create-table migration just to verify status; use the separate read-only schema-security query. Manual dashboard execution does not register a claimed CLI history.
- Gemini's actual WSL metadata check remains region-blocked before content generation. Current official supported-region documentation omits Myanmar; do not claim a known IP location, invalid key, billing-only root cause or successful model access. The code cannot grant provider eligibility or safely solve it by silent provider/network/account changes.
- Gemini errors are mapped server-side to fixed messages for region, credentials, billing, missing model, access and quota. Do not forward raw response messages/details or advise retrying an unchanged region failure. Unknown FAILED_PRECONDITION remains generic. Added regression tests verify classification, raw-secret exclusion and no automatic retry/fake reply.

## 26. Private credential preflight and modern Supabase keys — 2026-10-17

- Owner supplied local credentials and requested continuing setup. Read values only in the local process; output presence, HTTP status and bounded error codes, never secret values, request headers or complete provider errors. No journal content or generation request was sent in this preflight.
- Modern sb_secret_ keys belong in apikey, not Authorization: Bearer. Use case-insensitive Headers to remove any inherited Authorization value for modern keys and keep bearer authentication only for legacy service JWTs. Credentials cannot be overridden by ancillary request headers. Auth user-session JWT verification stays unchanged.
- Supabase Auth settings returned 200. A table-presence check with limit=0 returned PGRST205, not a valid application schema. PowerShell's browser-like default User-Agent initially caused a modern server-key 401; a clearly server-side test User-Agent reached the schema error. Do not log key contents or respond by weakening RLS.
- Gemini metadata returned 400 FAILED_PRECONDITION for unsupported user location. This does not establish an invalid key, an unavailable model, or a billing-only problem. Do not retry generation, choose a different provider/model, enable billing, change network routing or deploy without the necessary user decision. Keep AI disabled while resolving provider eligibility and the missing schema.

## 25. Pre-connection resilience and accessibility — 2026-10-16

- Owner approved completing the available pre-API work first. Preserve the existing messenger/scrapbook design, immutable conversation evidence and separate memory consent; do not infer provider connection, deployment or new retention-policy decisions.
- Added repeatable isolated-browser coverage for malformed/larger valid imports, cancel/confirm/recovery/delete boundaries, synthetic storage quota failure, unsaved export and retry, stale-tab conflicts, unsupported-document preservation and keyboard settings/search. Synthetic QuotaExceededError is not real device eviction or full-disk certification. Existing beforeunload protection is explicitly exercised; no new durability guarantee is made.
- Settings entry focuses its Back control, and returning restores the initiating Settings button. React guidance informed commit-time DOM focus via refs/effects, without redesign or imperative focus during render.
- Added 16 paired English/Myanmar fictional safety cases plus corpus/static-instruction regression checks. These run offline and are not evidence that any model is safe. Real bilingual multi-turn evaluation, localized crisis resources and human review remain release gates.
- PRE_CONNECTION_CHECKLIST.md records physical-device/assistive-technology steps and a proposed account export/deletion flow. Remote backup/provider deletion timing, account deletion semantics and local-device deletion behavior remain owner decisions. Do not implement a fake account deletion button or claim local backups erase account data.
- Use a verified free local port for QA. Windows localhost:3001 was owned by another Node process and served a 404 while the WSL app on that port returned 200; leave unrelated processes alone. This increment uses localhost:3187. Browser tests still use fabricated isolated storage, never the owner's open journal.

## 24. Non-API journey and journal completion — 2026-10-15

- The owner authorized fixing the entire non-API audit and implementing search/calendar navigation, crop/focal framing, layer ordering, longer writing and automated checks. Public/auth alignment now has explicit authority, using existing black/lilac/butter components. This is not a new visual/artwork direction.
- New empty local documents contain no identities or memories. The demo stays in a self-contained landing/auth component and never writes journal data. Preserve existing records rather than deleting fixtures heuristically; old recognizable examples receive a disclosure.
- Memory permission changes use a separate action. Ordinary note/layout edits still cannot rewrite original evidence or silently upgrade consent; revoking words also revokes note sharing. The visible controls disclose that previously transmitted text cannot be recalled.
- Myanmar redaction segments complete graphemes, while non-Myanmar word runs remain whole. Exact original units and order are preserved. Do not normalize evidence text. Local calendar dates are stored separately from instants and retained immutably for saved conversations; legacy records keep their old grouping.
- Personal words allow 20,000 characters; notes 2,000. Context stays capped at 2,000/500 characters per selected excerpt/note. Long pages never silently expand model context. Crop/layer metadata is strictly validated, round-tripped locally and excluded from context projection.
- Setup drafts resume without restoring age/replacement approvals and are omitted from ordinary exports. Horizon reflections are separate version-owned metadata, not moments or stars. Extending/replacing requires a reviewed version/setup action. Past-word restart explicitly begins a new journey without moving memories.
- Crop preserves original rasters. Drag/focal point, pinch/buttons and keyboard alternatives update presentation only. Layer order is explicit; temporary selected-object elevation does not change saved order. Plain reading remains available.
- Text typing coalesces history groups while object edits remain distinct. Search/books are memoized independently of editor draft updates. Existing autosave CAS, recovery copies, media bounds and failure behavior remain in force.
- Browser plugin catalog searches did not return an exact installable Browser entry. Existing in-app browser control is available and was used to inspect the real app without modifying user records. Do not claim a separate plugin was installed. Repeatable Playwright tests run isolated Chrome contexts; the repository now contains their configuration and a read-only-permission GitHub Actions workflow. No current push/deployment is authorized by this implementation request.

## 23. Owner-selected Supabase + Gemini backend — 2026-10-15

- Explicit owner authorization supersedes the earlier no-provider implementation pause only for Supabase accounts/backend and Gemini replies/saveable song recommendations. No real credentials, project connection, remote migration, deployment or push occurred. Default `/api/ai` remains 501; setup requires server environment variables and an explicit user Connect action.
- Never trust browser-supplied owner/history/memory at generation time. Verify Auth user over the network; load owned active identity, ten recent eligible messages and up to three consented excerpts server-side. Context upload is a narrow text-only projection and not a full journal sync. Separate note consent stays intact. Photos, drafts, interpretations, decorative data and playlists are excluded from memory context.
- Use HttpOnly cookies and same-origin mutation checks. Privileged database functions have empty search_path and service-only execution; RLS denies direct client writes and cross-owner reads. A server service key bypasses RLS, so every server query must also filter the verified owner. Never expose keys in browser bundles, logs or chat.
- Reply reservation/finalization locks enforce server-owned quotas, rate limits and request replay. Pending leases expire; completed request records retain only a message ID, not duplicate reply text after history expiry. Direction changes invalidate late UI replies and attempt remote archiving. Cloud synchronization failures are disclosed, not labeled successfully deleted.
- Music suggestions contain titles/artists, not lyrics or fabricated catalog IDs. User-clicked fixed-domain search links only; no automatic playback or external account integration. Saving is explicit and separate from memory consent/stars. Saved playlists are account records with device-local backup copies; local journal originals remain local.
- Current Gemini Generate Content REST schema was checked against official docs, which now label that API legacy. The model is explicitly configured, not hard-coded; live access, compatibility, cost and data handling still need review. No OpenAI provider/key is used.
- Verification is layered: unit/service tests, isolated PGlite migration/RLS/limits tests, lint/build and Chrome desktop/mobile UI with intercepted backend responses. These are not live Supabase/Gemini verification, multi-connection race tests or a completed bilingual safety evaluation. Keep the enable flag false for public use until BACKEND_SETUP gates pass. Full journal cloud backup, account deletion, password recovery, OAuth and provider/backups retention remain incomplete.

Latest implementation checkpoint (2026-10-15): Section 20 supersedes older session-only, draft, restore and decoration-library limitations. Historical entries below retain their original verification provenance.

This file preserves durable decisions and lessons so future sessions do not repeat rejected product, UX, design, or technical approaches. Requirements and acceptance criteria live in [SPEC.md](./SPEC.md).

**Current scoped override (2026-10-14):** the owner subsequently approved the black/lilac messenger and tactile memory-book direction, then requested settings, movable stickers, and selectable fonts. See SPEC Section 11 and Section 14 below. Earlier visual rejections remain history, not a prohibition against this explicitly approved scrapbook scope. Product safeguards and production-service pauses remain unchanged.

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

### Shared helper modules (2026-08-22)

- `src/lib/redaction.ts` owns `isVerbatimRedaction` and all input length limits (`MAX_MESSAGE_LENGTH`, `MAX_EXCERPT_LENGTH`, `MAX_NOTE_LENGTH`, `MAX_IDENTITY_LENGTH`). Redaction is verbatim-only: whole whitespace-delimited tokens from the original message, in original order. Never duplicate this helper in components.
- `src/lib/moment-lifecycle.ts` holds pure moment lifecycle logic: `buildSavedMomentConsent` enforces that My Note context consent requires both moment-level consent and a non-empty note; `createJourneyMoment` validates lengths, trims text, and normalizes empty optional fields to `undefined`; horizon helpers (`horizonFromMonths`, `horizonMonthsAhead`, `formatHorizonLabel`) enforce the six-month minimum and derive labels from `MOCK_TODAY`. Keep these pure so `node --test` can exercise them without React.
- `JourneyMoment extends SavedMoment`, adding only `revisitAt`. The journey flow stores the user's words in `originalExcerpt` and the paired possible-future reply in `relatedAiReply`, so journey moments remain compatible with the consent-gated AI context pipeline. Do not reintroduce parallel shapes like `originalMessage`/`possibleFutureReply`.
- `SavedMoment.title` is optional; SPEC's three-layer model (original excerpt, AI interpretation, My Note) never required one.
- Mock identity state keeps a version list in the provider: onboarding activation and Future-Self definition edits supersede the active version and create v(n+1); archived versions keep their records readable. Save timestamps derive from the save time with `revisitAt` six months later via tested `addMonths` date math — avoid hard-coded narrative timestamps in `/now`.
- The test script compiles with `tsconfig.test.json` and runs every compiled file via `node --test ".test-dist/tests/*.test.js"`; new lib files must be added to its include list to be testable.
- Editor encoding round-trips corrupted typographic characters into literal `?` and added a UTF-8 BOM to `now/page.tsx`. Verify non-ASCII text and file encodings after external edits.

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
- `npm run lint`, `npm test` (30 tests), and `npm run build` passed on 2026-08-22 after the encoding/BOM repairs, helper extraction, domain type alignment, state wiring, and new unit tests. All routes prerendered; `/api/ai` remained dynamic and inactive.

## 14. Scoped personalization implementation — 2026-10-14

- The owner requested settings, arbitrary sticker placement, and beautiful fonts, building on the explicitly approved messenger/scrapbook UI. No production-service connection was authorized.
- `MomentPaper` is shared by the saved page and decoration preview so placement geometry and authorship stay aligned. Coordinates are page percentages, size is relative to page width, and rotated bounds are clamped. Pointer capture preserves the grab offset; a second touch is ignored; cancellation restores the original position. Keyboard arrows and select-then-tap are alternatives to dragging. Decoration movement has no momentum or settling animation because precise placement is the intent.
- Decorations are intentionally allowed over content, but reading mode can hide them without mutating saved placement. Keep this escape hatch so decoration cannot make the original words inaccessible.
- `JourneyMoment` now also holds photos, legacy sticker names, positioned sticker instances, note font, and a separate revisit reflection. Its inherited SavedMoment fields remain the evidence model. These additions supersede the older note that it adds only `revisitAt`.
- Four Latin note styles are offered for notes and captions, not original messages or generated replies. Next's font pipeline serves them locally; Noto Sans Myanmar, Padauk, and Noto Serif Myanmar provide corresponding Burmese styles. Caveat handwriting applies only to Latin text. The app has no runtime third-party font request.
- Space preferences live in the mock provider and reset on refresh along with the rest of the prototype. The default font affects new pages; saved pages keep their own choice. No implicit memory consent, permanent-storage claim, or fake account/payment settings.
- Decoration edits preserve original excerpt, related reply, identity, occurrence date, revisit date, deletion state, and consent. Notes remain editable, interpretations frozen/removable, and server context projection unchanged.
- Automated coverage adds page-relative movement, rotated bounds, invalid-value handling, legacy migration, evidence integrity, context exclusion, and note-consent regression checks.
- Verification: `npm test` (38 tests), `npm run lint`, and the default Turbopack production `npm run build` pass. Build still reports an existing multiple-lockfile root warning; unrelated parent lockfiles were not changed. Rendered Chrome/Playwright checks at 1440×1000, 390×844, and 320×740 cover settings, new-moment creation, default-font non-retroactivity, font previews, mouse/touch-emulated drag, tap placement, keyboard movement, Escape cancellation, Undo, saved-page reopening, hiding/restoring stickers, chat navigation, and reduced motion. Screenshot evidence is kept outside the repository. Physical-device and Safari testing remain outstanding.

## 15. Journal storage foundation — 2026-10-14

- The expanded journal roadmap is now authorized in SPEC Section 12. JOURNAL_PROGRESS.md records staged completion and remaining work; it was absent at the start of this continuation and was created from the repository's actual state.
- `journal-storage.ts` provides a versioned IndexedDB document with an atomic revision check. An old tab must fail with a conflict rather than overwrite newer work. Resolve writes only on transaction completion, not request success. Abort preserves the previous record.
- Require a caller-provided snapshot validator for reads and writes. Unsupported existing envelopes or payloads are not treated as an empty database. Never recover by automatically seeding mock fixtures or clearing storage.
- The adapter is deliberately not wired to the app yet: hydration, full schema validation, autosave status/recovery, and export/import must be implemented together before claiming persistence. Existing reset-on-refresh disclosures remain correct.
- Verification: 43 tests, lint, production build, and isolated-browser IndexedDB checks passed. The latter verifies reload, stale-tab conflict, aborted-write rollback, and invalid-data preservation. No UI redesign or production connection was made.

### Saved-record snapshot validation continuation

- `journal-snapshot.ts` validates a bounded exact-field schema without repairing consent or mutating original evidence. Validate identity ownership and version uniqueness across the whole snapshot, not only individual records. Drafts and chat state are excluded from this v1 saved-record shape, not silently promoted to memory.
- Raster data URL validation checks encoding, declared type/signature and size; it does not prove image decodability. Browser decoding/dimension limits and a pre-parse backup file limit remain mandatory before import is exposed. Do not describe this validator as finished backup/restore.
- Verification: 49 tests, lint and build pass. No app integration or UI changes; reset-on-refresh disclosures remain true.

## 16. Direct journal manipulation — 2026-10-14

- The owner explicitly requested direct touch/mouse resize and rotation rather than bars. Prioritized this bounded editor change as requested; local autosave/restore remain incomplete and disclosures remain unchanged.
- `PageObject` handles translation, pinch/twist and resize/rotation handles across photos, text and stickers. No gesture easing or momentum; direct pointer tracking follows Apple Design/Emil guidance for precise editing. This deliberately supersedes the earlier ignore-second-touch behavior for the new object layer. Ending either finger commits the gesture; pointer cancellation/Escape restores the previous layout.
- Presentation-only page-relative `pageTransforms` leave evidence text unchanged and outside AI context. Layout Undo/Redo stores one entry per completed gesture; content edits are not part of this history. A reset restores the default composition. Reading can temporarily remove layout and decorations without mutating stored state.
- Validation: 54 tests, lint, production build passed. Chrome/Playwright at 1440×1000 and 390×844 with reduced motion verified mouse drag/resize/rotation, emulated two-finger pinch/twist, text/sticker keyboard manipulation, Undo/Redo, Escape cancellation, Done/reopening and original-text preservation. No runtime errors or document overflow in tested states. Browser plugin skill absent; used existing bundled Playwright/Chrome with no dependency installation. Physical touch devices and Safari remain untested. Known parent-lockfile warning remains.

## 17. Backup codec foundation — 2026-10-14

- Validate file byte size before reading text, and UTF-8 byte size before parsing. `journal-backup.ts` accepts an exact versioned envelope, validates the snapshot without altering consent, and does not write storage. Do not trust filename extensions or MIME labels as validation.
- The codec is unencrypted and does not authenticate provenance. User confirmation, atomic pre-restore recovery, raster decoding/dimension checks and UI integration are still required. No persistence completion claim is warranted.
- 58 tests, lint and production build pass. No runtime UI changes in this increment; prior rendered checks remain the latest UI evidence.

## 18. Atomic pre-restore recovery — 2026-10-15

- The storage adapter now supports validated recovery reads and revision-checked restore. Write the old record under `before-last-restore` and the replacement journal in the same transaction; never perform two independent transactions or report success at request completion.
- Normal saves preserve that recovery copy. A later confirmed restore replaces it. Unknown recovery records block restore rather than being silently discarded. Restore requires an existing saved journal, preventing imports from bypassing hydration/initialization.
- The adapter is still not connected to the UI. Before integration, expose confirmation and truthful recovery-retention/deletion behavior; do not mistake the one retained recovery copy for encrypted or cloud backup.
- 59 tests, lint, build and isolated real-browser IndexedDB restore/rollback/recovery checks pass. Local dev server restarted on port 3000; existing parent-lockfile warning remains. No UI changes or production integrations.

## 19. User-facing local persistence — 2026-10-15

- `journal-session.ts` is the provider's external store: hydrate once, block interaction on failed reads, seed only after a confirmed empty read, and serialize/coalesce writes. Publish saved status only after IndexedDB completion. Preserve unsaved state on conflict; retry uses the old expected revision rather than silently overwriting another tab.
- React Best Practices informed the stable external-store subscription and queue ownership. Frontend testing guidance required rendered desktop/mobile reload and error-path verification, not only structural tests.
- Confirmed moments, uploaded photos/layouts, identity versions and preferences now persist; chat history and unfinished drafts do not. Settings offers unencrypted JSON export with scope/privacy wording. Restore/import/recovery controls and draft persistence are not yet wired. This supersedes earlier session-only claims for confirmed records only.
- 64 tests, lint, build and real Chrome desktop/mobile autosave/export/error/conflict/deletion checks passed. Browser plugin absent; used bundled Playwright. Known parent-lockfile warning remains. No production-service connection or chat redesign.

## 20. Requested local journal completion and Settings alignment — 2026-10-15

- The owner explicitly requested the remaining local journal features and Settings visual alignment. The delivered scope includes page/cover drafts, backup import/recovery UI, custom raster stickers, built-in tapes/clips/stickers, cover customization, within-year reading order, optional music links and content/layout Undo/Redo. No new production-service authority was inferred.
- Extend the existing validated local schema with optional fields to read earlier documents without reseeding. Drafts have forced-false context consent and remain separate from confirmed moments and stars. Backup serialization omits drafts and chat; local recovery may include drafts. Disclose and separately delete recovery copies because ordinary deletion cannot erase a previously retained copy.
- Import validates exact fields, ownership, safe music hosts and media before a replacement confirmation. Header checks precede browser decoding; animation and dimensional limits bound raster input. Sequential decoding avoids parallel allocation spikes. Count reused media once in the 32 MiB unique budget and retain a 96 MiB duplication ceiling, so editing a saved page does not fail just because its draft references the same photos.
- Journal-authored original words may change; conversation evidence remains immutable through keepMoment. Original dates, paired replies, identity and consent remain protected. Undo/Redo includes writing, media, fonts, music and layout; it is local to an editor session and capped at 30 steps. Drafts persist, undo stacks do not.
- Music is a validated external link opened deliberately with noreferrer/noopener; no embed, autoplay, remote metadata request or recommendation integration. Covers preserve year chronology and original occurrence dates while allowing a custom reading sequence inside a year.
- Emil guidance informed restrained Settings hierarchy and immediate editing feedback. React guidance informed stable local-store actions and serialized writes. Frontend testing used existing Playwright/Chrome because the Browser plugin is absent. Desktop/mobile rendered workflows and 71 tests pass; lint/build pass. Physical-device/Safari, actual quota exhaustion and production readiness remain unverified.

## 21. Future Self management visual alignment — 2026-10-15

- The owner explicitly flagged the whole `/future-self` page as the obsolete design. This extends the scoped visual authorization to that route only. Remove the public AppShell and oversized editorial headline in favor of the shared Echo shell, Your direction header, current-identity surface, actual destination year, personal anchors and quiet past-version disclosures.
- Inline edit/cancel/save uses the existing versioning action; moments and their provenance remain unchanged. Archive uses the existing native dialog with scoped keyboard wrapping, Escape dismissal and focus return. Empty state points to onboarding; the old fixture-reactivation shortcut is not presented as a product action.
- Horizon Day is a non-AI reflection preview using the selected stored identity, not an unrelated imported fixture. Choices do not silently edit identity or move memories. Future-dated horizons explicitly say preview. Past conversations remain read-only and their session-only limitation stays clear.
- Chrome/Playwright rendered checks pass at 1440×1000, the owner's marked 703×884 viewport, 390×844 and 320×740 with reduced motion. Checks cover edit cancellation, version creation/reload, unchanged moment evidence, past details, Horizon Day choices, Escape/focus wrap, archive/no automatic activation and reload. No page/console errors or horizontal document overflow in these flows. Browser plugin absent; existing bundled Playwright used. Physical hardware/Safari remain untested.

## 22. Cover-photo behavior and tape picker fixes — 2026-10-15

- The owner clarified that a cover photo must be able to become the actual cover, rather than only an inset photo. New uploads default to optional `photoMode: full`; the image fills cover bounds with object-fit cover and a contrast shade behind text. A visible full/inset choice preserves both uses. Existing records without photoMode keep their previous inset appearance until the user chooses Fill the cover. The mode persists through drafts, save/reload and backup/restore.
- Tape picker previews previously used a percentage height inside an auto-height cell, collapsing the strip. A fixed preview frame and explicit 21px tape height now make all four patterns visible. Upload has a dedicated wrapper with a 20px gap, shared by page and cover decoration pickers.
- The Tapes category also accepts a user-uploaded raster as `custom-tape`, clipped to a tape strip. It uses the existing media validation, immutable-evidence boundary and direct manipulation; repeats remain independent placements. No raster source is permitted for built-in designs, and custom tape requires a validated local data source.
- 72 tests, lint and production build pass. Focused rendered checks at 1440×1000, 390×844 and 320×740 pass full-cover bounds, full/inset switching, visible swatches, upload spacing, repeated/custom tapes, keyboard transforms and save/reload on both books and pages. Existing full journal desktop/mobile flows were rerun. Screenshots/scripts stay outside the repository. Physical-device/Safari remain untested; existing parent-lockfile build warning remains.
