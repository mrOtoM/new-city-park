# Repository instructions for AI agents

This file is the single source of repository instructions for AI coding agents
and other automated assistants working in this project. `CLAUDE.md` only points
here — put every instruction in this file and never duplicate content there.

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

> Caveat: its tech-stack and project-structure sections were corrected, but its
> code examples still come from an unrelated cabins/bookings tutorial and show
> NextAuth, `app/_components/`, `app/_lib/`, `date-fns`, and heroicons, none of
> which exist here. Read those examples for style only. The four project
> overview documents above override its stale architecture and authentication
> examples, and where factual details conflict with the repository, the
> repository wins. Tracked as `ENG-002`.

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
- Plan `001` block `B1` (test foundation and pure role/capability contracts)
  is implemented: `npm test` runs Vitest over `tests/unit/`, and
  `lib/auth/roles.ts` plus `lib/auth/auth-result.ts` hold the pure contracts.
- Plan `001` block `B2` (three-role data model and registration invariant) is
  implemented and verified on the development database; the seven behavioral
  test cases and their results are recorded in
  `docs/plans/007-authorization-authentication-implementation-b2-plan.md`.
  `public.users.role` is constrained to `user`, `admin`, and `owner`, and the
  last owner cannot be demoted or deleted.
- Plan `001` block `B3` (auth DAL, request cache, route protection) is
  implemented; the record is in
  `docs/plans/008-authorization-authentication-implementation-b3-plan.md`.
  `lib/auth/dal.ts` is the only server entry point for auth state: `auth()` is
  request-cached and fail-closed, and `requireUser()`, `requireCapability()`,
  `requireAdmin()`, `requireOwner()`, and `authorizeRequest()` are the guards.
  Every page, Server Action, and Route Handler calls a guard itself; `proxy.ts`
  and route groups are routing conveniences, not the security boundary.
- Statistics are owner-only: `statistics:view` belongs to `owner`, not `admin`.
  An admin manages trainings and sees participants; only an owner sees the
  numbers. Check it with `requireCapability('statistics:view')`.
- Authorization is decided by capability, never by comparing the role string.
  Add an owner-only capability in `lib/auth/roles.ts` and check it with `can()`
  at the specific call site; do not reintroduce `role === 'admin'`.
- Redirect targets pass through `safeNextPath()` in `lib/auth/redirects.ts`.
- Plan `001` block `B4` (Supabase client boundaries) is implemented; the record
  is in `docs/plans/009-authorization-authentication-implementation-b4-plan.md`.
  `lib/supabase.ts` is gone. Use `lib/supabase/browser.ts` in Client Components,
  `lib/supabase/server.ts` for anything a signed-in user does, and
  `createSupabaseAdminClient()` from `lib/supabase/admin.ts` only after a
  capability check in the same function. The privileged client throws without
  its secret and never falls back to anon.
- `public.training_capacity` is the single source of truth for training
  occupancy. It bypasses RLS by design, so no column carrying personal data may
  ever be added to it. Supabase labels it `UNRESTRICTED` in the Table Editor;
  that is expected. Do not "fix" it by switching the view to
  `security_invoker = on` — RLS would then hide other users' registrations and
  every count would silently drop to the viewer's own. Access is limited by the
  grant instead: `authenticated` may select, `anon` may not.
- Plan `001` block `B5` (RLS, grants, column protection) is implemented; the
  record is in `docs/plans/010-authorization-authentication-implementation-b5-plan.md`.
  Database policies call `public.has_admin_capabilities()`; extend that function
  rather than inlining another role subquery. `public.users` no longer carries
  broad grants: `authenticated` has `SELECT` and `UPDATE ("phoneNumber")` only,
  and `anon` has nothing.
- Participant and statistics reads still use the service-role client even though
  the policies now allow the cookie-bound one. Moving them is a follow-up.
- Plan `001` block `B6` (calendar API, actions, atomic registration) is
  implemented; the record is in
  `docs/plans/011-authorization-authentication-implementation-b6-plan.md`.
  Registration and unregistration are database functions
  (`public.register_for_training`, `public.unregister_from_training`): they hold
  the capacity, start-time, and deadline rules, take the acting user from
  `auth.uid()`, and lock the training row so capacity cannot be exceeded. Do not
  reintroduce a read-then-write in TypeScript.
- Registration actions return `ActionResult` instead of throwing for expected
  failures, because production replaces a thrown message with an opaque digest.
  New actions follow that shape.
- `public.trainings` is no longer readable by `anon`, and `app/api/` no longer
  exists.
- Plan `001` block `B7` (auth flows) is implemented except for reading the
  Supabase rate-limit configuration; the record is in
  `docs/plans/012-authorization-authentication-implementation-b7-plan.md`.
  Auth failure copy lives in `lib/auth/messages.ts` and must never reveal
  whether an account exists. Redirect URLs come from `authCallbackUrl()` in
  `lib/site-url.ts`; never interpolate `NEXT_PUBLIC_SITE_URL` directly.
  The password rule lives once, in `services/validators/password.ts`.
- Plan `001` block `B8`: the audit and regression half is done and recorded in
  `docs/plans/013-authorization-authentication-implementation-b8-plan.md`. The
  service-role key is absent from both bundles, no regular-user path is
  privileged, and the full suite passes. Key rotation, the rate-limit reading,
  and the production release are owner-only and remain open.
- The production database is behind the code:
  `20260902073053_registration_rules.sql` must be applied there before the next
  deploy, or every registration will call a function that does not exist.

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

### Migration workflow

Migrations live in `supabase/migrations/` and are applied with the Supabase
CLI, which is a dev dependency. File names must keep the CLI's
`<timestamp>_name.sql` format; a file that does not match is silently ignored.

Create and apply:

```bash
npx supabase migration new <name>
npx supabase db push
```

`db push` applies only migrations not yet recorded in
`supabase_migrations.schema_migrations` on the target project.

One-time setup per machine, performed by a human because it needs credentials:

```bash
npx supabase login
npx supabase link --project-ref <ref>
```

The schema predates the CLI: `20260214140608_initial_setup.sql` was applied by
hand in the SQL Editor and is absent from the migration history. Before the
first `db push` against a project that already has that schema, mark it as
applied so the CLI does not re-run it:

```bash
npx supabase migration repair --status applied 20260214140608
```

Verify the linked project before every `db push`. The CLI applies to whichever
project is linked, and linking is machine-local state the repository cannot
see.

#### Production is applied by hand, not by the CLI

The CLI cannot reach the production project `uklqoodkivkwswnyksza`
(`new-city-park-production`, created 2025-08-29, Postgres 17.4.1.074). `link`
succeeds, but every command that opens a database connection fails while
creating the login role, including read-only ones such as `migration list` and
`db dump`:

```text
LegacyDbConfigLoginRoleStatusError: unexpected login role status 400:
Failed to create login role: ERROR: 42501: permission denied to alter role
DETAIL: Only roles with the CREATEROLE attribute and the ADMIN option on role
"cli_login_postgres" may alter this role.
```

The development project `bqefyxloqktstljbzbgu` (created 2026-08-10, Postgres
17.6.1.155) works with the same CLI version and the same login session, so this
is the older project's role configuration, not a local problem. The role does
not exist there, so it is not a leftover from a failed attempt. Fixing it needs
`supabase_admin`, which the project owner does not have; a support request is
open. Tracked as `ENG-010`.

Consequences, which every production change must respect:

- Production migrations are applied by pasting the migration file into the SQL
  Editor of the production project, in file order.
- Production has **no** `supabase_migrations.schema_migrations` history, so
  `migration list` cannot tell you what is applied there. Verify by querying
  for the objects a migration creates before and after running it.
- Never assume production and development are in sync. Verified in production
  on 2026-09-01: `20260214140608_initial_setup` and `20260831110000_three_role_model`
  are applied; `20260901073108_training_capacity_view` and
  `20260901080714_rls_admin_owner_and_grants` are not.
- This is why every migration must be safe to re-run.

### Migration style

- Write migration comments in English, unlike user-facing copy, which stays
  Slovak.
- Keep migrations clean. A short numbered section header is enough; do not
  narrate what a statement does when the SQL already says it.
- Comment only what the SQL cannot express: why a decision was made, a
  cross-block dependency, or a constraint that is deliberately not enforced
  here.
- Match the structure of `supabase/migrations/20260214140608_initial_setup.sql`.
- `supabase/migrations/20260831110000_three_role_model.sql` is over-commented
  and predates this rule. It is left as it is; do not use it as the style
  reference.

## Project conventions

- User-facing text and error messages are in Slovak.
- Code comments are in English everywhere, including TypeScript, TSX, SQL, and
  configuration files. Slovak stays in user-facing copy only.
- Comment only what the code cannot say: a non-obvious reason, an invariant, a
  workaround, or a cross-file dependency. Do not restate what the next line
  already shows, and do not add section banners to source files.
- Existing Slovak comments are rewritten when the surrounding code is touched;
  do not open a separate translation pass unless asked.
- A type or interface used by more than one module belongs in `lib/types.ts`,
  imported with `import type`. Do not redeclare the same shape in two files.
- Runtime modules do not declare their own types. `lib/auth/dal.ts` imports
  `Session`, `SessionUser`, `RequestAuthorization`, `UserProfileRow`, and
  `AuthUserMetadata` from `lib/types.ts`.
- The exception is a definition module, where the type is the deliverable:
  `lib/auth/roles.ts` owns `Role` and `Capability`, `lib/auth/auth-result.ts`
  owns `AuthResult`.
- Component prop interfaces stay in the component file; they are part of its
  signature, not shared vocabulary. Promote one to `lib/types.ts` as soon as a
  second file needs it.
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

`npm test` runs the unit suite: pure contracts and mocked clients, no network.

`npm run test:db` runs the integration suite in `tests/integration/` against the
development Supabase project. It creates and deletes real accounts, so it
refuses to start unless the active `NEXT_PUBLIC_SUPABASE_URL` matches the
project ref the Supabase CLI is linked to. Never point it at production.

A gap that a later block must close is marked with `it.fails`. Such a test is
green while the gap exists and turns red once the gap is closed, which is the
signal to convert it into an ordinary assertion.

Before handing off a change, report what was checked, what was not checked,
and any remaining uncertainty. For environment or deployment work, verify the
branch, target environment, and relevant URL without exposing secret values.
