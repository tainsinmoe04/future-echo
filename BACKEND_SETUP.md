# Supabase + Gemini — implementation checkpoint

## Current private trial: OpenRouter — 2026-10-19

This supersedes the Ollama selection, not hosted release gates. In ignored `.env.local`, provide `OPENROUTER_API_KEY` and exact `OPENROUTER_MODEL=google/gemma-4-31b-it:free`. In ignored `.env.development.local`, set `FUTURE_ECHO_OPENROUTER_TRIAL=true`, `FUTURE_ECHO_LOCAL_AI=false` and `FUTURE_ECHO_OLLAMA_WINDOWS_BRIDGE=false`. Keep `FUTURE_ECHO_AI_ENABLED=false`. Restart `npm run dev:local` in WSL. `/api/trial-ai` accepts only development, loopback, same-origin validated narrow context; it is not a production authenticated endpoint.

The chat sends selected context to OpenRouter and its provider. It is neither local inference nor E2EE. No Supabase account sync is used; conversations reset on refresh. Free-only and data-policy guards fail closed. Actual fictional generation returned 429/router_limit on 2026-10-19; do not repeatedly retry or enable paid/privacy fallbacks. Real voice/safety evaluation remains pending. Official endpoint inventory lists Google AI Studio, so OpenRouter does not by itself prove resolution of earlier Google eligibility limits.

## Migration applied with owner confirmation — 2026-10-17

After the owner signed in and explicitly confirmed Run, the exact reviewed migration was executed in the selected future-echo project's SQL Editor. An initial public-table inventory was empty; the migration completed successfully as one transaction. Post-migration read-only metadata checks passed all 10 expectations: six application tables with RLS enabled, zero anonymous table access, zero authenticated direct writes, five authenticated-readable tables, six server functions, no anonymous/authenticated function execution and six service-role executable functions, with five owner-read policies. WSL Node server requests using the modern secret key then returned HTTP 200 for all six tables with limit=0. No account rows, journal content or test users were inserted; this is schema/security metadata verification, not a completed two-account or concurrency test. Verification SQL is in supabase/verification/schema-security.sql. Do not rerun the non-idempotent creation migration; use the read-only verification query instead. Manual SQL execution is not a claim that Supabase CLI migration history was registered.

Gemini metadata still fails from the actual WSL runtime with HTTP 400 FAILED_PRECONDITION and an unsupported-location error. Google's available-regions page does not list Myanmar at this checkpoint. That supports a regional eligibility blocker but does not prove the key/model/billing is otherwise valid or identify Google's exact location classification. No generation request, routing workaround, billing/account change, deployment or provider substitution was made. AI remains disabled. The adapter now maps region, credentials, billing, model, access and quota errors to safe actionable messages without forwarding raw provider bodies; unknown preconditions remain generic rather than being mislabeled billing errors.

## Live preflight — 2026-10-17

The owner filled private .env.local and authorized continuing setup. No secret values are recorded here. Read-only checks reached Supabase Auth (HTTP 200). A server-side API-key-only request using the modern secret key returned PGRST205 for fe_profiles: the required application table is not exposed/found yet, so do not claim the migration is installed. The server adapter now supports modern sb_secret_ keys without a JWT Authorization header and preserves legacy service_role JWT behavior. The existing SUPABASE_SERVICE_ROLE_KEY variable accepts either format for compatibility.

Gemini model metadata GET returned HTTP 400 FAILED_PRECONDITION with "User location is not supported for the API use." No content-generation request was sent, no journal data uploaded and no billing/network-location/account changes were made. Verify Google-supported regional/account access and billing eligibility; do not assume enabling billing resolves this specific response. FUTURE_ECHO_AI_ENABLED remains false. Remote SQL has not been applied by the agent. Confirm a development project and apply the reviewed migration in its SQL editor before account/data integration tests.

2026-10-15: the owner explicitly chose Supabase + Gemini. This is configuration-gated integration code, **not a connected production deployment**. No credentials, remote migration, real provider call, deployment or push were performed. The default `/api/ai` still returns 501.

## Implemented

- Email signup/login/logout, network-verified Supabase user, HttpOnly cookies and refresh retry. Same-origin checks and streamed request-size limits. Adult beta self-attestation required.
- Owner-scoped directions, consented context text, messages, playlists and request ledger. RLS isolates reads, denies direct authenticated writes and keeps privileged RPCs service-only.
- Settings explicitly connects the current direction; sign-in alone never uploads the journal. Reconnect after refresh to load the latest 100 unexpired messages. Past directions are read-only.
- Gemini structured replies with schema validation, bounded context, short-reply/safety instructions, provider timeout/error states and no fabricated fallback. Blocked output leaves the persona. Prompt instructions are **not** a completed safety evaluation.
- On request, named song/artist playlists with fixed YouTube/Spotify **search links**, explicit save/reopen/remove and local backup support. No catalog verification, lyrics, player, autoplay, external music account or Spotify playlist creation. Playlists do not add constellation stars or become memory context.
- Atomic reservation/finalization and request idempotency, eight attempts/minute, Free 50 / Plus 200 successful-or-pending replies/UTC month. Failed/expired leases are not successful replies. Plan is server-owned, with no payment or client entitlement control.
- Free 30-day / Plus 90-day history filtering. Physical expiry cleanup function is provided but **not scheduled**. Saved playlists survive chat expiry.

## Data boundary

The photo journal remains browser-local. Connecting uploads only the active identity definition/horizon/principles and currently consented original text. Notes need separate permission. Deleted/archived moments, interpretations, paired replies, media, layout, fonts, drafts, music and playlists are excluded from memory context. Gemini receives the current message, at most ten recent eligible messages and at most three consented excerpts alongside the active identity.

Permissions are synchronized before sends and when moments change while connected. Failure pauses AI and discloses that remote removal could not be confirmed. Disconnect clears uploaded memory text, not account history/playlists. Local archive/version changes invalidate pending UI replies and attempt server archiving; failures are disclosed. A different device's version conflict fails rather than silently reactivating an archived identity.

The context table is **not** a cloud Saved Moment database: authoritative immutable conversation pairs remain local. Consent withdrawal deletes context rows; re-sharing is a new explicit upload, not a durable evidence audit trail. Device backups/recovery and exported files have independent retention.

## Private configuration needed

Copy `.env.example` to `.env.local` locally. Never paste keys into chat or commit them. Never use `NEXT_PUBLIC_` for service/provider secrets.

| Variable | Required value |
| --- | --- |
| `APP_ORIGIN` | Exact browser origin, initially `http://localhost:3000`; HTTPS when hosted. |
| `SUPABASE_URL` | Selected project's URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Project publishable/anon key for Auth. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only modern `sb_secret_...` key or legacy service-role JWT. Modern keys use `apikey` only; never use them as a bearer JWT. The variable name is retained for existing local setups. |
| `GEMINI_API_KEY` | Owner's server-only Gemini API key. |
| `GEMINI_MODEL` | Explicit structured-output-compatible model ID; no silent cost/model selection. |
| `FUTURE_ECHO_AI_ENABLED` | Default `false`; enable only for reviewed private integration tests, not public launch. |

Choose the project/region and review Gemini billing, availability, data handling and retention **before sending real private content**. No free-tier privacy or provider retention guarantee is implied.

The adapter follows the documented [Generate Content structured-output REST format](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en), currently labeled legacy by Google. Verify live compatibility with the selected model/account. Supabase isolation follows its [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Safe setup order

1. Review and manually apply `supabase/migrations/202610150001_backend.sql` to an explicitly selected development project. It has not been applied remotely.
2. Set private environment variables, Supabase Site URL and email confirmation settings, then restart. Validate confirmed email signup/login/logout/refresh with two accounts before enabling AI.
3. Verify hosted RLS, direct REST denial, forged IDs, archive/version behavior, consent withdrawal, duplicate requests and quotas. The local PostgreSQL test is not Supabase Auth/PostgREST verification.
4. Temporarily enable AI for private tests with fabricated content. Connect from Your Space → Settings. Test Burmese/English, music save/reopen/remove, provider failures and direction changes mid-request.
5. Schedule `select public.fe_delete_expired_messages();` with an approved privileged Supabase Cron job, for example hourly. Until scheduled, expired rows remain physically stored although clients cannot read them. Verify and document the deletion SLA.
6. Pass production gates below before opening access to others.

```sh
npm ci
npm test
npm run test:db
npm run lint
npm run build
```

`test:db` uses development-only PGlite (WASM PostgreSQL), isolated stand-in Auth roles/users and the actual migration. It checks RLS/grants, immutable originals/kind, idempotency, limits, retention, stale leases, archive and account cascades. It never connects to Supabase. It does not prove hosted configuration or concurrent multi-connection behavior.

## Still required for a complete production backend

- Real credentials/project configuration and live integration checks.
- Full Saved Moment/journal cloud persistence, private media storage, explicit opt-in migration, sync conflict handling and complete export/deletion UX. Do not upload the photo journal silently. The context table does not enforce the Free ten-Saved-Moment limit and is not a journal backup.
- Approved account/backups/provider deletion policy, usable destructive account deletion, tested expiry scheduling and request-ledger retention. SQL cascades alone are not an account deletion feature.
- Live bilingual crisis, delusion, dependency, harmful-direction and prompt-injection evaluation; human-support design and SPEC closed-beta gates. Prompt text alone is insufficient.
- Hosted TLS/cookie checks, account/multi-device transitions, archive races, quota concurrency/load and abuse/cost monitoring without logging raw private context or secrets.
- Password recovery and any separately selected OAuth flow. Google sign-in is explicitly unavailable. Payments remain excluded.

The approved messenger/scrapbook direction is preserved. No mascot choice, unrelated redesign or music-provider integration is included.
## Local Gemma trial — 2026-10-18

The owner currently wants private local testing, not public launch. Installed model: `gemma3:12b`. In an ignored `.env.development.local`, set `FUTURE_ECHO_LOCAL_AI=true`. For this WSL repository with Ollama running on Windows, also set `FUTURE_ECHO_OLLAMA_WINDOWS_BRIDGE=true`. Keep `FUTURE_ECHO_AI_ENABLED=false`; existing provider credentials are not needed or changed.

Run `npm run dev:local` with the WSL Node runtime, then visit `http://localhost:3000/now`. Create a local direction through onboarding if none exists. No sign-in or cloud Connect action is required. The local route is disabled in production even if its flag is accidentally set. To return to example replies, set `FUTURE_ECHO_LOCAL_AI=false` and restart development.

The bridge is necessary because Windows Ollama was reachable while WSL `127.0.0.1:11434` was not. It performs only a fixed local `/api/chat` request and sends the payload on stdin; do not replace this with `0.0.0.0`, a tunnel, unrestricted CORS or public exposure. On a machine where Ollama and Next run in the same OS, leave the bridge flag false. There is no automatic cloud fallback.

This is not E2EE, encrypted storage, cloud backup or a completed model-safety evaluation. Context remains current message + ten recent messages + active direction + up to three consented excerpts; note permission is separate. Photos, drafts, decoration, AI interpretations and archived/deleted moments are excluded. Requests may take up to three minutes on local hardware. A failed or malformed reply remains an error, not a fabricated example.
