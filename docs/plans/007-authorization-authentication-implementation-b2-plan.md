---
type: plan
owner: auth
updated: 2026-08-31
---

# Authorization Authentication Implementation Plan - B2

## Plan identity

- **Plan number:** `007`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B2`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** three-role data model and the registration invariant
- **Depends on:** `B1` (implemented, recorded in `002`)
- **Target environment:** development Supabase first; production requires a
  separate, deliberate release step

This document contains exactly one implementation block: `B2`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Make the three-role model explicit and enforced in the database, and prove that
every account-provisioning path can only produce `role = 'user'`. This block
closes the gap between the pure TypeScript contract delivered in `B1`
(`lib/auth/roles.ts`) and the actual `public.users.role` column, which today
accepts any text value.

This block does not change the DAL, route protection, Supabase client
boundaries, or RLS policy membership. Those belong to `B3`, `B4`, and `B5`.

## Verified repository baseline

Verified on branch `development` against
`supabase/migrations/20260214140608_initial_setup.sql` and the application source.

- `public.users.role` is declared `text NOT NULL DEFAULT 'user'`
  (`supabase/migrations/20260214140608_initial_setup.sql:14`). There is **no** `CHECK`
  constraint, so `owner`, `admin`, `superuser`, or any arbitrary string is
  storable. The database does not currently know the role vocabulary.
- `public.handle_new_user()` inserts a literal `'user'` into `role`
  (`supabase/migrations/20260214140608_initial_setup.sql:111-117`). The registration
  invariant is therefore already correct in intent, but the function is
  `SECURITY DEFINER` **without** `SET search_path`, and the invariant is not
  covered by any test.
- The trigger `on_auth_user_created` fires `AFTER INSERT ON auth.users`, so it
  covers email/password signup and OAuth signup identically. Both are the only
  provisioning paths in the application:
  `app/(public)/register/page.tsx:41` (`signUp`),
  `app/(public)/register/page.tsx:77` and `app/(public)/login/page.tsx:44`
  (`signInWithOAuth`).
- `signUp` passes client-controlled `options.data` (`first_name`, `last_name`,
  `phone_number`) into `raw_user_meta_data`. The trigger reads only those three
  keys and never reads a role key, but nothing in the database blocks a future
  edit from doing so.
- The RLS policy `Users can update own profile` uses
  `WITH CHECK (auth.uid() = id AND role = 'user')`
  (`supabase/migrations/20260214140608_initial_setup.sql:145-149`). This blocks
  self-escalation, but it also makes **every profile update by an `admin` or
  `owner` fail**, because the check evaluates their existing row role. This is a
  verified defect in the role model and is in scope for `B2`.
- Admin RLS policies match `u.role = 'admin'` only
  (`supabase/migrations/20260214140608_initial_setup.sql:163-190`), so an `owner` would
  have fewer database rights than an `admin`. Fixing policy membership is `B5`
  scope; `B2` only records the dependency so `B5` cannot forget it.
- `lib/auth/roles.ts` already defines `ROLES`, `parseRole`, `Capability`, and
  `can`, and deliberately excludes `role:assign` from every role. `B2` must not
  weaken that.
- `lib/auth/dal.ts:26` still falls back to `profile?.role || 'user'`. Replacing
  that with fail-closed `parseRole` is `B3` scope, not `B2`.
- There is no application code path that writes `public.users.role`. Verified by
  search across `services/`, `app/`, and `lib/`.
- No `owner` account exists and there is no last-owner protection.

## Scope

### Role vocabulary in the database

- Add a `CHECK` constraint restricting `public.users.role` to exactly
  `user`, `admin`, `owner`.
- Inspect existing `role` values **before** adding the constraint; the migration
  must fail loudly on unexpected values rather than coerce them.
- Keep `NOT NULL DEFAULT 'user'`.
- The constraint must be named explicitly so later migrations can reference it.

### Registration invariant

- Keep the literal `'user'` in `public.handle_new_user()`; make it non-derivable
  from `NEW.raw_user_meta_data` by construction and add a comment saying so.
- Harden the function with `SET search_path = public, pg_temp`, which is
  required for a `SECURITY DEFINER` function.
- Confirm the trigger covers every provisioning path: email/password signup,
  Google OAuth signup, identity linking, and admin-created accounts. Record the
  result; do not assume.
- Prove by test that role keys injected into signup metadata are ignored.

### Profile-update defect

- Replace the `WITH CHECK (auth.uid() = id AND role = 'user')` predicate with
  one that forbids *changing* the role instead of requiring a specific role. The
  intended shape, to be confirmed against the live schema before writing:

  ```sql
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT u.role FROM public.users u WHERE u.id = auth.uid())
  )
  ```

- A policy predicate is not a substitute for removing the table-level `UPDATE`
  privilege on `role`. That grant work stays in `B5`; this change only removes
  the defect that admins and owners cannot update their own profile.

### Manual promotion procedure

- Document the authorized manual SQL promotion and demotion operations in
  `docs/02-authentication-authorization-overview.md`.
- The procedure must state: verify the active Supabase URL first, run in the
  verified environment only, and record who ran it and why.
- No application surface — no UI, Server Action, Route Handler, or RPC — may be
  added. Verify by search that none exists after the change.

### Last-owner invariant

- Add a database-level guard preventing the last `owner` row from being demoted
  or deleted.
- Prefer a `BEFORE UPDATE OR DELETE` trigger on `public.users`; a `CHECK`
  constraint cannot express a cross-row invariant.
- The guard must raise a clear error, not silently no-op.

### Application role types

- No new TypeScript role type is required; `lib/auth/roles.ts` from `B1` is the
  single source of truth.
- Add unit tests asserting that the database vocabulary and `ROLES` agree, so a
  future divergence fails the suite.

## Test cases

Unit (`tests/unit/`, no database):

- `parseRole` rejects every value outside the constraint vocabulary.
- The role vocabulary asserted by the migration equals `ROLES`.
- No exported function in `lib/auth/` can produce a role from arbitrary input.

Development-database integration (development Supabase only):

- Inserting `role = 'superuser'` into `public.users` is rejected by the
  constraint.
- Email/password signup produces `role = 'user'`.
- Google OAuth signup produces `role = 'user'`.
- Signup with injected metadata (`role`, `app_role`, `is_admin`, and a role
  claim in `options.data`) still produces `role = 'user'`.
- An `authenticated` user cannot update their own `role` via the Data API.
- An `admin` can update their own `phoneNumber` — the regression case for the
  profile-update defect above.
- An `owner` can update their own `phoneNumber`.
- Manual SQL promotion `user` → `admin` → `owner` succeeds and demotion works.
- Demoting or deleting the only remaining `owner` fails with the guard error.
- Demoting one of two owners succeeds.

## Implementation sequence

1. Verify the active branch is `development` and the active Supabase URL is the
   development project. Do not proceed otherwise.
2. Inspect the live `public.users` schema, existing `role` values, current
   grants on the table, and the current definition of `handle_new_user()`.
   Record any drift from `20260214140608_initial_setup.sql`.
3. Write a new migration under `supabase/migrations/` containing, in order: the
   value audit, the `CHECK` constraint, the hardened trigger function, the
   corrected profile-update policy, and the last-owner guard.
4. Apply the migration to development only.
5. Run the integration test cases above against development.
6. Add the unit tests and run `npm test`.
7. Document the manual promotion procedure in overview `02`.
8. Update the `B2` status line in `001` and in `AGENTS.md`.
9. Record what was checked, what was not, and remaining uncertainty.

## Implementation record

Branch `Auth-b2-three-role-model`, created from `development` on 2026-08-31.

Repository work — done:

- `supabase/migrations/20260831110000_three_role_model.sql` contains all five database
  changes in one re-runnable script, matching the manual SQL Editor workflow
  established by `20260214140608_initial_setup.sql`.
- `tests/unit/auth/role-vocabulary.test.ts` asserts that the migration's
  `users_role_allowed_values` vocabulary equals `ROLES`, that the provisioning
  literal `'user'` is present, that no role is derived from
  `raw_user_meta_data` or `raw_app_meta_data`, and that every
  `SECURITY DEFINER` function in the migration sets `search_path`.
- The manual promotion and demotion procedure is documented in
  `../02-authentication-authorization-overview.md` under
  `Roles and provisioning invariant`.
- Verified by search that no application path writes `public.users.role`. The
  only write to `public.users` is `updateUserPhone` in
  `services/queries/users.ts:26`, which updates `phoneNumber` only.

Repository work — verification status:

- `npm test` passes: 105 tests, 4 files.
- `npm run build` succeeds.
- `npm run lint` is broken independently of this block; already recorded as
  `ENG-001` in `../04-engineering-quality-overview.md`. Not re-recorded here.

Tooling change made during this block, on request:

- The Supabase CLI is now a dev dependency and `supabase/config.toml` exists,
  so migrations are applied with `npx supabase db push` instead of a manual
  paste. The workflow, including the one-time `migration repair` for the
  pre-CLI schema, is documented in `AGENTS.md`.
- Migration files were renamed to the CLI's required `<timestamp>_name.sql`
  format: `20260214140608_initial_setup.sql` (timestamp taken from the commit
  that added the file) and `20260831110000_three_role_model.sql`.
- `supabase/config.toml` was generated with `db.major_version = 17`, which
  matches the remote project's reported `17.6.1.155`.

Database work — applied:

- `npx supabase migration repair --status applied 20260214140608` recorded the
  pre-CLI schema, then `npx supabase db push` applied
  `20260831110000_three_role_model.sql` to `new-city-park-development`.
- Before repairing, the live `public` schema was dumped and compared against
  `20260214140608_initial_setup.sql`. They matched, including the absent CHECK
  constraint, the missing `search_path`, and the defective profile-update
  policy. The migration therefore ran against the schema it was written for.
- The applied result was verified from a second dump: the CHECK constraint, the
  `search_path` on both `SECURITY DEFINER` functions, the corrected policy
  predicate, and `enforce_last_owner_trigger` are all present.
- A data-only dump was taken first and kept outside version control in
  `backups/`, which is git-ignored because it contains personal data.

Verified live finding for `B5`: `public.users` carries `GRANT ALL` for both
`anon` and `authenticated`. RLS is currently the only control preventing
cross-user reads at the Data API.

Deviation from block scope, made deliberately:

- Promoting the only `admin` to `owner` broke the application, because seven
  server-side checks compared `role !== 'admin'` literally. They now call
  `hasAdminCapabilities()` from `lib/auth/roles.ts`, so `admin` and `owner`
  have identical rights. This is `B3` work done early; it was not optional,
  because the alternative was leaving administration unreachable. The last-owner
  guard also prevents demoting that account back, so reverting was not
  available.
- Affected files: `app/(protected)/statistics/page.tsx`,
  `app/(protected)/trainings/page.tsx`,
  `app/(protected)/trainings/new/page.tsx`,
  `app/(protected)/trainings/[id]/edit/page.tsx`,
  `services/actions/trainings.ts`, `services/actions/registrations.ts`.

Database work — not done:

Database work — behavioral tests, all passed on 2026-08-31 against
`new-city-park-development`:

| Case                                            | Result |
| ----------------------------------------------- | ------ |
| CHECK rejects an invalid role                    | PASS   |
| The last owner cannot be demoted                 | PASS   |
| The last owner cannot be deleted                 | PASS   |
| A user cannot change their own role via the Data API | PASS |
| An owner can update their own `phoneNumber`      | PASS   |
| Provisioning ignores a role injected into metadata | PASS |
| Demoting one of two owners succeeds              | PASS   |

Each test undid its own effect through a raised `B2_UNDO` exception, so no test
left a row behind. Promoting an account to `owner` beforehand had already shown
that the constraint accepts the extended vocabulary.

The metadata-injection case inserted directly into `auth.users` with
`{"role":"owner","app_role":"admin","is_admin":true}` in `raw_user_meta_data`.
The trigger is the single enforcement point for both email/password and OAuth
signup, because it fires `AFTER INSERT ON auth.users`; the case therefore
covers both provisioning paths without creating real accounts.

Not covered: an end-to-end signup through the application UI. The database
invariant is proven, the HTTP path is not.

The development database holds one `owner` and one `user`, and no `admin`. The
profile-update regression was therefore run against the `owner` account, which
exercises the same corrected predicate.

Note for `B4`: `updateUserPhone` currently uses the service-role client, which
bypasses RLS. The profile-update defect fixed in step 4 of the migration is
therefore latent today and becomes load-bearing the moment that call moves to
the cookie-bound SSR client.

## Verification and acceptance

`B2` is complete only when all of the following hold:

- Every new account, from every provisioning path, has `role = 'user'`.
- `public.users.role` cannot hold a value outside `user`, `admin`, `owner`.
- Only an authorized manual database operation can create `admin` or `owner`.
- No application surface can change `public.users.role`; verified by search.
- An `admin` and an `owner` can update their own editable profile fields.
- The last `owner` cannot be demoted or deleted.
- `npm test` passes and the build/lint status is recorded.

## Deployment and rollback

- Development only. Production release is deferred to `B8`.
- No rollback file is kept. A rollback is three statements written ad hoc when
  actually needed: drop `enforce_last_owner_trigger` and its function, drop the
  `users_role_allowed_values` constraint, and restore the previous
  `Users can update own profile` predicate. Restoring that predicate reinstates
  the defect this block fixes, so it is a last resort, not a routine step.
- The trigger's literal `'user'` must never be rolled back.
- The migration must be re-runnable: guard every object with `IF NOT EXISTS` /
  `DROP ... IF EXISTS` in line with `20260214140608_initial_setup.sql`.

## Explicit testing decision

Integration tests here require a real database and are therefore run against the
development Supabase project, not mocked. Unit tests remain database-free. No
test may run against production.

## Out of scope

Deferred to their owning blocks; do not implement them here:

- Fail-closed role parsing in `lib/auth/dal.ts` and
  `requireUser` / `requireAdmin` / `requireOwner` — `B3`.
- Removing the anon singleton and the silent service-role → anon fallback in
  `lib/supabase.ts:14` — `B4`.
- Extending admin RLS policies to include `owner`, and column-level grants on
  `public.users` — `B5`. `B5` must not be started before the `owner` gap in the
  admin policies is addressed there.
