# Supabase + Gemini — implementation checkpoint

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
| `SUPABASE_SERVICE_ROLE_KEY` | Legacy JWT service-role key, server-only. New secret-key compatibility is not live-tested. |
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
