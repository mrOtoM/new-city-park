---
type: plan
owner: auth
updated: 2026-09-01
---

# Authorization Authentication Implementation Plan - B4

## Plan identity

- **Plan number:** `009`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B4`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** Supabase client boundaries and service-role removal
- **Depends on:** `B1` (`002`), `B2` (`007`), `B3` (`008`)
- **Target environment:** development Supabase first; production requires a
  separate, deliberate release step

This document contains exactly one implementation block: `B4`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Remove privileged database access from regular-user data paths. After this
block, a request made by a regular user reaches PostgreSQL with that user's
auth context, so RLS applies. Service-role access survives only where an
explicit capability check has already run, and the privileged client fails
closed when its secret is missing instead of silently degrading to anon.

## The ordering problem, and how this block handles it

The master plan orders `B4` before `B5`. The `B2` implementation record and
`AGENTS.md` state the opposite constraint: database admin policies still match
`role = 'admin'` only, and there is **no** policy at all letting an admin read
other users' rows. So a naive "move everything to the cookie-bound client" would
break admin features and would give an `owner` fewer rights than an `admin`.

This block resolves the conflict by splitting the work at the RLS line rather
than by reordering the blocks:

- **Moves now:** every path RLS already supports for the acting user.
- **Stays privileged now:** admin reads that cross user rows, each one gaining
  its own capability check inside the function, plus a `B5` marker.
- **Blocked until `B5`:** nothing in this block waits on `B5`; the paths that
  need new policies keep working exactly as they do today, only better guarded.

`B5` then extends the policies, and the remaining moves happen there or in a
follow-up. No block leaves the application in a state where an admin or owner
loses access.

## Verified repository baseline

Verified on 2026-09-01 against branch `Auth-b3-dal-route-protection`.

### Clients

- `lib/supabase.ts` exports two clients:
  - `supabase` — a cookie-less anon singleton created at module load;
  - `supabaseAdmin` — a service-role client that **falls back to the anon
    singleton** when `SUPABASE_SERVICE_ROLE_KEY` is absent
    (`lib/supabase.ts:14`). A missing secret therefore degrades silently
    instead of failing.
- `lib/supabase/server.ts` is the cookie-bound SSR client. It is used by
  `lib/auth/dal.ts`, `services/actions/users.ts` (`signOutAction`), and parts of
  `services/queries/registrations.ts`.
- `lib/supabase/browser.ts` is the browser client used by the auth pages.
- `lib/supabase/admin.ts` and `lib/supabase/session.ts` from the target
  architecture do not exist yet.
- The `server-only` package is **not** a dependency.

### Consumers of the anon singleton

| Call site                                             | Data                       | Note                    |
| ----------------------------------------------------- | -------------------------- | ----------------------- |
| `services/queries/trainings.ts` `getTrainings`        | training list              | regular-user path       |
| `services/queries/trainings.ts` `getTraining`         | one training               | regular-user path       |
| `services/queries/users.ts` `getUserByAuthId`         | full `users` row (`*`)     | **no caller in the repository** |
| `services/queries/users.ts` `getUser`                 | full `users` row (`*`)     | **no caller in the repository** |

### Consumers of the service-role client

| Call site                                                         | Acting role      | RLS support today                                  |
| ------------------------------------------------------------------ | ---------------- | -------------------------------------------------- |
| `services/actions/trainings.ts` insert / update / delete           | admin, owner     | policies exist but match `'admin'` only → `B5`     |
| `services/queries/registrations.ts` `getTrainingParticipants`      | admin, owner     | joins `users`; **no cross-user SELECT policy** → `B5` |
| `services/queries/statistics.ts` `getStatisticsData`               | admin, owner     | joins `users`; same gap → `B5`                     |
| `services/queries/registrations.ts` `removeParticipantByAdmin`     | admin, owner     | no admin UPDATE policy on registrations → `B5`     |
| `services/queries/registrations.ts` `getRegistrationCounts`        | **every user**   | counts rows the caller may not see → needs an aggregate source |
| `services/queries/registrations.ts` capacity read inside `registerForTraining` | **every user** | same problem, plus `B6` owns the atomicity fix     |
| `services/queries/users.ts` `updateUserPhone`                      | the user itself  | own-row UPDATE policy exists and was fixed in `B2` |

### Database facts that constrain the block

- `public.users` policies allow `SELECT` and `UPDATE` on **own row only**. The
  `Admin can view all users` policy was explicitly dropped in
  `20260214140608_initial_setup.sql:141`.
- `public.trainings` allows `SELECT` to `authenticated` and, separately, to
  `anon`; write policies match `role = 'admin'` literally.
- `public.training_registrations` allows a user to see, insert, and update
  their own rows; the admin SELECT policy matches `'admin'` literally and there
  is no admin UPDATE policy.
- `public.users` carries `GRANT ALL` for `anon` and `authenticated`, recorded
  during `B2`. RLS is currently the only control at the Data API.

## Scope

### Client modules

- Add `lib/supabase/admin.ts`: a `server-only` privileged client that throws
  when `SUPABASE_SERVICE_ROLE_KEY` is missing. No anon fallback, no default
  export that can be imported by accident.
- Delete `lib/supabase.ts` once every consumer is migrated. The cookie-less anon
  singleton must not survive the block in any form.
- `server-only` is added as a dependency; the approval is recorded under
  Decisions below.

### Regular-user paths that move to the cookie-bound client

- `getTrainings` and `getTraining`.
- `updateUserPhone`.
- The parts of `registerForTraining` that read or write the caller's own rows.

### Admin paths that stay privileged and gain their own check

Each of these calls the `B3` guard itself instead of trusting the calling page:

- `getTrainingParticipants`
- `getStatisticsData`
- `removeParticipantByAdmin`
- the three training write operations in `services/actions/trainings.ts`

The guard must be the capability check, not a role comparison. A privileged
function that cannot prove the caller's capability must fail, not proceed.

### Registration counts

`getRegistrationCounts` is the one regular-user path that genuinely cannot be
served by RLS today: it aggregates rows the caller is not allowed to read.

**Decided:** a view, `public.training_capacity`, created with
`security_invoker = off` and exposing `training_id`, the active registration
count, and `maxParticipants` — nothing else. `SELECT` is granted to
`authenticated` only.

Rationale:

- Counting through the cookie-bound client would return a **silently wrong**
  number, because RLS hides other users' registrations. Not an error, not an
  empty page — a wrong number nobody reports.
- "How many people are on a training" currently exists in three places:
  `getRegistrationCounts`, the capacity check inside `registerForTraining`, and
  the statistics aggregation. The view makes it one definition that all three
  read.
- `B6` needs an atomic capacity check; that function reads this view instead of
  restating the rule.

The view bypasses RLS by design, so one rule binds it permanently: **no column
carrying personal data may ever be added to it.** That constraint belongs in the
migration as a comment, not only here.

### Decisions recorded before implementation

- **`server-only` is approved as a dependency.** It is the only mechanism that
  turns "a privileged client was imported into a Client Component" into a build
  error rather than a runtime incident. The runtime alternative (`typeof window`
  guard) fires only when the code actually executes.
- **`getUserByAuthId` and `getUser` in `services/queries/users.ts` are
  deleted.** Both are `select('*')` over `public.users` through the anon
  singleton and have no caller. Left in place, they are what the next person
  reaches for, bypassing the DAL.

### Cross-block constraint for B6

`app/api/calendar/route.ts` calls `getTrainings()` with no session. After the
move to the cookie-bound client it keeps working, because
`20260214140608_initial_setup.sql` still carries the `Anon can view trainings`
policy. `B6` removes that policy — so `B6` must require authentication on that
route **in the same change** that drops the policy. Doing it in the other order
breaks the endpoint silently.

### Import inventory

Produce and record a full inventory proving:

- no Client Component imports a privileged client, directly or transitively;
- `SUPABASE_SERVICE_ROLE_KEY` appears in no `NEXT_PUBLIC_*` variable and in no
  browser bundle;
- every remaining privileged call site sits behind a capability check.

## Out of scope

- Extending admin policies to `owner`, column grants, and revoking `GRANT ALL`
  on `public.users` — `B5`.
- Atomic registration capacity and the `/api/calendar` authentication — `B6`.
- Rate limiting and auth-flow hardening — `B7`.
- Legacy key migration to publishable/secret keys — `B8`.

## Test cases

Unit (`tests/unit/`, no database):

1. The privileged client throws when `SUPABASE_SERVICE_ROLE_KEY` is missing and
   never returns an anon client.
2. The privileged client is not constructed at module import time in a way that
   breaks a build without the secret.
3. Each admin-only query rejects a caller without the capability, with the page
   check removed from the picture.
4. A regular-user query builds no privileged client.

Development-database integration (development Supabase only):

5. A `user` reads the training list through the cookie-bound client and gets the
   same rows as before.
6. A `user` updates their own `phoneNumber` through the cookie-bound client.
7. A `user` cannot read another user's profile or registrations through any
   application path.
8. An `admin` and an `owner` still see participants and statistics.
9. Registration counts are correct for a `user` who is registered for none, one,
   and several trainings.
10. With `SUPABASE_SERVICE_ROLE_KEY` unset, regular-user pages still work and
    admin pages fail loudly rather than silently returning anon-visible data.

## Implementation sequence

1. Verify the branch and that the linked Supabase project is development.
2. Add `server-only` (approved) and confirm the linked Supabase project is
   development before any `db push`.
3. Add `lib/supabase/admin.ts` and its fail-closed test.
4. Delete the two dead functions in `services/queries/users.ts`.
5. Move the regular-user reads and writes to the cookie-bound client.
6. Add the capability check inside each function that stays privileged.
7. Implement the registration-counts decision, with a migration if option 1 or
   2 is chosen.
8. Delete `lib/supabase.ts` and run the import inventory.
9. Run `npm test`, `npx tsc --noEmit`, `npx prettier --check`, and
   `npm run build`; then the development integration cases.
10. Update `001`, `AGENTS.md`, and `AUTH-004` in overview `02`.

## Verification and acceptance

`B4` is complete only when all of the following hold:

- no regular-user path uses a service-role or secret-key client;
- the cookie-less anon singleton no longer exists;
- the privileged client fails closed on a missing secret;
- every remaining privileged function verifies the caller's capability itself;
- an `admin` and an `owner` keep every ability they had before the block;
- a regular user cannot reach another user's data through any application path;
- `npm test`, `tsc`, and the production build pass, and the development
  integration cases are recorded with their results.

## Deployment and rollback

- Development first. Production release stays deferred to `B8`.
- If the registration-counts migration is written, its rollback is a single
  `DROP FUNCTION` / `DROP VIEW`; it grants nothing that needs revoking.
- Application rollback is a branch revert. Reverting restores service-role
  access on regular-user paths, so it is a stopgap, not a resting state.

## Implementation record

Branch `Auth-b4-client-boundaries`, created from `development` on 2026-09-01.

Delivered:

- `lib/supabase/admin.ts` — `createSupabaseAdminClient()`, imported through
  `server-only`, throwing on a missing URL or `SUPABASE_SERVICE_ROLE_KEY`. The
  client is built per call, so importing the module without the secret does not
  break a build; only using it fails.
- `lib/supabase.ts` deleted. The cookie-less anon singleton no longer exists.
- `supabase/migrations/20260901073108_training_capacity_view.sql` — the
  `public.training_capacity` view, `SELECT` granted to `authenticated`, revoked
  from `anon`.
- Moved to the cookie-bound client: `getTrainings`, `getTraining`,
  `updateUserPhone`, the capacity read inside `registerForTraining`, and
  `getRegistrationCounts`.
- `getTrainingParticipants`, `getStatisticsData`, and `removeParticipantByAdmin`
  now call `requireCapability()` themselves before building the privileged
  client — `participants:view`, `statistics:view`, and `training:manage`
  respectively. The three training writes in `services/actions/trainings.ts`
  keep `requireAdmin()` at the action boundary and build the client per call.
- `getUserByAuthId` and `getUser` deleted from `services/queries/users.ts`.
- `tests/unit/supabase/admin-client.test.ts` covers the fail-closed cases.

Verification performed:

| Check                                                       | Result                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------ |
| `npm test`                                                  | 7 files, 159 tests passed (was 6 files, 155)                      |
| `npx tsc --noEmit`                                          | Passed                                                            |
| `npx prettier --check`                                      | Passed for every touched file                                     |
| `npm run build`                                             | Passed; route table unchanged                                     |
| `npx supabase db push`                                      | Applied to `bqefyx…`, the development project linked in `supabase/.temp` |
| View correctness against the development database           | 12 trainings, 0 mismatches versus a direct count of active rows   |
| `anon` reading `public.training_capacity`                   | Denied, PostgreSQL `42501`                                        |
| Client-component import inventory                           | Only `lib/supabase/browser.ts` is reachable from a Client Component; Server Actions cross the boundary as references, which the build confirms |
| ESLint                                                      | Not run: pre-existing `ENG-001` breakage                          |

Not covered:

- Reading `training_capacity` as a real `authenticated` user was not executed;
  it needs a live session and the grant was verified from the `anon` and
  service-role sides only. Clicking through the app covers it.
- `services/queries/statistics.ts` still aggregates active and cancelled counts
  in JavaScript from rows it already holds. The view exposes only the active
  count, so it has two consumers, not three. Unifying the statistics
  aggregation was not attempted; the numbers there come from the same rows, not
  from a second definition of the rule.
- `lib/supabase/session.ts` from the target architecture still does not exist;
  `proxy.ts` builds its client inline. No behavior depends on it.
- Admin data paths remain on the service role. `B5` extends the policies; only
  then can they move.

## Explicit testing decision

Client-boundary behavior is unit-tested with mocked environments, because the
interesting case is a missing secret. Everything that depends on RLS is tested
against the development database with real user, admin, and owner identities;
mocking RLS would prove nothing. No test runs against production.
