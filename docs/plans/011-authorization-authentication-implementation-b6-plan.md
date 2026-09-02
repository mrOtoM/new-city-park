---
type: plan
owner: auth
updated: 2026-09-02
---

# Authorization Authentication Implementation Plan - B6

## Plan identity

- **Plan number:** `011`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B6`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** calendar API, Server Actions, and atomic registration
- **Depends on:** `B3` (`008`), `B4` (`009`), `B5` (`010`)
- **Target environment:** development Supabase first; production requires a
  separate, deliberate release step

This document contains exactly one implementation block: `B6`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Close the two entry points that are still open to anyone, and remove the race
that lets a training exceed its capacity. After this block, every callable
surface either requires a session or is a reviewed public contract, and the
capacity rule is enforced by PostgreSQL in one statement rather than by a read
followed by a write.

## Verified repository baseline

Verified on 2026-09-02 on branch `development`, after `B5`.

### The calendar API has no caller

`app/api/calendar/route.ts` returns every training to anyone, with no session
check. A search across the repository finds **no consumer**: the only matches
are Next.js generated type files under `.next/`. The Calendar component
receives its data as props from the server page, not from this route.

So the first decision of this block is not "how do we protect it" but "does it
exist for a reason". See Decisions below.

### The anon policy is what actually makes trainings public

`20260214140608_initial_setup.sql` carries `Anon can view trainings`, a
`SELECT` policy `TO anon USING (true)`. It is active in development and in
production, verified there on 2026-09-01 by reading `public.trainings` with the
anon key.

No public page uses it: `app/(public)/page.tsx` and `app/page.tsx` are eight
and seven lines and read nothing from the database. The policy predates the
current structure and now serves only the unauthenticated API route.

### Registration is a read followed by a write

`services/queries/registrations.ts` `registerForTraining`:

1. reads the caller's existing registration;
2. reads `training_capacity` for the limit and the current count;
3. inserts, or reactivates a cancelled row.

Two callers passing step 2 at the same time both insert. `UNIQUE (training_id,
user_id)` stops a person registering twice, but nothing stops the eleventh
person joining a training capped at ten. The window is small and real.

The training's own datetime is never checked. `registerForTrainingAction`
accepts any id, including a training that already happened; only the UI filters
those. Recorded as part of `AUTH-006`.

### Expected failures are thrown, not returned

Every Server Action signals an expected failure with `throw new Error('...')`
carrying Slovak text. `components/trainings/TrainingList.tsx` catches it and
renders `error.message`.

This works in development and **fails in production**: React replaces Server
Action errors with an opaque digest, so the user sees a generic message instead
of "Tréning je už plne obsadený". Recorded as `ENG-005`.

`unregisterFromTrainingAction` enforces the unregister deadline in JavaScript
only; the database does not know the rule.

## Decisions to make before implementation

**1. Does `/api/calendar` stay?**

- **Delete it.** Nothing calls it, and an endpoint with no caller is a surface
  with no owner. This is the recommendation.
- **Keep it, authenticated.** Only if something outside this repository fetches
  it — a public website widget, an automation, a phone shortcut. Then it needs
  `authorizeRequest()`, a minimum DTO, and a note in overview `02` saying what
  consumes it.
- **Keep it public, deliberately.** Only with an explicit product decision that
  the schedule is public data. Then the anon policy stays and is documented as
  intentional rather than accidental.

The block cannot proceed without this answer, because the anon policy removal
depends on it.

**2. Where does the capacity rule live?**

Recommended: a `SECURITY DEFINER` function `public.register_for_training`,
which locks the training row, applies every rule, and inserts in one
transaction. Rules it owns: the training exists, it has not started, capacity
is not exceeded, and the caller is not already registered. It derives the user
from `auth.uid()` and never from a parameter.

The alternative — keeping the logic in TypeScript and adding a constraint — is
not workable, because "count of active registrations" is not expressible as a
table constraint.

## Scope

### Calendar API

Per decision 1. If it stays: `authorizeRequest()` first, `401` for anonymous,
an explicit DTO instead of the current row shape, and no `select('*')` anywhere
in the path.

### Anon access to trainings

Remove `Anon can view trainings` unless decision 1 keeps a public contract.
This is a migration, and it is the change that makes the schedule non-public;
removing the route alone would not.

### Atomic registration

- Add `public.register_for_training(p_training_id bigint)` returning a typed
  result, not a boolean: `ok`, `full`, `already_registered`, `past`,
  `not_found`.
- Add `public.unregister_from_training(p_training_id bigint)` so the deadline
  rule lives with the data instead of only in the action.
- `services/queries/registrations.ts` calls them through the cookie-bound
  client and maps the result codes to Slovak messages.
- `training_capacity` stays the source of the count; the function reads it
  under the row lock.

### Typed action results

- Add an `ActionResult` type to `lib/types.ts`: a discriminated union carrying
  either success or a Slovak `message` plus a stable `code`.
- `registerForTrainingAction` and `unregisterFromTrainingAction` return it
  instead of throwing for expected failures. Unexpected failures still throw.
- `TrainingList` reads the result instead of catching, and rolls back its
  optimistic update on failure.
- Authorization failures keep redirecting through the `B3` guards; they are not
  form errors.

### Server Action guards

Confirm every action performs authentication, capability, and **ownership**
checks. `registerForTrainingAction` and `unregisterFromTrainingAction` act on
the caller's own row by construction once the user comes from `auth.uid()`
inside the function.

## Out of scope

- Rate limiting, account enumeration, and `NEXT_PUBLIC_SITE_URL` validation —
  `B7`.
- Moving participant and statistics reads off the service-role client — the
  follow-up recorded in `010`.
- The missing input-validation layer, `ENG-009`.
- Legacy key migration and the release audit — `B8`.

## Test cases

Integration (`npm run test:db`):

1. Two concurrent registrations for a training with `maxParticipants = 1`
   produce exactly one success and one `full`. Run the calls in parallel, not
   in sequence; a sequential test cannot fail even with the bug present.
2. Ten parallel registrations for a training capped at three leave exactly
   three active rows.
3. Registering for a training whose datetime has passed returns `past`.
4. Registering twice returns `already_registered` and does not create a second
   row.
5. Re-registering after cancelling reactivates the existing row.
6. Unregistering after the deadline returns the deadline code and leaves the
   row active.
7. `anon` cannot read `public.trainings` once the policy is removed.
8. An `authenticated` user still reads trainings.

Unit (`npm test`):

9. The route handler returns `401` when `authorizeRequest` denies — or the file
   is gone, per decision 1.
10. Each action maps every result code to a Slovak message, with a case per
    code so a new code cannot be added silently.

## Implementation sequence

1. Record the answers to both decisions in this file.
2. Write the migration: the two functions, and the anon policy removal.
3. Apply to development and run the new integration tests, including the
   concurrency cases.
4. Add `ActionResult`, convert the two actions, and update `TrainingList`.
5. Resolve `/api/calendar` per decision 1.
6. Run `npm test`, `npm run test:db`, `tsc`, `prettier`, and the build.
7. Update `001`, `AGENTS.md`, `AUTH-006`, and `ENG-005`.

## Verification and acceptance

`B6` is complete only when:

- capacity cannot be exceeded under concurrent load, proven by a parallel test;
- a registration for a past training is refused by the database;
- expected form failures reach the user as readable Slovak text, by return
  value rather than by a thrown message that production replaces with a digest;
- anonymous callers cannot read trainings through the Data API or through a
  route handler, unless a public contract was explicitly approved;
- `npm run test:db` and `npm test` are green.

## Deployment and rollback

Development first; production is a separate deliberate step, and production
migrations are pasted into the SQL Editor because the CLI cannot reach that
project (`ENG-010`).

Order matters on release: the functions must exist before the code that calls
them, exactly as in `B4`. Rollback is dropping the two functions and restoring
the anon policy; the application would then need the previous code, so this is
a forward-fix block rather than a revert-friendly one.

## Explicit testing decision

The capacity fix is a concurrency claim, and a concurrency claim is only
credible when the test actually runs the calls in parallel against a real
database. These tests belong in `tests/integration/` and nowhere else. The
result-code mapping is pure and stays in the unit suite.
