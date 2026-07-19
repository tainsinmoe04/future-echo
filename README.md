# Future Echo

Future Echo is a dark, quiet reflective product for speaking with one possible future perspective a user is deliberately working toward. It is not prediction, therapy, or a productivity tracker. This phase is a fully interactive mock: authentication, storage, Supabase, and AI providers are intentionally not connected.

Read [SPEC.md](./SPEC.md) and [LEARN.md](./LEARN.md) before changing product behavior or visual direction. They record locked requirements, durable decisions, and rejected approaches.

## Locked privacy boundaries

- Free conversation history is retained for up to 30 days; Plus history for up to 90 days. Saved Moments remain until the user deletes them.
- AI context is limited to the current message, up to 10 recent non-deleted messages, the active Future Self version, and up to 3 relevant consented Saved Moments.
- My Note requires separate explicit opt-in. AI interpretations, archived or deleted memories, full history, and payment or support data are always excluded.
- The context boundary is implemented and tested server-side, but no model receives it while `/api/ai` remains inactive.

## Run locally

Requires Node.js 20.9+ and npm.

```bash
npm install
npm run dev
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Responsive product landing page and core-loop demonstration |
| `/login` | Static Google and email/password login UI |
| `/signup` | Static Google and email/password signup UI |
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

Tailwind v4 design tokens live in `src/app/globals.css`. Interactive mock state remains local to client components. No module reads API keys in client code.

## Intentionally deferred

- Final mascot and hero artwork
- Supabase Auth, PostgreSQL schema, and RLS
- Real AI provider and safety evaluation
- Conversation persistence, expiry jobs, and backup-erasure policy
- Notifications, export/print, multiple identities, rich search, and thematic views

## Verification

```bash
npm test
npm run lint
npm run build
```
