# Repository instructions for AI agents

This file contains repository instructions for AI coding agents and other
automated assistants working in this project. `CLAUDE.md` and `AGENTS.md` are
kept identical — edit both, or neither.

## Main technical instructions

Full coding standards, architecture, and conventions live in
`.github/copilot-instructions.md`. Read it before any non-trivial code change.

> Caveat: that file is partly out of date — it describes NextAuth,
> `app/_components/`, `app/_lib/`, `date-fns`, and heroicons, none of which
> exist here. When it conflicts with the repository, the repository wins.

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
