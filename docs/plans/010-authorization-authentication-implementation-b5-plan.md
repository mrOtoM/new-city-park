---
type: plan
owner: auth
updated: 2026-09-01
---

# Authorization Authentication Implementation Plan - B5

## Plan identity

- **Plan number:** `010`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B5`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** RLS, grants, column protection, and ownership enforcement
- **Depends on:** `B1` (`002`), `B2` (`007`), `B3` (`008`), `B4` (`009`)
- **Target environment:** development Supabase first; production requires a
  separate, deliberate release step

This document contains exactly one implementation block: `B5`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Make PostgreSQL enforce the role model on its own, so a bypassed application,
a leaked anon key, or a forgotten check in a future feature still cannot read
or change what it must not. Today RLS is the only control on `public.users`
and it does not know that `owner` exists.

## Product decision folded into this block

Statistics are **owner-only**. An `admin` manages trainings and sees
participants; only an `owner` sees the numbers. `statistics:view` moved from the
admin group to the owner group in `lib/auth/roles.ts`, the statistics page now
calls `requireCapability('statistics:view')`, and the navigation link is
filtered by the same capability.

This is an application-level capability. The database does not model
"statistics" as a privilege, because the statistics query reads the same rows
that `participants:view` already covers. The distinction lives where the
capability lives.

## Verified repository baseline

Verified on 2026-09-01 on branch `development`, after `B4`.

- `public.users` carries `GRANT ALL` for `anon` and `authenticated`. RLS is the
  only thing preventing cross-user reads and column changes at the Data API.
- There is no policy letting an `admin` or `owner` read another user's row; the
  original one was dropped in `20260214140608_initial_setup.sql:141`.
- Write policies on `public.trainings` and the admin SELECT policy on
  `public.training_registrations` match `u.role = 'admin'` literally, so an
  `owner` has fewer database rights than an `admin`.
- There is no admin/owner UPDATE policy on `public.training_registrations`,
  which is why `removeParticipantByAdmin` runs on the service role.
- `Users can update own profile` pins the role with a subquery over
  `public.users` (added in `B2`) and works today.
- The integration suite (`npm run test:db`) records the gaps as four `it.fails`
  tests in `tests/integration/b5-gaps.test.ts`.

## Scope

### A definer helper instead of repeated subqueries

Every policy that needs "is this caller an admin or owner" currently inlines a
subquery over `public.users`. A policy **on** `public.users` cannot do that
without recursing, so this block adds one `SECURITY DEFINER` function that
reads the role with RLS bypassed, and every policy calls it:

```sql
public.has_admin_capabilities() returns boolean
```

It is `STABLE`, sets `search_path`, and grants `EXECUTE` to `authenticated`
only. One definition, one place to change when the role model changes.

### Policy membership

- Training insert/update/delete: admin **and** owner.
- Registration select and a new registration update: admin **and** owner.
- A new select policy on `public.users` for admin and owner.

### Grants and column protection

- `REVOKE ALL ON public.users FROM anon` — an anonymous caller has no business
  with the profile table at all.
- `REVOKE ALL ON public.users FROM authenticated`, then grant back exactly:
  `SELECT` (RLS narrows the rows) and `UPDATE ("phoneNumber")`.
- After this, changing `email`, `id`, or `role` fails at the grant level with
  `42501`, before any policy is consulted.

## Out of scope

- Moving participant and statistics reads off the service-role client. The
  policies added here make it possible; the move itself is a follow-up, so this
  block changes one thing at a time.
- `/api/calendar`, the `Anon can view trainings` policy, and atomic capacity —
  `B6`.
- Rate limiting and auth-flow hardening — `B7`.

## Test cases

The four `it.fails` markers in `tests/integration/b5-gaps.test.ts` become
ordinary assertions:

1. an `owner` creates a training through their own session;
2. an `admin` reads another user's profile row;
3. an `owner` sees another user's registrations;
4. a user cannot change their own `email` column.

Added in this block:

5. `anon` cannot read `public.users` at all;
6. a user still updates their own `phoneNumber`;
7. a user still reads their own profile;
8. an `admin` and an `owner` both create, update, and delete a training;
9. a user cannot read another user's profile — the existing regression case
   must keep passing after the new admin policy is added.

The full suite must end at 20 passing tests and zero expected failures.

## Implementation sequence

1. Verify the branch and that the linked project is development.
2. Write the migration: helper function, policy membership, users select policy,
   revokes, column grants.
3. Apply to development with `npx supabase db push`.
4. Flip the four `it.fails` tests and add the new cases.
5. Run `npm run test:db`, `npm test`, `tsc`, `prettier`, and the build.
6. Update `001`, `AGENTS.md`, and `AUTH-005` in overview `02`.

## Verification and acceptance

`B5` is complete only when:

- `npm run test:db` is fully green with no expected failures;
- `admin` and `owner` have identical database rights except where a capability
  says otherwise;
- `public.users.role`, `id`, and `email` cannot be changed by an authenticated
  caller through the Data API, at the grant level;
- `anon` has no privilege on `public.users`;
- the application still works for user, admin, and owner.

## Deployment and rollback

Development only; production stays deferred to `B8`. Rollback is the inverse
migration: restore the broad grants and drop the new policies and the helper
function. Restoring `GRANT ALL` reinstates the hole this block closes, so it is
a last resort.

## Implementation record

Branch `Auth-b5-database-tests`, continued from the integration-suite commit on
2026-09-01.

Delivered:

- `supabase/migrations/20260901080714_rls_admin_owner_and_grants.sql`:
  `public.has_admin_capabilities()` as a `STABLE SECURITY DEFINER` function with
  `search_path` and `EXECUTE` granted to `authenticated` only; training
  insert/update/delete, registration select, and a new registration update
  policy all delegating to it; a new `Admin can view all users` select policy;
  `REVOKE ALL` on `public.users` from `anon` and `authenticated`, followed by
  `GRANT SELECT` and `GRANT UPDATE ("phoneNumber")` to `authenticated`.
- `statistics:view` moved to the owner group in `lib/auth/roles.ts`; the
  statistics page calls `requireCapability('statistics:view')` and the
  navigation link is filtered by the same capability instead of an `adminOnly`
  flag.
- `tests/integration/b5-gaps.test.ts` replaced by
  `tests/integration/rls.test.ts` with real assertions.

Verification performed:

| Check                                   | Result                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `npm run test:db` before the migration   | 16 passed, 4 expected failures                                 |
| `npm run test:db` after the migration    | The 4 markers inverted, proving the migration changed behavior |
| `npm run test:db` after flipping them    | **27 passed, 0 expected failures**                             |
| `npm test`                               | 159 passed                                                     |
| `npx tsc --noEmit`, `npm run build`      | Passed                                                         |
| `npx supabase db push`                   | Applied to the linked development project                      |
| Development database left clean          | No test accounts; one training left by the pre-flip run was removed by hand |

Not done, deliberately:

- Participant and statistics reads still use the service-role client. The
  policies now allow the cookie-bound client to serve them, but moving the
  calls is a separate change, so this block alters one layer at a time.
- `services/queries/statistics.ts` guards with `statistics:view`, which is now
  owner-only. An `admin` opening `/statistics` is redirected to `/calendar`.

## Explicit testing decision

Every claim in this block is about PostgreSQL behavior, so every test runs
against the development database through real sessions. A mock cannot prove a
grant.
