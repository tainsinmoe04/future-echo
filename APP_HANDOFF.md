# Future Echo — App, Design and Implementation Handoff

Latest private local trial (2026-10-18): owner authorized installed Ollama `gemma3:12b` for local testing; public launch remains separate. Run WSL `npm run dev:local`, then open `http://localhost:3000/now`. Ignored `.env.development.local` enables the dev-only local route and fixed Windows localhost bridge. No cloud key/sign-in/Connect action is needed or used. Production `/api/ai` remains 501; no automatic cloud fallback. Existing journal, consent and version safeguards remain intact; local storage/backups are not encrypted and this is not E2EE. Real English/Myanmar local replies and isolated desktop/mobile interactions verified; Myanmar wording and full bilingual crisis quality still need work. See JOURNAL_PROGRESS.md for exact evidence and BACKEND_SETUP.md for startup/disable instructions. No push/deployment.

Latest live setup checkpoint (2026-10-17): owner explicitly confirmed the reviewed migration in the future-echo project. It is now applied remotely: six tables, six server functions, RLS and ten catalog security checks verified; anonymous profile REST is denied and server limit=0 reads work. Do not rerun the creation migration. Supabase CLI migration-history registration is not claimed. Gemini metadata remains blocked by Google's unsupported-location response; generation/AI enablement remain off. Safe Gemini diagnostic mapping and regression coverage added. Current checks: 94 unit tests, local SQL, lint/build pass. See BACKEND_SETUP.md and JOURNAL_PROGRESS.md; older 'schema not installed' checkpoints are superseded, not a current blocker. Account/email/two-owner/concurrency tests, cleanup scheduling, live model safety and privacy-policy decisions remain pending. No push/deployment or provider/billing/network change.

Latest pre-connection hardening (2026-10-16): Settings keyboard entry/focus return, isolated failure-path browser tests and bilingual offline safety preparation added. Current checks: 90 unit tests, SQL/lint/TypeScript/build and 30 production-browser checks pass. Read PRE_CONNECTION_CHECKLIST.md for remaining actual-device, assistive-technology, real model evaluation and owner-approved account deletion/retention gates. No services, push or deployment. QA uses localhost:3187 because another Windows process owns port 3001; do not terminate unrelated servers.

Prepared: 2026-10-15 (Asia/Rangoon).

Validation updated 2026-10-16: 88 unit tests, SQL checks, lint, TypeScript, production build and 15 production-browser checks pass across desktop and two mobile widths with reduced motion. See JOURNAL_PROGRESS.md for scope, the earlier development-server failure and remaining hardware/hosted-service gates. Latest changes are local, not committed or pushed.

Latest non-API increment: see SPEC latest scope, LEARN Section 24 and JOURNAL_PROGRESS. The owner approved all audit fixes/additions. New installs are empty with isolated public demo; existing local pages are preserved. Reversible consent, Myanmar redaction, local dates, earlier-message saves, setup drafts, actual local horizon/version actions, search/calendar filters, nondestructive cropping, layer order, long writing and repository browser/CI checks are implemented. These supersede old preview-only lifecycle/public-route restrictions within the approved scope. Browser control already works in-app; no separate plugin installation is claimed. API services remain unconnected and no new push/deploy is included.

Latest backend checkpoint (2026-10-15): the owner explicitly selected **Supabase + Gemini** after requesting real replies and saveable song recommendations. Configuration-gated Auth, owned text context/history, structured provider adapter, reply limits and separate playlist save/reopen/remove now exist. No credentials or remote project are connected and `/api/ai` defaults to 501. Sign-in does not upload the photo journal; Connect is explicit. See BACKEND_SETUP.md, SPEC's latest backend scope, LEARN Section 23 and JOURNAL_PROGRESS for verified checks and unresolved production gates. This supersedes older blanket no-provider implementation notes but does not authorize payments, deployment or claim live readiness.

Latest cover/tape fix (2026-10-15): cover-photo uploads now default to filling the entire cover, with a Full / Inset choice; old saved covers keep inset presentation unless changed. Tape swatches render visibly in the grid, upload controls have a separate gap, and the Tapes category supports validated user-uploaded tape strips. These persist through the existing local draft/save/backup model. 72 tests, lint/build and focused desktop/mobile checks pass. See LEARN Section 22 and the newest JOURNAL_PROGRESS entry.

Latest route follow-up (2026-10-15): the owner flagged all of `/future-self` as using the obsolete design. It now follows Your Space's bounded black/lilac/butter shell, with current direction, actual destination year, inline versioned edit, personal anchors, past-direction disclosures, non-AI Horizon Day preview and a keyboard-accessible archive dialog. The original baseline's statement that this route retains its old layout is superseded. Landing/login/signup remain unchanged. Rendered checks at 1440×1000, 703×884, 390×844 and 320×740 passed; artifacts are `verify-future-self.cjs` and `future-self-*.png` in the existing external artifacts folder.

## Latest update — requested local journal features delivered, 2026-10-15

The owner subsequently authorized all remaining journal functions and Settings alignment. The implementation now includes page/cover draft autosave and resume/discard, validated backup import/preview/confirmation, recovery download/restore/deletion, uploaded raster stickers, 19 built-in stickers/tapes/clips, six customizable cover themes with fonts/photos/movable decorations, paper choices, within-year page ordering, optional safe music links and 30-step content/layout Undo/Redo. Personal journal words can be edited; saved conversation evidence remains immutable. Settings direction/data composition now follows Your Space.

Local drafts are separate from confirmed moments and have no memory consent or constellation stars. Back keeps drafts; Done applies a page/cover. JSON backup excludes drafts/conversations. One pre-restore local recovery copy may contain drafts and deleted content; the UI explains this and offers separate deletion. Chat is still session-only; production AI/auth/cloud/payments and connected recommendations remain inactive.

Verification: 71 tests, lint/build and Chrome desktop/mobile workflows pass at 1440×1000 and 390×844, including mouse, keyboard and emulated pinch, reduced motion, refresh, invalid import, cancellation, restore and recovery deletion. See the newest JOURNAL_PROGRESS entry and `verify-journal-full.cjs` / `journal-*.png` artifacts. Physical devices/Safari and real quota exhaustion remain unverified. The original handoff baseline below records the state before this authorized implementation; its pending-feature tables and continuation order are superseded by this update and the newest checkpoint.

This is a continuation guide based on the WSL repository and the owner's decisions in this conversation. It is not a production release announcement. The original baseline sections below preceded the expanded implementation; use the latest update above and the newest JOURNAL_PROGRESS entry for present completion status.

## 1. Read first and resolve conflicts

1. Read `AGENTS.md`, `SPEC.md`, and `LEARN.md` completely before editing.
2. Read this document for the consolidated current state and latest owner feedback.
3. Read the newest entry in `JOURNAL_PROGRESS.md` for the implementation checkpoint. Its older entries are historical: statements that persistence is unimplemented are superseded by the 2026-10-15 user-facing persistence entry.
4. Inspect `git status`, tracked diff, and untracked files. The working tree contains substantial approved, uncommitted work; a diff stat alone omits new components and assets.

SPEC is the requirements authority. Its Sections 11–12 explicitly supersede earlier visual constraints within messenger, onboarding, Personal Space and Memory. LEARN records provenance and rejected directions. New explicit owner instructions steer the next scoped work; they do not authorize unrelated service integrations.

## 2. Product and emotional intent

Future Echo is one intimate conversation with an imagined possible future version of the user, farther along a direction the user chose. It helps recover belief and perspective when exhaustion, doubt or comparison makes that direction hard to hear.

Core principle: “Future Echo does not speak over a difficult day. It helps the user reconnect with the part of themselves that the day made difficult to access.”

The road metaphor matters: the future perspective reminds the user why they began and helps them consider whether the direction still feels true. It cannot know the future, guarantee success, decide the route, or pressure someone to continue a harmful path.

Replies should usually be short, natural and responsive to the actual message. Longer replies are appropriate when the conversation warrants them. Contextual information explains the imagined premise; repetitive disclaimers do not belong in every reply. The slightly uncanny feeling comes from temporal distance and messenger presence, without claiming real contact across time.

The core journey is: define a direction → converse → optionally save → personalize a chosen moment → reopen later. Returning should be voluntary. There are no streaks, discipline scores, daily tasks, or progress percentages.

## 3. Current design direction

### Messenger

- One primary chat: Your Future Self. Avoid a multi-chat inbox, dashboard shell, sidebar grid, reading-page hero, AI orb, or assistant-style workspace.
- Distinct incoming and outgoing messages, a familiar composer, identity/destination year, distance ahead, and a messenger-like typing interval.
- Dark shell, restrained lilac and butter accents, white incoming surfaces and soft butter/lilac outgoing surfaces. The owner preferred the supplied messenger reference over the earlier midnight-blue reading form.
- Mobile feels like a messenger. Desktop keeps an intimate bounded width rather than stretching content.
- Chat remains visually simpler than the personal books. Do not spread scrapbook decoration across every chat surface.

### Personal Space and Memory

- Your Space is secondary to chat; available through the chat header and directly at `/memory`.
- The constellation grows from explicitly chosen life moments, including ordinary or difficult ones. It is not a task tracker or a measure of distance toward guaranteed success.
- Memory is a personal emotional collection: book covers, cream paper within the dark shell, photographs, restrained stickers, tactile collage and handwritten notes.
- The owner's references include a black messenger with pale message surfaces, a butter/cobalt scrapbook collage, and an open photo journal with tape and small personal details. Treat these as direction references, not licensed production assets.
- The book editor should eventually feel like a capable personal journal: movable photos/text, custom stickers, decorative collections, personalized covers and page organization. Current functionality is narrower; see status below.
- Keep authorship legible and reading accessible even when users overlap decorations.

### Actual current tokens and typography

`src/app/echo.css` scopes the latest interface under `.echo-ui`:

| Role | Current value |
| --- | --- |
| Black | `#08090c` |
| Paper | `#f6f3eb` |
| Lilac | `#c6c6ff` |
| Butter | `#ffedaf` |
| Muted text | `#aaaabd` |
| Cobalt | `#263379` |

Manrope is the interface body face; Nunito Sans provides the softer alternate. Notes/captions offer Clean (Manrope), Soft (Nunito Sans), Handwritten (Caveat), and Book (Lora). Burmese fallbacks use Noto Sans Myanmar, Padauk and Noto Serif Myanmar. Caveat does not supply Burmese handwriting. Decorative font choices do not restyle original conversation evidence or future-self replies. Fonts are served through Next's font pipeline.

The current chat is at most 570px wide, the Memory shell 520px, and the desktop drawer 510px. These are existing implementation values, not a newly approved universal layout specification. Existing controls generally use 44px targets, rounded surfaces and visible focus. Direct manipulation follows the pointer without decorative momentum. Reduced motion respects the system preference even when the app preference is Follow device.

### Latest owner feedback: Settings needs alignment

The owner identified the **Your direction / Earlier conversations / Your data, clearly / backup** section as feeling like an earlier interface and requested alignment with the latest UI/UX. The immediate instruction was to prepare this handoff first.

Verified code location: `src/components/echo/space-settings.tsx`, with shared persistence/export UI in `journal-storage-status.tsx` and styling in `src/app/echo.css`. These already use current Echo classes and colors. However, their composition is a long sequence of paragraphs, a text link, disclosure and export control. This is a composition/hierarchy concern, not proof that an entirely old stylesheet is active. The linked `/future-self` management page also retains its earlier layout.

Recommended next scoped UI pass: make this area feel part of Your Space through concise grouped rows, clear action hierarchy and expandable supporting detail. Preserve truthful storage/backup/consent information and readable error states. Keep account/service controls limited to functioning features. This is a recommendation for the next implementation pass; no replacement composition has been rendered or approved in this handoff. Do not use this request to redesign all routes or the entire Future Self management page.

## 4. Current implementation status

| Area | Verified current implementation | Remaining work / limits |
| --- | --- | --- |
| Chat | Single messenger, deterministic mock replies, typing interval, inline save review, optional leave without saving | No connected model; chat history resets on refresh |
| Identity | Three-stage onboarding, chosen horizon, versioned identity state, management/archive mock flows and past-conversation access | Full production lifecycle and persistence/retention validation remain release work; management visuals retain earlier layout |
| Save Moment | Selected original words, optional paired reply, separate note, explicit context consent and provenance | Preserve immutability and redaction rules through all future changes |
| Personal moments | Manually authored text, title/date, photos and optional note within chronological Memory | Current editor shows saved original words read-only; full journal text editing is not implemented |
| Memory | Year books, chronological moments, constellation, saved-page detail, separate revisit reflection | Covers are preset compositions; books/pages cannot yet be freely organized |
| Direct layout | Mouse/touch movement, attached resize/rotation handles, two-finger pinch/twist, keyboard alternatives, cancel/reset | Physical touch devices and Safari remain unverified |
| Undo/Redo | Layout history and sticker placement/add/remove changes | Not a complete history of text, photo and all content edits |
| Media/decorations | Up to 4 JPG/PNG/WebP photos; flower, shoes, hearts and star stickers; up to 12 positioned sticker instances | User-uploaded stickers, expanded sticker/tape/clip libraries pending; existing decorative clip/tape artwork is not an editable collection |
| Reading | Hide stickers and read without layout without deleting presentation data | Preserve these escape hatches during editor expansion |
| Settings | Reading size, reduced motion, default note font, direction/history links and data disclosures | Latest owner requests a more coherent visual composition |
| Local save | Validated IndexedDB hydration; serialized/coalesced saves; save/error/retry states; revision conflict protection | Confirm editor changes with Done; unfinished drafts reset on refresh |
| Backup | Validated unencrypted JSON download in Settings | Import preview, restore confirmation and recovery management UI pending |
| Restore foundation | Atomic revision-checked restore and pre-restore recovery adapter; validation codec | Storage foundation alone is not usable import/restore; image decode/dimension checks required before exposure |
| Music | Authorized future scope is optional safe user-chosen links | No implemented player/link editor or recommendation integration; recommendations remain design-only |

Confirmed moments, uploaded photos, presentation transforms, identity versions and preferences persist after **Saved on this device**. Storage is tied to the browser/device; clearing browser data or storage failure can lose it. No cloud backup exists. Backup excludes conversations and unfinished drafts and is not encrypted. Never describe current chat expiry or paid limits as enforced.

## 5. Product integrity that must survive design changes

- One active Future Self; minimum horizon six months. Identity/horizon/principle edits create versions. Prior records retain provenance; memories do not transfer automatically.
- Saving is manual, optional and confirmed. Original excerpt and paired reply remain immutable after confirmation; deletion is available. Interpretation is labeled, secondary, frozen and removable. My Note is editable.
- Saved words and note permissions are separate. Presentation data and drafts do not grant context consent or add confirmed-memory constellation stars.
- Six-month reflection uses “What feels clearer now than it did then?” and does not grade the past as success or failure.
- The server context builder admits only the current message, up to 10 eligible recent messages, the active identity and up to 3 relevant consented moments. Note inclusion needs separate permission. Full history, interpretations, archived/deleted records, photos, stickers, fonts, billing and support data are excluded.
- `/api/ai` stays inactive and returns `501`. No production AI, Supabase, authentication, payments, music service, deploy or push is authorized.
- Crisis handling must leave persona role-play; beta remains 18+. Production safety evaluation is still outstanding.
- Mascot and final public artwork remain unresolved. No public-site, landing, login or signup redesign is authorized by the current Settings feedback.

## 6. Repository map

| File / directory | Responsibility |
| --- | --- |
| `src/app/now/page.tsx` | Main messenger and conversation interactions |
| `src/app/memory/page.tsx` | Direct route into Personal Space |
| `src/app/onboarding/page.tsx` | Possible-future setup |
| `src/app/future-self/page.tsx` | Earlier management route; check before scoped alignment |
| `src/app/echo.css` | Latest scoped messenger, Personal Space, editor and Settings styling |
| `src/app/globals.css` | Shared/earlier global design tokens |
| `src/app/layout.tsx` | Font setup and shared state provider |
| `src/components/echo/personal-space.tsx` | Constellation, covers, book entry and Settings navigation |
| `src/components/echo/space-settings.tsx` | Latest feedback target |
| `src/components/echo/journal-storage-status.tsx` | Save/error/retry status and backup download |
| `src/components/echo/memory-book.tsx` | Reading, author/context information and revisit reflection |
| `src/components/echo/moment-editor.tsx` | Writing, photos, arrangement, font choice and Done |
| `src/components/echo/moment-paper.tsx` | Shared page rendering for reading and editing |
| `src/components/echo/page-object.tsx` | Pointer/touch/keyboard object transforms |
| `src/components/echo/save-review.tsx` | Manual save review and consent |
| `src/components/mock-product-state.tsx` | Product state, identity actions and local persistence connection |
| `src/lib/journal-session.ts` | Hydration, external-store subscription and serialized save queue |
| `src/lib/journal-storage.ts` | IndexedDB envelopes, revision checks, atomic restore/recovery |
| `src/lib/journal-snapshot.ts` | Exact-field saved-record validation |
| `src/lib/journal-backup.ts` | Versioned backup parsing/serialization and size limits |
| `src/lib/page-transform.ts`, `scrapbook.ts`, `personal-space.ts` | Geometry, decoration preferences and Memory helpers |
| `src/lib/domain.ts`, `moment-lifecycle.ts`, `redaction.ts` | Evidence models, consent, horizon/date and verbatim-redaction rules |
| `src/server/ai-context-builder.ts` | Enforced server-only context projection |
| `public/scrapbook/` | Existing local scrapbook assets; inspect provenance before reuse outside scope |
| `tests/` | Pure behavior, consent, storage, snapshot, backup and geometry tests |

## 7. Environment and verification provenance

- Repository: `/home/usertainsinmoe/projects/future-echo` in Ubuntu WSL; Windows access is `\\wsl.localhost\Ubuntu\home\usertainsinmoe\projects\future-echo`.
- Stack: Next.js 16.2.10, React 19.2.4, strict TypeScript, Tailwind CSS v4. No UI-library dependency is declared in package.json.
- Use WSL-native Node (current installed runtime: `/home/usertainsinmoe/.nvm/versions/node/v24.16.0/bin`) and WSL git. Windows git may reject UNC ownership; do not change global safe-directory settings to bypass this.
- Commands: `npm test`, `npm run lint`, `npm run build`, `git diff --check`.
- Local route addresses: `http://localhost:3000/now` and `http://localhost:3000/memory`. Check the server before promising availability. The preceding run used `npm run dev -- --webpack --hostname 0.0.0.0`.
- Last verified implementation checkpoint: 64 tests passed, lint passed, production build passed and diff whitespace check passed. These were run before this documentation-only handoff; no new test run is claimed here.
- Rendered Chrome/Playwright verification at 1440×1000 and 390×844 covered save/reload, uploaded PNG, layout, preferences, export contents, stale-tab conflict, failed-write retry, deletion/reload and corrupt hydration. Earlier direct-manipulation checks covered mouse, emulated touch, keyboard and reduced motion. Physical device/Safari and real quota exhaustion remain pending.
- Prior artifacts are outside the repository at `C:/Users/User/.codex/visualizations/2026/07/19/019f791b-bab5-7083-821e-5587f170c06c/`: `autosave-desktop.png`, `autosave-mobile.png`, `direct-desktop.png`, `direct-mobile.png`, `verify-autosave.cjs`, `verify-direct.cjs`, `verify-journal-storage.cjs`. These show earlier checkpoints, not a newly rendered Settings redesign.
- Known build warning: Next infers workspace root from a parent package-lock.json. Build passes; do not delete unrelated parent files.
- Git HEAD at handoff inspection: `77330a6` (journey encoding/types/identity fix), preceded by `8b86153` (initial project). Current approved UI and persistence work largely resides in the dirty tree, not that commit alone.

## 8. Continuation order

1. Deliver/read this handoff. The next owner-facing UI task is the identified Settings direction/data area: align its composition with Your Space while preserving disclosure and working controls. Verify desktop/mobile, keyboard and reduced motion for the changed surface.
2. Complete the unfinished persistence stage before adding more decoration features: raster decode/dimension validation; explicit import preview and replacement confirmation; atomic recovery integration with truthful recovery export/deletion behavior; then separate draft persistence. Test malformed files, rollback, conflicts, deletion, consent and refresh recovery.
3. Expand editor history to meaningful content operations and clarify editable journal-authored text versus immutable saved conversation evidence. Keep direct touch/mouse transforms and untransformed reading available.
4. Add custom raster stickers and a broader built-in sticker/tape/clip collection using the validated media pipeline.
5. Add customizable covers and book/page organization while retaining chronological dates and identity provenance.
6. Add optional user-chosen safe music links with no autoplay. Prepare recommendation design separately; external integration needs explicit authorization.
7. Update JOURNAL_PROGRESS, SPEC and LEARN only as actual behavior changes. Run appropriate tests, lint/build and rendered checks. Do not claim an entire roadmap stage is complete because one foundation module exists.

The existing `continue-future-echo-journal` follow-up is intended to continue these approved increments subject to account usage. Do not assume its live status from this document. Its instructions require a usage check, quiet waiting below 10% short-term availability, no unsupported automatic model switch, and stopping it when its scoped work is complete or the owner asks.
