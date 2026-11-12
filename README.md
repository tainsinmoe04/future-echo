# Future Echo

## Current release — 2026-11-12

Live application: https://future-echo-sandy.vercel.app/

The current application includes configuration-gated Supabase account access,
Google sign-in and explicitly consented hosted SEA-LION conversations. The older
implementation checkpoints below are historical; their statements that AI is
paused, Google is unavailable or all conversations reset are superseded.

- Home has English/Myanmar switching, monochrome branding, a brief logo entrance
  and a non-repeating layered starfield. Slow rotation and independent brightness
  changes replace the rejected tiled-dot wallpaper. Reduced motion disables movement.
- Desktop lower sections use a split composition; the mobile hero reserves the
  first viewport. The starfield is CSS, not video, and uses no external media request.
- Local journals are scoped to the verified account. Legacy unowned data is
  preserved separately, never silently assigned to a different signed-in user.
- Google is the primary login/signup action; email access is available under
  “Use email instead.” Adult confirmation remains required.
  Actual email delivery and password sign-in still require hosted verification.
- The conversation composer is text-only. Photos and templates remain available
  in the journal editor through Your Space.
- Journal templates preview their actual cover artwork; cover text and decorations
  move independently. Stickers can grow beyond twice their original size up to
  the book boundary. Compact controls stay upright, and native sticker selection
  preserves the editor. Routine session refresh runs in the background so
  returning to paste or choose an image does not interrupt editing. Large JPG,
  PNG and WebP uploads resize automatically on the device before local storage.
- Original conversation evidence and separate memory/note consent are preserved.
  Browser journals and backups are not encrypted or automatically cloud-synced.

Release notes and known verification limits: [RELEASE_NOTES.md](./RELEASE_NOTES.md).
Use WSL-native Node 24 for this repository; Windows npm cannot build its UNC path.

## Historical implementation checkpoints

Future Echo is a dark, quiet reflective product for speaking with one imagined possible future perspective. It is not prediction, therapy, or a productivity tracker. Its journal is browser-local. Account/backend integration is gated separately; AI work and public release are currently paused. A hosted schema was explicitly applied on October 17, but that does not establish live account or public-release readiness. See [BACKEND_SETUP.md](./BACKEND_SETUP.md), [SECURITY.md](./SECURITY.md) and [JOURNAL_PROGRESS.md](./JOURNAL_PROGRESS.md) for dated evidence and remaining gates. Never copy private environment files into an issue or commit.

### Non-AI production preparation

The current baseline is Next.js 16.4.3 with browser security headers, isolated
local journal persistence/backup tests and read-only CI. CI does not deploy.
Production account configuration must provide an explicit HTTPS APP_ORIGIN and
HTTPS SUPABASE_URL with no credentials, query, fragment or path. Invalid
configuration leaves account services unavailable rather than sending secrets to
an insecure destination. Development permits explicit loopback HTTP.

Run `npm run test:security` for synthetic scanner checks and a sanitized scan of
Git-tracked working files. This does not inspect ignored keys or Git history.
Auth responses now validate cookie token/expiry shapes; sign-out distinguishes
local cookie removal from unconfirmed upstream session revocation.

AI provider flags, keys and models are not part of this preparation. Do not enable
them to run journal/security checks. Public release still needs reviewed hosting,
real two-account tests, deletion/retention decisions, abuse controls and physical
device/accessibility checks; passing local tests is not release certification.

Read [SPEC.md](./SPEC.md) and [LEARN.md](./LEARN.md) before changing product behavior or visual direction. They record locked requirements, durable decisions, and rejected approaches.

### Latest local UX completion

Pre-connection resilience and hardware/safety review steps are in [PRE_CONNECTION_CHECKLIST.md](./PRE_CONNECTION_CHECKLIST.md). The repository now includes isolated-browser failure-path tests and a 16-case bilingual offline safety corpus. Corpus checks are not live model evaluation; actual-device, screen-reader and provider/account-deletion policy gates remain explicit.

Validated on 2026-10-16: 88 unit tests, SQL checks, lint, full TypeScript check, production build and 15 browser tests pass. Final browser tests used the production server with reduced motion asserted. For a separate local test server, set `ECHO_BASE_URL=http://localhost:3001`; CI builds first and then starts the production server. Physical-device/Safari and hosted CI checks remain outstanding. See JOURNAL_PROGRESS.md for the development-server retry and exact coverage.

New installs start empty; the public demo never becomes personal memory. Memory controls now allow permission changes, Myanmar redaction, earlier-exchange saving, local dates, resumable setup, versioned horizon/principles and meaningful Horizon Day actions. Journal adds local search/year/month filters, original-preserving photo framing, layer order, 20,000-character personal pages and 2,000-character notes. Model context remains bounded to 2,000-character excerpts and 500-character permitted notes. Existing records are never reset.

`npm run test:e2e` runs the committed browser suite against localhost:3000 (start the app first). `PW_CHANNEL=chrome` uses installed Chrome; otherwise install Chromium with `npx playwright install chromium`. Desktop 1440×1000, mobile 390×844 and small mobile 320×740 are configured. GitHub checks run unit/SQL/lint/build/browser on future pushes and pull requests, with no provider credentials or deployment.

### Current preview

`/future-self` now shares Your Space's dark/lilac/butter layout rather than the public-site shell. It supports inline versioned direction editing, past-version reading links, a non-AI Horizon Day preview and archive confirmation; existing moments retain their provenance.

`/now` opens the single messenger conversation. **Your Space → Settings** offers reading size, reduced motion, a default note font and validated backup download/import with recovery controls. In a memory book, **Photo, sticker & note → Arrange** supports direct mouse/touch movement, resize handles, pinch/twist and keyboard alternatives. The editor has 30-step content/layout Undo/Redo, custom raster stickers, 19 built-in stickers/tapes/clips, four note fonts, paper styles and optional user-chosen music links. **Customize [year] book** offers six cover themes, title/font/photo/decoration editing and page reading order. Choose **Done**, then wait for **Saved on this device**. Reading can hide decorations or layout without deleting them.

Confirmed moments, photos, layouts, identity versions, covers and preferences persist in IndexedDB. Unfinished page and cover drafts also save locally, separately from confirmed moments; resume them from Your Space/Customize. Drafts never add stars or grant AI memory consent. Storage failures and stale-tab conflicts are shown. Settings imports a validated unencrypted JSON backup only after preview/confirmation, atomically preserving the current journal as one recovery copy. Recovery can be downloaded, previewed/restored or explicitly deleted. Normal page deletion does not erase an older recovery copy. Exported backups exclude drafts and conversations. Browser cleanup, private mode and eviction can lose local data; there is no cloud backup. **Conversations still reset on refresh.** Replies are deterministic examples. Retention windows below are requirements, not functioning expiry jobs. Music opens an external destination only when clicked; it is not embedded, autoplayed or recommended by a connected service.

## Locked privacy boundaries

- Free conversation history is retained for up to 30 days; Plus history for up to 90 days. Device chat survives tab closure. Saved Moments remain until the user deletes them.
- AI context is limited to the current message, up to 10 recent non-deleted messages, the active Future Self version, and up to 3 relevant consented Saved Moments.
- My Note requires separate explicit opt-in. AI interpretations, archived or deleted memories, full history, and payment or support data are always excluded.
- The context boundary is implemented and tested server-side, but no model receives it while `/api/ai` remains inactive.

## Run locally

Use Node.js 24 (matching CI) and npm. In a WSL checkout, use WSL-native Node.

```bash
npm ci
npm run dev:local
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Responsive product landing page and core-loop demonstration |
| `/login` | Configuration-gated email login; Google sign-in unavailable |
| `/signup` | Configuration-gated email registration with adult confirmation |
| `/onboarding` | Three-stage possible-future setup with horizon presets |
| `/now` | Mock conversation, session review, and Save Moment flow |
| `/memory` | Sparse chronological saved moments and editable notes |
| `/future-self` | Active identity editing and archive lifecycle |
| `/api/ai` | Inactive server-only AI boundary; returns `501` |

Account, privacy, and sign-out controls live in the signed-in account menu. Saved moments are part of Memory, not a separate primary destination.

## Architecture

```text
src/
├── app/                    # Next.js App Router pages and server route
│   ├── api/ai/             # Intentionally inactive AI boundary
│   ├── onboarding/         # Client-side three-stage setup
│   ├── now/                # Conversation and save review
│   ├── memory/             # Client-side mock memory state
│   └── future-self/        # Identity lifecycle
├── components/             # Brand, shells, icons, auth, and modal UI
└── lib/
    ├── ai-provider.ts      # Provider-neutral inactive contract
    ├── domain.ts           # Versioned identity and consent-based memory models
    └── mock-data.ts        # Sparse saved moments and identity fixtures
src/server/
└── ai-context-builder.ts   # Enforced provider-facing context boundary
```

Tailwind v4 design tokens live in `src/app/globals.css`. Journal state is local and revision-protected in IndexedDB. Account/context APIs are separately gated; no module reads API keys in client code.

## Intentionally deferred

- Final mascot and hero artwork
- Hosted account/session verification, password recovery and approved account-deletion behavior
- Real AI provider and safety evaluation
- Conversation persistence, expiry jobs, and backup-erasure policy
- Notifications, export/print, multiple identities, rich search, and thematic views

## Verification

```bash
npm test
npm run lint
npm run build
```
## Private local Gemma trial (2026-10-18)

Ollama model: `gemma3:12b`. For the owner-authorized private development trial, use ignored `.env.development.local` with `FUTURE_ECHO_LOCAL_AI=true`; enable `FUTURE_ECHO_OLLAMA_WINDOWS_BRIDGE=true` only for WSL Next + Windows Ollama. Run `npm run dev:local` inside WSL, then open `http://localhost:3000/now`. The bridge keeps Ollama on Windows localhost, without exposing its port. See BACKEND_SETUP.md for full instructions.

This trial needs no cloud key or sign-in, uses no automatic cloud fallback, and cannot enable local inference in a production build. Existing Gemini/Supabase production gating remains unchanged. Local records/backups are not encrypted; this is not E2EE or public-launch readiness.
