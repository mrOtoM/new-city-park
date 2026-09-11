---
type: plan
owner: trainings
updated: 2026-09-11
---

# Plan: Training Waitlist

## Plan identity

- **Plan number:** `014`
- **Prefix meaning:** chronological plan order only.
- **Scope:** waitlist ("náhradníci") for full trainings, capped at five
  people per training, with an e-mail to every waitlisted person the moment a
  spot opens.
- **Depends on:** plan `001` blocks `B4` (`009`), `B5` (`010`), `B6` (`011`)
  — the capacity view, the RLS/grant baseline, and the atomic registration
  functions this plan extends.
- **Normative overviews:** `../01-application-architecture-overview.md`,
  `../02-authentication-authorization-overview.md`,
  `../03-ui-design-system-overview.md`.
- **Target environment:** development Supabase first; production requires a
  separate, deliberate release step.

## Context & goal

Today a full training shows a disabled `Plne obsadený !` button and nothing
else. A person who wants in has to keep reopening the calendar and hope. The
goal is:

1. On a full training a signed-in user sees `Prihlásiť sa ako náhradník`.
2. At most five people can be waitlisted per training; when five are, the
   button is disabled.
3. When a spot opens on a full training — a participant unregisters or an
   admin removes one — every waitlisted person receives an e-mail saying a
   spot is free and they can register now. The spot is **not** reserved;
   whoever registers first gets it.
4. Next to the button a short note explains exactly that.
5. An admin or owner sees the waitlisted people on the training's edit page,
   as a third section next to `Prihlásení` and `Odhlásení`.

All user-facing copy is Slovak; code and comments are English.

### What the waitlist is — and is not (owner's definition, 2026-09-11)

The waitlist is nothing more than **a list of user ids per training**. It
exists so that, when a spot opens, the application can look up those users'
e-mail addresses and send them one informational message: *a spot is free, you
can register now*. That is where the feature ends.

- It does **not** reserve a spot, hold a queue position, or register anyone.
- Whoever of the waitlisted people signs in and presses `Prihlásiť sa` first
  gets the spot; the others get `full` as today.
- The e-mail is a nudge, not a claim. It links to the calendar and nothing
  else.

Every design choice below is bounded by this: the table stores `user_id`s,
the privileged read (Decision 1) resolves those ids to e-mails and does
nothing else, and the UI never shows a position or a promise.

## Current state

Verified on 2026-09-11 on branch `development`, working tree clean.

### Capacity and registration live in the database

- `public.training_capacity` (`20260901073108_training_capacity_view.sql`) is
  the single source of occupancy: `training_id`, `max_participants`,
  `active_count`. It is `security_invoker = off` and readable by
  `authenticated` only. No column with personal data may be added to it.
- `public.register_for_training(bigint)` and
  `public.unregister_from_training(bigint)`
  (`20260902073053_registration_rules.sql`) hold every rule. `register`
  locks the training row (`FOR UPDATE`) and returns one of the codes in
  `REGISTRATION_CODES` (`lib/types.ts`). `unregister` does **not** lock the
  training row; it only checks the deadline and soft-cancels.
- `services/queries/registrations.ts` `callRegistrationFunction` maps the
  `.rpc()` result to `RegistrationCode`; anything unknown becomes
  `not_found`.
- `services/actions/registrations.ts` turns codes into `ActionResult` through
  `MESSAGES`, a `Record<Exclude<RegistrationCode, 'ok'>, string>`, so adding a
  code without a message is a compile error. That is the mechanism this plan
  relies on for the new codes.

### Three writes can free a spot

| Path | Where | Client |
|---|---|---|
| user unregisters | `unregisterFromTrainingAction` → `unregister_from_training` | cookie-bound |
| admin removes a participant | `removeParticipantAction` → `removeParticipantByAdmin` (direct `UPDATE`) | service-role, after `training:manage` |
| admin raises `maxParticipants` | `updateTrainingAction` | service-role, after `requireAdmin()` |

Any waitlist notification must hang off all three, or the feature is
inconsistent from day one.

### E-mail

`lib/email.ts` wraps Resend. Sending is fire-and-forget from actions
(`.catch(console.error)`); without `RESEND_API_KEY` it silently skips.
`sendTrainingCancelledEmails` already sends one template to many recipients
with `Promise.allSettled` — the waitlist mail follows that shape.

### UI

`components/trainings/TrainingList.tsx` renders the per-training button. It
holds `useOptimistic` state of `{ registrations: number[], counts:
Record<number, number> }` and decides between `Prihlásiť sa`, `Odhlásiť sa`,
`Prihlásený`, `Odhlásenie uzavreté`, and `Plne obsadený !`. Both pages
(`app/(protected)/calendar/page.tsx`, `app/(protected)/trainings/page.tsx`)
feed it `getUserRegistrations(user.id)` and `getRegistrationCounts()`.

### Admin participant view

`app/(protected)/trainings/[id]/edit/page.tsx` requires an admin and passes
`getTrainingParticipants(id)` — `{ active, cancelled }` with name, phone,
e-mail — to `TrainingEditTabs.tsx`, which renders `Prihlásení (n)` and an
`Odhlásení (n)` section on the participants tab. The query checks
`participants:view` itself and reads with the service-role client (the move
to the cookie-bound client is a recorded follow-up). The waitlist section
slots in as a third list of the same shape.

### The security constraint that shapes this plan

Overview `02`: *a regular-user path must never use a service-role client for
user-data reads or writes*, and *privileged client uses require an explicit
security decision; do not infer them from feature requirements*.

Sending "a spot opened" mail after a **regular user** unregisters needs the
names and e-mails of up to five **other** users. There is no way to obtain
those through the cookie-bound client without leaking them to the caller (a
`SECURITY DEFINER` function that returns them is callable over REST by that
same user). This is exactly the case overview `02` says must be decided
explicitly, not inferred. See Decision 1.

## Approach

### Decision 1 — how the server learns whom to notify (required)

**Recommended: one privileged SQL function, executable by `service_role`
only, called from the action after the user's own write has succeeded.**

`public.claim_waitlist_notifications(p_training_id bigint)` returns
`TABLE (name text, email text)`. It is `SECURITY DEFINER`, has `REVOKE ALL …
FROM public, anon, authenticated` and `GRANT EXECUTE … TO service_role`, so
no user session can invoke it — not through the app, not over REST. It:

1. locks the training row;
2. returns nothing if the training is in the past, has no
   `maxParticipants`, or is still full;
3. selects waitlist rows for that training with `notified_at IS NULL`;
4. sets their `notified_at = now()`;
5. returns the recipients' `fullName` and `email` from `public.users`.

Steps 3–4 make the call idempotent: two unregistrations in a row while the
spot stays open send one mail, not two. `register_for_training` resets
`notified_at` to `NULL` for the whole waitlist when its insert makes the
training full again, so the next opening notifies again.

The TypeScript side is a single helper, `notifyWaitlist(trainingId)` in
`services/actions/waitlist-notifications.ts` — a `server-only` module with
no `'use server'`, because an exported function in a `'use server'` file is a
public Server Action and this one has no guard of its own. It calls the
database function through
`createSupabaseAdminClient()`, passes the rows to `lib/email.ts`, and never
returns them. It runs only after `requireUser()`/`requireAdmin()` and only
when the preceding write returned `ok`. The recipients are not the acting
user's data; they are the system's, and the system is the sender.

This is a **system operation**, the category overview `02` reserves the
privileged client for. It has to be written into overview `02` as an approved
privileged use with this justification, in the same change (task below).

- *Alternative — send from PostgreSQL* (`pg_net` + Resend from a trigger):
  keeps the Node path unprivileged but moves the Resend key into the
  database and e-mail out of `lib/email.ts`. Rejected: two e-mail stacks.
- *Alternative — notification queue table + worker*: nothing in this stack
  runs a worker. Rejected until there is one.
- *Alternative — return recipients from `unregister_from_training`*: leaks
  other users' e-mails to any authenticated caller over REST. Rejected.

### Decision 2 — where the number five lives (required)

**Recommended:** `public.waitlist_capacity()` — an `IMMUTABLE` SQL function
returning `5`. `join_training_waitlist` compares against it, and
`training_capacity` exposes it as `waitlist_max`. TypeScript never hardcodes
the number; the UI disables the button when `waitlist_count >= waitlist_max`.
Changing the limit is then a one-line migration and no deploy.

- *Alternative:* constant in the function and `WAITLIST_CAPACITY = 5` in
  `lib/constants.ts`. Two copies of one product rule; rejected.

### Decision 3 — waitlisted trainings appear under "Moje tréningy" (approved 2026-09-11)

`/trainings` shows a regular user only trainings they are registered for
(`onlyRegistered`). Waitlisted trainings are included there too, with the
`Náhradník` state on the button, so a person can leave a waitlist without
hunting for the day in the calendar. It is one extra `includes` in the
filter. The whole flow is automatic: joining, the e-mail, and dropping off the
list on registration need no admin step.

### Data model

New table `public.training_waitlist`:

```sql
id           bigint generated by default as identity primary key
training_id  bigint not null references public.trainings(id) on delete cascade
user_id      uuid   not null references public.users(id)     on delete cascade
joined_at    timestamptz not null default now()
notified_at  timestamptz
unique (training_id, user_id)
```

A separate table, not a status column on `training_registrations`, so that
`active_count`, the statistics, and the participant list keep their meaning
untouched.

RLS and grants, matching `training_registrations`:

- `SELECT` for `authenticated` `USING (auth.uid() = user_id)`;
- `SELECT` for admins `USING (public.has_admin_capabilities())` — extend
  nothing, reuse the function;
- **no** `INSERT`/`UPDATE`/`DELETE` policy: all writes go through the
  functions below;
- `REVOKE ALL FROM anon`; `GRANT SELECT TO authenticated`.

`public.training_capacity` gains two trailing columns, `waitlist_count` and
`waitlist_max`. Both are numbers, so the no-PII rule holds. `CREATE OR
REPLACE VIEW` accepts appended columns, which is why they go last; removing
them later needs `DROP VIEW` (see rollback).

### Database functions

All `SECURITY DEFINER`, `SET search_path = public, pg_temp`, acting user from
`auth.uid()`, `EXECUTE` granted to `authenticated` and revoked from
`public, anon` — same as B6. Times are compared in the
`Europe/Bratislava` frame like the existing functions, because
`trainings.datetime` is naive local time.

`public.join_training_waitlist(p_training_id) RETURNS text`, under
`FOR UPDATE` on the training row:

| condition | code |
|---|---|
| no session | `unauthenticated` |
| training missing | `not_found` |
| training started | `past` |
| caller has an active registration | `already_registered` |
| training has a free spot (or no limit) | `not_full` |
| caller already on the waitlist | `already_waitlisted` |
| `count(waitlist) >= waitlist_capacity()` | `waitlist_full` |
| otherwise insert | `ok` |

`public.leave_training_waitlist(p_training_id) RETURNS text`:
`unauthenticated`, `not_found`, `not_waitlisted`, `ok`. No deadline: leaving
a waitlist frees nothing.

`public.register_for_training` — two additions inside the existing
transaction, after the insert/reactivation:

- `DELETE FROM training_waitlist WHERE training_id = … AND user_id = _user`
  — a person who got in is no longer a náhradník;
- if `_active + 1 >= _max`, `UPDATE training_waitlist SET notified_at = NULL
  WHERE training_id = …` — the training is full again, so the next opening
  must notify again.

`public.claim_waitlist_notifications` — as in Decision 1.

`public.unregister_from_training` is unchanged. The transition
"full → not full" is detected by `claim_waitlist_notifications` from the
current state plus `notified_at`, so the unregister function does not need
pre-state or a row lock.

### TypeScript

`lib/types.ts`:

- extend `REGISTRATION_CODES` with `not_full`, `already_waitlisted`,
  `waitlist_full`, `not_waitlisted` — `MESSAGES` then fails to compile until
  each has Slovak copy;
- add `TrainingOccupancy = { active: number; max: number | null; waitlist:
  number; waitlistMax: number }` and `WaitlistRecipient = { name: string;
  email: string }`;
- add `WaitlistedParticipant = { userId; name; phone; email; joinedAt;
  notifiedAt: string | null }` and extend `TrainingParticipants` with
  `waitlist: WaitlistedParticipant[]`.

`services/queries/registrations.ts`:

- `joinTrainingWaitlist` / `leaveTrainingWaitlist` via
  `callRegistrationFunction`;
- `getUserWaitlist(userId)` — own rows through the cookie-bound client;
- `getRegistrationCounts()` becomes `getTrainingOccupancy(): Promise<Record<number,
  TrainingOccupancy>>` reading the four view columns. One shape instead of a
  second parallel map;
- `getTrainingParticipants` also reads `training_waitlist` for the training,
  joined to `users` exactly like the registrations, ordered by `joined_at`,
  and returns it as `waitlist`. Same `participants:view` check, same client,
  so no new security surface;
- `claimWaitlistNotifications(trainingId)` — the only new privileged read,
  documented at the call site with a reference to overview `02`.

`services/actions/registrations.ts`:

- `joinWaitlistAction`, `leaveWaitlistAction` → `ActionResult`, guarded by
  `requireUser()`; join sends no confirmation e-mail (the note on screen is
  the confirmation; a mail per join would be noise);
- `notifyWaitlist(trainingId)` helper, fire-and-forget like the existing
  mails, called after a successful `unregisterFromTrainingAction` and
  `removeParticipantAction`;
- `services/actions/trainings.ts` `updateTrainingAction` calls the same
  helper after a successful update; the claim function itself decides whether
  anything opened, so the action needs no before/after comparison.

`lib/email.ts`: `sendWaitlistSpotOpenedEmails(recipients, trainingLabel,
trainingDatetime)` in the `sendTrainingCancelledEmails` shape. The body links
to `new URL('/calendar', siteOrigin())` — never `NEXT_PUBLIC_SITE_URL`
directly.

### UI (`components/trainings/TrainingList.tsx`)

Optimistic state becomes `{ registrations, waitlist: number[], occupancy }`,
with a `WaitlistChange` next to `RegistrationChange`. Button states for a
non-admin on a full training they are not registered for:

| state | button | note under the card |
|---|---|---|
| not waitlisted, waitlist open | `secondary` **Prihlásiť sa ako náhradník** | *Tréning je plný. Ako náhradník dostaneš e-mail hneď, ako sa uvoľní miesto, a budeš sa môcť prihlásiť. Miesto nie je rezervované – platí poradie prihlásenia.* |
| waitlisted | `ghost` **Náhradník** (click → `ConfirmSheet` *Zrušiť náhradníka?* / *Zrušiť náhradníka* / *Späť*) | *Si náhradník. Keď sa uvoľní miesto, pošleme ti e-mail.* |
| not waitlisted, waitlist full | `ghost` disabled **Náhradníci obsadení** | *Tréning aj zoznam náhradníkov sú plné.* |

The note uses `text-primary-400 text-xs` in the same `pl-13` column as the
existing deadline line. When the training has a free spot the button and note
disappear and the ordinary `Prihlásiť sa` returns, even for a waitlisted user
— that is the moment the e-mail told them about.

### Admin UI (`TrainingEditTabs.tsx`)

On the participants tab, between the active list and `Odhlásení`, a section
`Náhradníci (n / 5)` — the `5` comes from `waitlistMax`, not a literal —
listing name, phone, e-mail, and `čaká od {joinedAt}`; when `notifiedAt` is
set, a `text-accent-teal` tag `upozornený {notifiedAt}`. Styled like the
active rows (no strike-through, no opacity), with a `Clock` icon from
`lucide-react` in place of the `#n` position, because there is no position.
No action button: the admin only sees the list; a waitlisted person registers
themselves when a spot opens. The empty state `Zatiaľ nikto prihlásený` shows
only when all three lists are empty. The tab label stays `Prihlásení (n)` —
the tab counts participants, not hopefuls.

Action messages (Slovak, in `MESSAGES`):

- `not_full` → *Tréning má voľné miesto, prihlás sa priamo*
- `already_waitlisted` → *Už si náhradník na tomto tréningu*
- `waitlist_full` → *Zoznam náhradníkov je už plný*
- `not_waitlisted` → *Nie si náhradník na tomto tréningu*

E-mail: subject *Uvoľnilo sa miesto – {label}*, heading *Uvoľnilo sa miesto
na tréningu*, body: *Ahoj {name}, na tréningu **{label}**, ktorý sa koná
**{datetime}**, sa uvoľnilo miesto. Prihlásiť sa môžeš v kalendári; miesto
získa ten, kto sa prihlási prvý.*

### Risks

- **Privileged read in a user-triggered path.** Contained by the
  `service_role`-only grant and the call site running only after the user's
  own write succeeded; recorded in overview `02`. Integration test asserts
  `authenticated` gets `42501` on the function.
- **Two waitlisted users race for one spot.** Intended: `register_for_training`
  is already atomic, the loser gets `full`. The note says so.
- **Mail volume.** Bounded: five recipients per opening, and `notified_at`
  suppresses repeats until the training refills.
- **View column order.** Appending is the only change `CREATE OR REPLACE
  VIEW` allows; anyone reordering later breaks the migration.
- **Production is behind.** `20260902073053_registration_rules.sql` is not yet
  applied to production (plan `013`). This migration replaces
  `register_for_training`, so file order must be kept: B6 functions first,
  then this one.

## Tasks

Development first; each step verified before the next.

- [x] **Decisions 1–3** confirmed by the owner and recorded in this file.
- [x] **Migration** `supabase/migrations/<timestamp>_training_waitlist.sql`
      (created with `npx supabase migration new training_waitlist`): table +
      RLS + grants, `waitlist_capacity()`, view with `waitlist_count` /
      `waitlist_max`, `join_training_waitlist`, `leave_training_waitlist`,
      `claim_waitlist_notifications`, replaced `register_for_training`, function
      grants/revokes. Safe to re-run. Style per `20260214140608_initial_setup.sql`.
- [x] `npx supabase db push` against the **development** project after
      verifying the linked ref.
- [x] **Types** in `lib/types.ts` (codes, `TrainingOccupancy`,
      `WaitlistRecipient`). No comments in the file.
- [x] **Queries** in `services/queries/registrations.ts`; replace
      `getRegistrationCounts` with `getTrainingOccupancy` and update both
      pages; `getTrainingParticipants` returns `waitlist`.
- [x] **Actions**: `joinWaitlistAction`, `leaveWaitlistAction`,
      `notifyWaitlist`, wired into user unregister, admin removal, and
      training update.
- [x] **E-mail** `sendWaitlistSpotOpenedEmails` in `lib/email.ts`.
- [x] **UI** in `TrainingList.tsx`: waitlist optimistic state, three button
      states, note, `ConfirmSheet` for leaving; `/trainings` includes
      waitlisted trainings for regular users (Decision 3).
- [x] **Admin UI** in `TrainingEditTabs.tsx`: `Náhradníci (n / max)` section
      with the `upozornený` tag; the edit page passes `waitlistMax` from
      `getTrainingOccupancy`.
- [x] **Unit tests** (`tests/unit/actions/registrations.test.ts`): every new
      code has a message and does not throw; `notifyWaitlist` runs after
      `ok` and not after a failure; recipients go to the e-mail module and
      never into the `ActionResult`.
- [x] **Integration tests** (`tests/integration/waitlist.test.ts`, against
      development only):
      1. join on a training with a free spot → `not_full`;
      2. join on a full training → `ok`; view shows `waitlist_count = 1`;
      3. sixth person → `waitlist_full`; `waitlist_max` is `5`;
      4. registered user joining → `already_registered`; second join →
         `already_waitlisted`;
      5. anon cannot call any of the three functions; `authenticated` gets
         `42501` on `claim_waitlist_notifications`;
      6. a user reads only their own waitlist rows; an admin reads all;
      7. after a participant unregisters, `claim_waitlist_notifications`
         (service-role) returns the waitlisted people once and an empty set
         the second time;
      8. a waitlisted person who registers is removed from the waitlist; when
         that fills the training, `notified_at` is `NULL` again for the rest;
      9. leave → `ok`, leave again → `not_waitlisted`;
      10. `getTrainingParticipants` returns the waitlist with `notifiedAt`
          for an admin and is refused for a regular user, as today.
- [x] **Docs**: overview `02` gains the approved privileged system read with
      its justification; overview `01` lists the new table and functions;
      `AGENTS.md` baseline gets one bullet; `.env.example` unchanged.
- [x] `npm test`, `npm run test:db`, `npm run build` — green, see the record.
- [ ] Manual pass in the browser with Resend configured in development
      (owner; the agent does not sign in with a password).
- [ ] Merge the feature branch into `development`.

## Implementation record

Implemented on 2026-09-11 on branch `feature/training-waitlist`, migration
`20260911075500_training_waitlist.sql` applied to the development project
`bqefyxloqktstljbzbgu` with `npx supabase db push`.

Deviations from the approach above, all small:

- `notifyWaitlist` lives in `services/actions/waitlist-notifications.ts`, not
  in `registrations.ts`, for the reason given under Decision 1.
- `getTrainingOccupancy` replaced `getRegistrationCounts` outright; the
  edit page reads it too, for `waitlistMax`.
- The unregister and leave-waitlist confirmations share one `ConfirmSheet`
  with a `kind` discriminator instead of a second sheet.

Verified:

- `npx tsc --noEmit`: clean.
- `npm test`: 11 files, 230 tests, green — including 10 new cases in
  `tests/unit/actions/registrations.test.ts` (new codes have messages and do
  not throw; `notifyWaitlist` runs after `ok` on unregister and admin
  removal, never after a failure or after a join) and 4 in
  `tests/unit/actions/waitlist-notifications.test.ts` (no recipients → no
  mail and no training read; recipients go to `lib/email.ts` and are never
  returned; a send failure does not throw).
- `npm run test:db`: 6 files, 61 tests, green — 18 new in
  `tests/integration/waitlist.test.ts` covering every case listed under
  Tasks, plus `not_found`, `past`, `not_full` on an unlimited training, a
  direct `INSERT` by a user (`42501`), and a past training returning no
  recipients.
- `npm run build`: green.

Not verified: the rendered UI and a real Resend delivery. Lint was not run:
`npm run lint` is broken independently of this branch (`ENG-001`). Prettier
was checked on every changed file with `--end-of-line auto`, because the
working copy is CRLF and a plain `--check` flags every file in the repository.

### Deployment and rollback

Production is applied by hand in the SQL Editor (`ENG-010`). The migration is
expand-only — new table, new functions, appended view columns, a replaced
`register_for_training` whose extra statements touch only the new table — so
the order is:

1. verify `20260902073053_registration_rules.sql` **functions** are already
   present in production (plan `013` step); if not, apply that first;
2. paste this migration; verify with `SELECT` on `pg_proc` / `pg_tables` /
   `information_schema.columns` before and after;
3. deploy `main`.

Old code keeps working between 2 and 3: it ignores the new view columns and
never calls the new functions.

Rollback: drop the three new functions and `waitlist_capacity()`, `DROP TABLE
public.training_waitlist`, restore `register_for_training` from
`20260902073053`, and `DROP VIEW` + recreate `training_capacity` from
`20260901073108` (columns cannot be removed in place). Application code must
be reverted in the same step, so treat this as forward-fix like B6.

## Future work

Out of scope here, recorded so nobody assumes they are covered:

- An admin action to register a waitlisted person directly; today the admin
  only sees the list.
- Waitlisted people receive the cancellation mail when a training is deleted
  (today the cascade removes them silently).
- A per-user cap on how many waitlists one account may join.
- Moving `removeParticipantByAdmin` onto a database function so all three
  spot-freeing writes share one lock discipline.
- Notifying only the first N in `joined_at` order instead of everyone, if the
  first-come race proves unpopular.
