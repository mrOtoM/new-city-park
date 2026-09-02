---
type: plan
owner: auth
updated: 2026-09-02
---

# Authorization Authentication Implementation Plan - B7

## Plan identity

- **Plan number:** `012`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B7`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** login, signup, reset, redirect, and rate-limit hardening
- **Depends on:** `B3` (`008`), `B6` (`011`)
- **Target environment:** local development and the development Supabase
  project; production requires a separate, deliberate release step

This document contains exactly one implementation block: `B7`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Close the authentication-flow gaps that sit outside the authorization DAL: an
attacker should not be able to learn which email addresses have accounts, a
misconfigured site URL should fail loudly instead of silently breaking password
resets, and an error message should never carry internal detail to the screen.

## Verified repository baseline

Verified on 2026-09-02 on branch `development`, after `B6`.

### The auth pages run entirely in the browser

`login`, `register`, `forgot-password`, and `reset-password` are Client
Components calling `createSupabaseBrowserClient()` directly. There is no server
hop, so the application cannot see, count, or throttle these requests. Anything
this block wants to enforce per-request either happens in Supabase or requires
moving the flow to a Server Action first.

### Signup discloses which emails have accounts

`app/(public)/register/page.tsx:59` maps Supabase's error to
`'Tento email je už zaregistrovaný'`. That is an account-enumeration oracle:
submit an address, read the answer. `forgot-password` does not have this
problem — it renders a generic "Email odoslaný" regardless.

### Rate limiting already exists, but nobody chose it

Supabase rate-limits the auth endpoints. This is not theory: the integration
suite hit `Request rate limit reached` on 2026-09-01 while signing in ten
accounts in parallel, which is why `tests/integration/registration.test.ts`
reuses a pool of five sessions.

Both `register` and `forgot-password` already map `429` to
`'Príliš veľa pokusov. Skúste to neskôr.'`, so the client handles the case. What
is missing is a decision: nobody has looked at the project's configured limits,
compared them against what this application needs, or written them down.

`login` does **not** handle `429`; it shows `'Nesprávne prihlasovacie údaje'`
for every failure, so a throttled user is told their password is wrong.

### `NEXT_PUBLIC_SITE_URL` is interpolated unchecked

Three call sites build a redirect from it (`login:50`, `register:80`,
`forgot-password:24`). When the variable is missing, the string becomes
`undefined/auth/callback` and the reset link is broken, with no error anywhere.
`AGENTS.md` already warns that a mismatch breaks password resets silently.

### The password rule is written three times

`'Heslo musí mať aspoň 8 znakov…'` appears in three files, once as a regex and
twice as prose. There is no shared validator; `services/validators/` from
overview `01` does not exist. This is `ENG-009`.

### Unexpected errors reach the screen verbatim

`app/error.tsx` renders `error.message`. A Postgres or Supabase message would
be shown to the user as is. This is `ENG-004`.

## Decisions to make before implementation

**1. Do the auth flows move to Server Actions?**

- **Keep them client-side.** Accept Supabase's limits as the only throttle,
  verify and document them, and fix enumeration in the message mapping. Small,
  honest, and no new infrastructure. Recommended unless the answer to the next
  question is yes.
- **Move them server-side.** Gives a place to add per-IP throttling and uniform
  error mapping, at the cost of rewriting four pages and losing the direct
  Supabase client flow. Only worth it if custom limits are actually required.

**2. Is a custom rate limiter in scope at all?**

A real limiter needs shared state across serverless invocations — Upstash,
Vercel KV, or similar — which is a new dependency and a new account.
`AGENTS.md` forbids adding dependencies without explicit approval.

Recommendation: **no custom limiter in this block.** Verify Supabase's limits
against the threat, write them down, and record a follow-up if they prove
insufficient. Building an unnecessary limiter is worse than not having one,
because it invites the belief that the problem is solved.

## Scope

### Account enumeration

- Signup must not reveal whether an address is registered. Supabase's own
  behavior with email confirmation enabled is to return a success-shaped
  response for an existing address; verify what this project actually returns
  before changing the mapping, because the fix depends on it.
- The signup result message becomes the same regardless of outcome: confirm the
  email to continue.
- Password reset keeps its generic message.
- Login keeps one generic failure message, and gains a distinct one for `429`.

### Site URL validation

- Add a single accessor that reads `NEXT_PUBLIC_SITE_URL`, rejects a missing or
  malformed value, and returns a normalized origin.
- The three call sites use it instead of interpolating the variable.
- Failing loudly at build or first use is better than a silently broken reset
  link. Decide which of the two and record it.

### Rate limits

- Read the project's auth rate-limit settings in the Supabase dashboard and
  record the numbers in this plan.
- Map `429` on every flow, including login.
- Add no dependency.

### Safe error surfaces

- `app/error.tsx` shows generic Slovak copy; the detail goes to the server log,
  not the screen. Closes `ENG-004`.
- Confirm no auth path logs a token, a password, or an email address.

### Shared password rule

- One validator, used by signup and reset, with its message defined once.
- This is the smallest useful piece of `ENG-009`; the rest of the validation
  layer stays open.

## Out of scope

- Moving participant and statistics reads off the service-role client — the
  follow-up from `010`.
- Typed results for the training actions — the remainder of `ENG-005`.
- `timestamptz` migration for training datetimes — recorded during `B6` as the
  root cause behind the hardcoded `'Europe/Bratislava'` comparison.
- Legacy key migration and the release audit — `B8`.

## Test cases

Unit (`npm test`):

1. The site-URL accessor rejects an empty value, a missing protocol, and a
   trailing-slash mismatch, and returns a normalized origin for a valid one.
2. The password validator accepts a compliant password and rejects each failing
   category, with one message.
3. Error mapping returns the same message for "email exists" and "email is
   new".

Integration (`npm run test:db`):

4. Signing up with an address that already exists produces the same visible
   outcome as a fresh address.
5. Requesting a password reset for a non-existent address produces the same
   outcome as for a real one.

Manual, recorded in the implementation record:

6. The Supabase dashboard's configured auth rate limits, written down as
   numbers.
7. A password reset completes end to end in development, proving
   `NEXT_PUBLIC_SITE_URL` is right for that environment.

## Implementation sequence

1. Record the answers to both decisions.
2. Read and write down the Supabase rate-limit configuration.
3. Add the site-URL accessor and the password validator, with unit tests.
4. Rework the four auth pages' error mapping, including `429` on login.
5. Make `app/error.tsx` generic.
6. Run the enumeration checks against development.
7. Run `npm test`, `npm run test:db`, `tsc`, `prettier`, and the build.
8. Update `001`, `AGENTS.md`, `AUTH-007`, `ENG-004`, and `ENG-009`.

## Verification and acceptance

`B7` is complete only when:

- signup and password reset produce identical visible outcomes for existing and
  non-existing addresses;
- every auth flow maps `429` to its own message;
- a missing or malformed `NEXT_PUBLIC_SITE_URL` fails visibly instead of
  producing an `undefined/...` link;
- no unexpected error message reaches the screen verbatim;
- the password rule exists once;
- the configured Supabase rate limits are written down, with a judgement on
  whether they are sufficient.

## Deployment and rollback

Application-only unless a decision moves flows server-side. No migration is
expected. Rollback is a branch revert; the previous behavior discloses more, so
a revert widens exposure rather than breaking anything.

## Explicit testing decision

Enumeration is a behavioral claim about a live auth service, so it is tested
against development, not mocked. The site-URL accessor and the password rule
are pure and stay in the unit suite. Browser E2E for the full reset journey
remains deliberately out: the manual check in step 7 covers it, and a headless
browser dependency is not justified by one flow.
