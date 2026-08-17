# Repository instructions for AI agents

This file contains repository instructions for AI coding agents and other
automated assistants working in this project. `CLAUDE.md` and `AGENTS.md` are
kept identical — edit both, or neither.

## Required reading order

Read these documents before any non-trivial change:

1. `.github/copilot-instructions.md` for general coding and UI conventions;
2. `docs/01-application-architecture-overview.md` for the normative repository
   structure, ownership boundaries, and file-placement rules;
3. `docs/02-authentication-authorization-overview.md` before changing identity,
   sessions, roles, permissions, Supabase clients, RLS, protected data, Server
   Actions, Route Handlers, or auth UI;
4. `docs/03-ui-design-system-overview.md` before changing styling, tokens,
   components, forms, responsive behavior, interaction states, or accessibility;
5. `docs/04-engineering-quality-overview.md` before implementation, validation,
   error handling, logging, dependencies, tests, configuration, or handoff;
6. the relevant file under `docs/plans/` when implementing planned work.

Overview documents define the intended long-lived architecture, security, UI,
and engineering-quality invariants. Plans define temporary migration steps and
do not override an overview. The repository remains the source of truth for
what is implemented right now; when it differs from an overview, inspect the
related plan and do not assume the migration is complete.

> Caveat: that file is partly out of date — it describes NextAuth,
> `app/_components/`, `app/_lib/`, `date-fns`, and heroicons, none of which
> exist here. The four project overview documents above override its stale
> architecture and authentication examples. When factual implementation
> details conflict with the repository, the repository wins.

## Current architecture baseline

- Repository Architecture Hardening master plan `003` is completed on the
  `development` branch: blocks `B1`, `B2`, and `B3` were implemented and
  verified in order.
- The current route, component, auth, and Supabase module paths reflect the
  approved architecture. This completion covers file ownership and imports,
  not authentication or authorization behavior.
- `ARCH-004` remains open for the unresolved choice between the two pages that
  map to `/`; do not silently choose a product behavior while doing unrelated
  work.
- Security implementation remains governed by plan `001` and overview `02`.

## Deferred work registers

Every overview under `docs/` ends with a `Deferred work register`. When a
material, verified problem is discovered outside the authorized scope of the
current task:

- add or update it in the one overview that owns the concern;
- use that overview's ID prefix: `ARCH-*`, `AUTH-*`, `UI-*`, or `ENG-*`;
- search all registers first and do not duplicate the same finding;
- record only repository facts with a concrete correction/exit condition, not
  speculative improvements;
- link the owning plan and block when implementation has been approved;
- leave it `Open` when no implementation plan exists;
- do not fix it merely because it was recorded;
- remove it only in the same change that verifies the issue is resolved.

The register is a visibility index, not a substitute for a scoped
implementation plan. Detailed sequence, tests, deployment, and rollback remain
in `docs/plans/`.

## Read this before changing files

- Inspect the current Git branch and working tree before making changes.
- Treat the repository and the current runtime configuration as the source of
  truth; do not assume that a branch, deployment, or database is active.
- Preserve unrelated user changes.
- Explain uncertainty instead of inventing missing configuration.
- Use Slovak for user-facing copy and messages unless the user requests another
  language.

## Git and release flow

- `development` is the integration and testing branch.
- `main` is the production branch.
- Create feature branches from `development`.
- Merge completed and locally tested feature branches into `development`.
- Release by merging `development` into `main` after verification.
- Merge `main` back into `development` only for production hotfixes or other
  changes made directly on `main`.
- Never push directly to `main`.

The active branch must be checked before every operation that can affect code,
deployment, or a database. A local branch with the expected name does not prove
that it is currently checked out.

## Environment and secrets

- Local development must use the development Supabase project.
- Production Supabase credentials must not be placed in `.env`, `.env.local`,
  source code, logs, or committed files.
- `.env.example` may contain variable names and placeholders only.
- Never print, commit, or send API keys, service-role keys, Resend keys, or
  other secrets.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses RLS.
- `NEXT_PUBLIC_SITE_URL` builds Supabase auth redirect links and must match the
  environment. A mismatch breaks password resets silently.
- `RESEND_API_KEY` and `EMAIL_FROM` drive transactional email from
  `lib/email.ts`. Without the key, sending is skipped silently and no user
  operation fails.
- Verify the active Supabase URL before executing any SQL or data-changing
  operation.

## Database changes

- Development schema changes come first and must be tested there.
- Production database changes require an explicit, deliberate release step.
- Do not run a development migration against production merely to verify it.
- No ORM. Solve complex queries with a Postgres view or `.rpc()`, not by
  chaining joins in JavaScript.

## Project conventions

- User-facing text and error messages are in Slovak.
- Reads belong in `services/queries/`.
- Writes belong in `services/actions/`.
- Keep service-role access on the server and after the appropriate role check.
- Do not add dependencies without explicit approval.
- Follow the existing Prettier and Tailwind conventions.
- Colors: use the tokens from `app/globals.css` — `primary-50`–`primary-950`
  plus named accents (`accent-pink`, `accent-purple`, `accent-dark-purple`,
  `accent-blue`, `accent-teal`, `accent-green`, `accent-yellow`, `accent-gold`).
  Accents have no 50–950 numeric scale, despite what copilot-instructions says.
  No `bg-blue-500`, no `text-gray-200`.

## Verification

Before handing off a change, report what was checked, what was not checked,
and any remaining uncertainty. For environment or deployment work, verify the
branch, target environment, and relevant URL without exposing secret values.
