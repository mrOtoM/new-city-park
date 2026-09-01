---
type: plan
owner: auth
updated: 2026-09-01
---

# Authorization Authentication Implementation Plan - B3

## Plan identity

- **Plan number:** `008`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B3`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Normative security overview:** `../02-authentication-authorization-overview.md`
- **Scope:** auth DAL, request cache, and route protection
- **Depends on:** `B1` (recorded in `002`), `B2` (recorded in `007`)
- **Target environment:** local development; no database change, no production
  change

This document contains exactly one implementation block: `B3`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Make `lib/auth/dal.ts` the single, request-cached, fail-closed server entry
point for authentication state, and make every server entry point perform its
own explicit authorization check. The pure contracts from `B1`
(`lib/auth/roles.ts`, `lib/auth/auth-result.ts`) become the runtime source of
truth; the database vocabulary from `B2` is the only role source.

No database privilege, RLS policy, grant, or Supabase client trust boundary
changes here. Removing the service-role client from regular-user paths is `B4`.

## Verified repository baseline

Verified on 2026-09-01 on branch `development`, working tree clean, commit
`6463f2b`.

- `B1` is implemented: `vitest.config.mts`, `npm test`, `lib/auth/roles.ts`,
  `lib/auth/auth-result.ts`, `tests/unit/fixtures/identities.ts`, and three
  contract test files. `npm test` passes with 105 tests in 4 files.
- `B2` is implemented: `supabase/migrations/20260831110000_three_role_model.sql`
  holds the value audit, the `users_role_allowed_values` CHECK constraint, the
  hardened `handle_new_user()` with `SET search_path`, the corrected
  `Users can update own profile` policy, and `enforce_last_owner_trigger`.
  `tests/unit/auth/role-vocabulary.test.ts` keeps the migration vocabulary and
  `ROLES` in sync. The linked Supabase project (`supabase/.temp/project-ref`)
  is the development project and matches the active `NEXT_PUBLIC_SUPABASE_URL`.
- `lib/auth/dal.ts` exports a single `auth()`. It is **not** request-cached, so
  every caller repeats `auth.getUser()` plus the profile query, and it is
  **not** fail-closed: `role: profile?.role || 'user'` turns a missing profile
  or an unknown role into a regular user.
- `auth()` returns a hand-built `{ user: { id, email, name, phone, role,
  userId } }` shape, so no call site is forced to handle the denied case.
- There is no `requireUser`, `requireAdmin`, or `requireOwner`. Every protected
  page repeats `const session = await auth()` followed by
  `if (!hasAdminCapabilities(session?.user?.role)) redirect('/calendar')`.
- `app/(protected)/layout.tsx` calls `auth()` but never requires a user; only
  `proxy.ts` keeps anonymous callers out of the protected group.
- `proxy.ts` already uses the Next.js 16 `proxy` convention. It redirects
  anonymous requests to `/login` but drops the originally requested path, so
  the user always lands on `/calendar` after logging in. Its matcher covers
  `/calendar`, `/trainings`, `/trainings/:path*`, and `/profile`; it does not
  cover `/statistics`, which is therefore protected only by its own page check.
- `app/(public)/login/page.tsx` pushes a hard-coded `/calendar` after sign-in
  and ignores any return path.
- `app/auth/callback/route.ts` builds redirects from the `origin` of the
  incoming request and accepts no caller-supplied destination.
- `components/layout/Navigation.tsx:33` and
  `components/trainings/TrainingList.tsx:65` still compare `role === 'admin'`,
  so an `owner` does not see admin navigation or admin training controls. The
  server-side checks were converted to `hasAdminCapabilities()` during `B2`;
  these two client components were missed.
- `app/api/calendar/route.ts` is unauthenticated. Requiring authentication
  there is `B6` scope and is not changed by this block.

## Scope

### Request-cached, fail-closed DAL

- Wrap the verified auth lookup in React `cache()` so one request/render pass
  performs at most one `auth.getUser()` and one profile query.
- Return the `AuthResult` union from `lib/auth/auth-result.ts` instead of an
  ad-hoc object, so `unauthenticated`, `denied`, and `authenticated` are
  distinguishable by the caller.
- Parse the persisted role with `parseRole`. A missing profile, a profile query
  error, or an unknown role produces `denied`, never `user`.
- Derive the user id from the verified Supabase identity, never from an
  argument.
- Keep the display fields the UI needs (`name`, `phone`, `email`) on the
  authenticated identity, and keep the returned shape minimal.

### Explicit guards

Add to the DAL, all built on the cached lookup:

- `requireUser()` — returns the authenticated identity or redirects to `/login`
  with a safe `next` parameter;
- `requireCapability(capability)` — the general guard;
- `requireAdmin()` and `requireOwner()` — thin wrappers over
  `requireCapability`;
- a Route Handler variant that returns `401` / `403` `Response` objects instead
  of redirecting, so API boundaries do not answer with HTML redirects.

An `owner` must pass `requireAdmin()` because `owner` holds the admin
capabilities, and an `admin` must fail `requireOwner()`.

### Safe same-origin redirects

- Add a pure `safeNextPath()` helper: accept only a same-origin absolute path
  (`/...`), reject protocol-relative (`//host`), absolute URLs, backslash
  variants, and control characters, and fall back to `/calendar`.
- `proxy.ts` attaches the originally requested path as `next`.
- The login page consumes `next` through the same helper.

### Route protection

- Extend the `proxy.ts` matcher to `/statistics`, which is currently outside
  it.
- `app/(protected)/layout.tsx` requires an authenticated user through the DAL,
  so the protected shell is safe even if the matcher and the route tree drift
  apart.
- Protected pages and Server Actions call the guards instead of repeating the
  `auth()` + `hasAdminCapabilities()` + `redirect()` sequence.

### Capability-consistent UI

- `Navigation` and `TrainingList` decide admin visibility with
  `hasAdminCapabilities()` instead of `role === 'admin'`.
- This is presentation only. The server checks remain the authority.

## Out of scope

Deferred to their owning blocks; do not implement them here:

- Requiring authentication for `/api/calendar`, the minimum calendar DTO, and
  atomic registration capacity — `B6`.
- Typed Server Action results replacing `throw new Error('Unauthorized')` —
  `B6`/`B7`, tracked as `ENG-005`.
- Removing the anon singleton and the service-role fallback in
  `lib/supabase.ts`, and moving regular-user reads/writes to the cookie-bound
  client — `B4`.
- Rate limiting, account-enumeration wording, and `NEXT_PUBLIC_SITE_URL`
  validation — `B7`.
- RLS and grant changes — `B5`.

## Test cases

Unit (`tests/unit/`, no database, no network):

1. The cached lookup performs one `getUser()` and one profile query for
   repeated calls inside one pass, and a fresh pass queries again.
2. No Supabase user produces `unauthenticated`.
3. A missing profile row produces `denied('missing-profile')`.
4. A profile query error produces `denied('missing-profile')` and does not
   throw.
5. An unknown, empty, mixed-case, or non-string persisted role produces
   `denied('unknown-role')`, never `user`.
6. `requireUser()` redirects an anonymous and a denied caller to `/login` with
   the safe `next` value.
7. `requireAdmin()` passes `admin` and `owner`, and redirects `user`.
8. `requireOwner()` passes `owner` and redirects `admin` and `user`.
9. The Route Handler guard returns `401` for anonymous or denied callers and
   `403` for an authenticated caller without the capability.
10. `safeNextPath()` accepts `/statistics?month=2026-08`, and rejects
    `//evil.example`, `https://evil.example`, a backslash host, an empty value,
    and a value containing a control character.
11. Denied results never expose the raw persisted role value to the caller.

Application-level verification performed by hand in development, recorded in
the implementation record:

- direct navigation to `/statistics` as a `user`;
- direct navigation to `/trainings/new` and `/trainings/<id>/edit` as a `user`;
- an anonymous request to a protected path lands on `/login?next=...` and
  returns to that path after login;
- an `owner` sees the admin navigation and admin training controls.

## Implementation sequence

1. Confirm the branch and that no database work is required.
2. Add `lib/auth/redirects.ts` with `safeNextPath()` and its unit tests.
3. Rewrite `lib/auth/dal.ts` around `cache()`, `toAuthResult`, and the guards.
4. Update `proxy.ts`: `next` parameter and the `/statistics` matcher entry.
5. Update the protected layout, pages, and Server Actions to the guards.
6. Update the login page to consume `next`.
7. Fix the two client components that still compare `role === 'admin'`.
8. Run `npm test`, `npx tsc --noEmit`, `npx prettier --check`, and
   `npm run build`.
9. Update `001`, `AGENTS.md`, and the `AUTH-003` register entry in overview
   `02`.

## Verification and acceptance

`B3` is complete only when all of the following hold:

- one render pass performs at most one identity lookup and one profile query;
- a missing profile, a query error, or an unknown role denies access instead of
  falling back to `user`;
- every protected page, layout, and Server Action performs its own guard call
  and is safe when invoked directly;
- `owner` passes admin guards and `admin` fails owner-only guards;
- redirect destinations are same-origin paths only;
- `npm test` passes and the build status is recorded;
- no database, RLS, grant, or Supabase client trust boundary changed.

## Deployment and rollback

Application-only release. No migration, no database rollback. Rollback is a
revert of the branch; the previous behavior was less strict, so a revert widens
access rather than breaking data.

## Explicit testing decision

This block is verified with unit tests over the DAL and the redirect helper,
using mocked Supabase clients, plus recorded manual checks of direct route
access in development. Component and browser E2E tests remain with the blocks
that introduce their boundaries (`B6`, `B7`).

## Implementation record

Branch `Auth-b3-dal-route-protection`, created from `development` on
2026-09-01. Application-only change; no migration was written and no database
object was touched.

Delivered:

- `lib/auth/redirects.ts` — `DEFAULT_REDIRECT`, `LOGIN_PATH`,
  `PATHNAME_HEADER`, `safeNextPath()`, and `loginPathWithNext()`. Rejects
  protocol-relative and backslash hosts, absolute URLs, relative paths, control
  characters, and the login page itself.
- `lib/auth/dal.ts` rewritten: `auth()` is wrapped in React `cache()` and
  returns the `Session` union (`unauthenticated` / `denied` / `authenticated`).
  The role is parsed through `toAuthResult`, so a missing profile, a failed
  profile query, or an unknown role denies access. The user id comes from the
  verified Supabase identity, not from the profile row.
- Guards `requireUser()`, `requireCapability()`, `requireAdmin()`,
  `requireOwner()`, and the Route Handler variant `authorizeRequest()` that
  returns `401` / `403` responses with Slovak messages.
- `proxy.ts` sets the `x-pathname` header (overwriting any client-supplied
  value), redirects anonymous callers to `/login?next=<safe path>`, and its
  matcher now includes `/statistics`.
- `app/(protected)/layout.tsx` requires a user through the DAL, so the
  protected shell no longer depends on the matcher alone.
- Protected pages and Server Actions call the guards:
  `statistics`, `trainings/new`, and `trainings/[id]/edit` use `requireAdmin()`;
  `calendar`, `trainings`, and `profile` use `requireUser()`;
  `services/actions/trainings.ts` and `removeParticipantAction` use
  `requireAdmin()`; the remaining registration and profile actions use
  `requireUser()`. The repeated
  `auth()` + `hasAdminCapabilities()` + `redirect()`/`throw` sequence is gone.
- The login page and `app/auth/callback/route.ts` carry a `next` value through
  password and Google sign-in, always filtered by `safeNextPath()`.
- `components/layout/Navigation.tsx` and `components/trainings/TrainingList.tsx`
  use `hasAdminCapabilities()` and the `Role` type. This fixes the `B2`
  leftover where an `owner` saw no admin navigation and no admin training
  controls.
- `tests/unit/auth/redirects.test.ts` and `tests/unit/auth/dal.test.ts` cover
  the block's test cases with mocked Supabase, `next/navigation`, and
  `next/headers`.

Verification performed:

| Check                                                     | Result                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `npm test`                                                | 6 files, 155 tests passed (was 4 files, 105 tests)                            |
| Mutation: capability check removed from `requireCapability` | 2 tests failed                                                                 |
| Mutation: denied result returned as `role: 'user'`        | 9 tests failed                                                                 |
| `npx tsc --noEmit`                                        | Passed                                                                        |
| `npx prettier --check`                                    | Passed for every touched file                                                 |
| `npm run build`                                           | Passed; route table unchanged                                                 |
| ESLint                                                    | Not run: pre-existing `ENG-001` breakage, unrelated to this block             |

Deviation from the plan, made deliberately:

- The `next` value is also threaded through Google OAuth
  (`redirectTo=/auth/callback?next=…`) and consumed in the callback handler.
  The plan named only the login page, but leaving OAuth on a hard-coded
  `/calendar` would have made the return path work for one sign-in method and
  not the other. The value passes through `safeNextPath()` on the way in and on
  the way out. The OAuth callback allowlist itself remains `B7`.
- `tests/unit/fixtures/identities.ts` now types `fullName` as `string | null`,
  matching the nullable column, so the name-fallback case can be expressed.
- `Session`, `SessionUser`, `RequestAuthorization`, `UserProfileRow`, and
  `AuthUserMetadata` live in `lib/types.ts`, not in `lib/auth/dal.ts`, per the
  type-placement convention added to `AGENTS.md` during this block.

Not covered by this block:

- The React `cache()` dedupe is asserted with a test double, because React does
  not memoize outside a request scope. The wrapping is proven, the runtime
  request-scoped behavior is not.
- Manual browser checks of direct route access were not run; the block is
  verified by unit tests and the production build only.
- `/api/calendar` stays anonymous. `authorizeRequest()` exists and is tested
  but has no caller yet; `B6` applies it.
- Server Actions now redirect unauthorized callers instead of returning a typed
  result. `ENG-005` remains open for `B6`/`B7`.
- A `denied` session (authenticated in Supabase, but no usable profile row)
  lands on `/login` with no explanation, and signing in again returns to the
  same denial. That is the intended fail-closed outcome and the `B2` CHECK
  constraint makes an invalid stored role unreachable, so only a missing
  profile row can produce it. User-facing copy for that state belongs to the
  error-handling work in `B7`.
