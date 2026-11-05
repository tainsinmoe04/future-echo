# Security and release boundaries

Report vulnerabilities privately to the repository owner, not in public issues
containing credentials, cookies, journal exports or personal messages. Revoke
leaked credentials first: removing a file or Git commit does not revoke a key.

## Automated checks

Read-only CI runs high/critical dependency audit, TypeScript, unit tests, isolated
SQL/RLS tests, lint, production build and browser tests. Weekly/manual runs are
available. AI modes are disabled throughout the job; no deployment secrets are
needed. Review Dependabot updates rather than auto-merging them.

Before dependency install, CI also runs the dependency-free repository hygiene
scanner and its synthetic regression checks:

    node scripts/verify-repository-security.mjs --self-test
    node scripts/verify-repository-security.mjs

The scanner rejects tracked environment/key files, browser test artifacts and
high-confidence known credential formats; it prints only paths and rule IDs, never
matched values. It reads Git-tracked working-tree files, not ignored local keys,
Git history or remote accounts. It is a bounded regression guard, not a complete
secret detector. A clean result does not prove that past commits never leaked a
credential. GitHub secret scanning and a reviewed historical scan remain separate.
No secrets or browser traces are uploaded as CI artifacts. Tool execution uses
the locked local TypeScript/Playwright packages, not implicit npx downloads.

## Release review and recovery

Before a separately approved release, record the exact commit and passing checks,
the target project/domain and non-AI feature flags. Use a reviewed production
environment with required human approval; do not run secret-bearing builds from
untrusted pull requests or use pull_request_target to execute their code.

Keep the previous application release available for rollback. Database changes
need a separately reviewed backup/restore and compatibility plan; rolling back
application code does not undo a migration. Run a fabricated-user smoke test after
release and confirm that no model/provider request is possible when AI is disabled.
Keep personal journal exports and authentication state out of release evidence.
No deployment workflow or remote branch rules are configured by this document.

## Public release gates

- Enable GitHub secret scanning/push protection where available. Protect main
  with required verify checks, reviewed PRs, restricted bypass and no force push.
  Repository files alone do not enable those remote controls.
- Configure HTTPS and HSTS at the final hosting boundary after domain review.
  Never expose next dev, Ollama or private trial endpoints publicly.
- Review full nonce-based script CSP against hydration and journal/media flows.
  Current CSP blocks framing, plugins, foreign bases and form submission; it is
  not full XSS protection. Local journal storage is not encrypted/E2EE.
- Verify real two-account isolation, session expiry/logout, auth abuse limits,
  email recovery, retention/account deletion, backup erasure and restore drills.
- Keep keys server-only and out of CI artifacts/logs. Never publish browser auth
  state, personal storage or raw production requests as debugging artifacts.
- Hosting, migrations, production AI and automatic CD need separate approval.
  Identify the tested commit, environment and rollback plan before release.

A green audit is not a penetration test or public-release certification.
