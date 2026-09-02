---
type: plan
owner: auth
updated: 2026-09-02
---

# Authorization Authentication Implementation Plan - B8

## Plan identity

- **Plan number:** `013`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B8`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** key migration, final audit, regression, and release
- **Depends on:** `B1`–`B7`
- **Target environment:** development for the audit; production for the release
  and for key rotation

This document contains exactly one implementation block: `B8`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Verify that the seven previous blocks actually hold together, and prepare the
production release. This block deliberately splits into two halves with
different owners: an audit that an agent can perform against the repository and
the development project, and a set of credential and dashboard operations that
only the project owner can perform.

## What this block must not do

Key rotation, dashboard settings, and production releases are performed by the
project owner, not by an automated agent. This plan supplies the exact
procedure and the verification steps; it does not execute them. A rotated key
that nobody expected is an outage.

## Audit results

Performed on 2026-09-02 on branch `development`, after `B7`.

### Key inventory

Both projects still use **legacy JWT keys**:

| Project     | Anon key            | Service key                 | Expires    |
| ----------- | ------------------- | --------------------------- | ---------- |
| development | legacy JWT `anon`   | legacy JWT `service_role`   | 2036-08-09 |
| production  | legacy JWT `anon`   | legacy JWT `service_role`   | 2035-08-29 |

Supabase's newer scheme uses `sb_publishable_…` and `sb_secret_…`. Neither
project has been migrated. The expiry dates are far away, so this is not
urgent, but legacy keys cannot be rotated individually: rotating the JWT secret
invalidates every key at once, including live sessions.

### Secret exposure

| Check                                            | Result                                    |
| ------------------------------------------------- | ------------------------------------------- |
| Service-role key in the client bundle (`.next/static`, 31 files) | **not found**              |
| Service-role key inlined in the server bundle (`.next/server`, 345 files) | **not found**, read from env at runtime |
| `NEXT_PUBLIC_*` variables carrying a secret-shaped value | none                              |
| `.env.example`                                   | placeholders only                         |
| Logging of tokens or passwords                   | none found                                |

Logging does still pass raw provider error objects to `console.error` in five
places. Those can contain a request id and an email address, though not a
token. That is `ENG-006` and stays open.

### Regression

| Suite                    | Result       |
| ------------------------ | ------------ |
| `npm test`               | 201 passed   |
| `npm run test:db`        | 43 passed    |
| `npx tsc --noEmit`       | passed       |
| `npm run build`          | passed       |
| `npm run lint`           | broken, `ENG-001`, unrelated to this work |

The database suite covers the role vocabulary, the registration invariant,
self-escalation, cross-user reads, the last-owner guard, admin and owner policy
membership, column grants, atomic capacity under parallel load, the
registration rules, and account enumeration.

### Boundaries re-checked

- No regular-user path uses the service-role client; only
  `getTrainingParticipants`, `getStatisticsData`, `removeParticipantByAdmin`,
  and the three training writes do, each behind its own capability check.
- The cookie-less anon singleton no longer exists.
- `anon` has no privilege on `public.users`, `public.trainings`,
  `public.training_registrations`, or `public.training_capacity`.
- `app/api/` does not exist.

## Owner-only procedures

### 1. Read the rate limits (closes `AUTH-007`)

Supabase dashboard → Authentication → Rate Limits. Write the numbers into
`012-authorization-authentication-implementation-b7-plan.md` and judge whether
they suit a club of roughly eighty accounts. The current evidence that limits
exist at all is that the integration suite hit one.

### 2. Decide on the API key migration

Options, in order of preference:

1. **Do nothing now.** Legacy keys are valid until 2035 and 2036. Record the
   decision and revisit when Supabase announces an end date.
2. **Migrate to publishable/secret keys.** In the dashboard, create the new
   keys, add them alongside the old ones, deploy, verify, then disable the
   legacy keys. The publishable key replaces `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   and the secret key replaces `SUPABASE_SERVICE_ROLE_KEY`. Do development
   first and leave it running for a week before touching production.

Do not rotate the JWT secret as a substitute. It invalidates every key and
every active session at once.

### 3. Release to production

The database is already ahead of the code for `B2`–`B5`, and behind for `B6`.
Before deploying:

- apply `20260902073053_registration_rules.sql` in the production SQL Editor,
  because the CLI cannot reach that project (`ENG-010`);
- verify `public.register_for_training` and `public.unregister_from_training`
  exist, and that `anon` can no longer read `public.trainings`;
- confirm `NEXT_PUBLIC_SITE_URL` in the production environment is the real
  origin, with no trailing path — `siteOrigin()` now throws otherwise;
- take a backup (`npm run db:backup`).

Deploy the code only after those pass. The order is not negotiable: the code
calls the two functions on every registration.

### 4. Post-release verification

1. An owner sees `/statistics`; an admin is redirected to `/calendar`.
2. The calendar shows non-zero registration counts.
3. A regular user registers and unregisters.
4. Registering for a full training shows "Tréning je už plne obsadený" rather
   than a generic error — this is the check that proves typed results work in
   production, where a thrown message would have been replaced by a digest.
5. A password reset email arrives and its link works.
6. Signing out and back in returns to the page originally requested.

## Remaining open items after this block

These are recorded, owned, and deliberately not closed here:

| Item                                          | Register  |
| --------------------------------------------- | --------- |
| Rate-limit configuration unread               | `AUTH-007` |
| `npm run lint` broken                         | `ENG-001` |
| Copilot instructions still show a foreign stack | `ENG-002` |
| CI has never run green                        | `ENG-003` |
| Raw provider errors logged                    | `ENG-006` |
| Google Font fetched at build time             | `ENG-007` |
| No generated database types                   | `ENG-008` |
| Validation layer only started                 | `ENG-009` |
| CLI cannot reach the production project       | `ENG-010` |
| Two pages map to `/`                          | `ARCH-004` |
| `Training` interface declared twice           | `ARCH-005` |
| Participant and statistics reads still privileged | plan `010` |
| Training actions still throw expected failures | `ENG-005` |
| Training datetimes stored without a time zone | plan `011` |

## Verification and acceptance

`B8` is complete when:

- the audit above is recorded (**done**);
- the full regression passes (**done**);
- the rate limits have been read and judged (**owner**);
- the key-migration decision is recorded (**owner**);
- production has the `B6` migration and the release checklist passed
  (**owner**).

## Explicit testing decision

No new tests are written here. A final block that invents tests is a block that
was skipped earlier. What it does instead is run everything at once and record
the result, so the release decision rests on a single verified snapshot.
