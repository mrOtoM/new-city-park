# Authorization Authentication Hardening Plan

## Plan identity

- **Plan number:** `001`
- **Meaning of the prefix:** sequence number for plans only; it does not
  identify an implementation block.
- **Status:** master plan
- **Normative security overview:**
  `../02-authentication-authorization-overview.md`
- **Reviewed:** 2026-08-14 against the repository on branch `development` and
  current primary guidance from Next.js, Supabase, PostgreSQL, and OWASP.
- **Target environment:** development Supabase first; production requires a
  separate, deliberate release step.

This document is the master hardening plan. It defines the implementation
blocks, their boundaries, dependencies, and verification gates. Detailed work
is performed in separate block files. A block file contains one block only and
must not contain another block hierarchy.

Use this naming convention for block files:

```text
NNN-authorization-authentication-implementation-bN-plan.md
```

The numeric prefix (`NNN`) keeps all plans in chronological order. The `B<N>`
part identifies the implementation block and is independent of the plan
prefix. The current detailed file is:

`002-authorization-authentication-implementation-b1-plan.md`

## Non-negotiable security rules

The application has exactly three application roles: `user`, `admin`, and
`owner`.

Every newly registered account must always receive the `user` role. This
applies to email/password signup, OAuth signup, future identity providers,
account linking, and every other provisioning path. A client field, request
body, query parameter, cookie, user metadata value, OAuth metadata value, or
client-supplied JWT claim must never determine the role.

Promotion from `user` to `admin` or `owner` is manual database administration
only. There must be no role-promotion UI, Server Action, Route Handler, API
endpoint, RPC, request parameter, or application-level role-management
capability. Manual promotion must be an authorized and auditable SQL operation
in the verified Supabase environment. The last-owner invariant must be
preserved.

The role hierarchy is `owner > admin > user`, but capabilities remain
explicit:

| Role    | Capability boundary                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| `user`  | Own profile, own registrations, and authenticated training/calendar access                                    |
| `admin` | User capabilities plus training management and participant data; no statistics, no role assignment           |
| `owner` | Admin capabilities plus statistics and approved owner-only security operations; no role assignment            |

`owner` is a value in `public.users`, not a PostgreSQL superuser and not an
alias for the service-role key.

The following rule is absolute: a regular-user path must never use a
service-role or secret-key client for user-data reads or writes. The
cookie-less server anon singleton must be removed. Authenticated server work
must use the cookie-bound SSR client so that RLS sees the authenticated user.

## Implementation block catalogue

The master plan contains eight blocks. Each block is intentionally small enough
to implement, deploy, and verify independently. A block may be released only
after its own tests and acceptance criteria pass.

| Block | Scope                                                           | Required verification                                           | Dependency       |
| ----- | --------------------------------------------------------------- | --------------------------------------------------------------- | ---------------- |
| `B1`  | Test foundation and pure authorization/authentication contracts | Unit tests only; no runtime permission change                   | None (done)             |
| `B2`  | Three-role data model and registration invariant                | Migration, provisioning, and role-boundary integration tests    | B1               |
| `B3`  | Auth DAL, request cache, and route protection                   | Unit plus focused request/component tests (done)                | B1, B2 contracts |
| `B4`  | Supabase client boundaries and service-role removal             | Client-boundary and development integration tests (done)        | B3               |
| `B5`  | RLS, grants, column protection, and ownership enforcement       | Real development RLS/Data API/grant tests (done)                | B4               |
| `B6`  | Calendar API, Server Actions, and atomic registration           | API/action integration and selected E2E tests (done)            | B5               |
| `B7`  | Login, signup, reset, redirect, and rate-limit hardening        | Auth-flow integration and selected E2E/security tests           | B3, B6           |
| `B8`  | Key migration, final audit, regression, and release             | Full regression, E2E, security smoke, build, and release checks | B1-B7            |

The first detailed block file is `002` and implements `B1`. Future block files
receive the next available plan prefix while retaining their block identifier.

`B1` is implemented and verified; the implementation record is in `002`.
`B2` is implemented and verified on the development database; the
implementation record is in
`007-authorization-authentication-implementation-b2-plan.md`. `B3` is
implemented and verified by unit tests and the production build; the
implementation record is in
`008-authorization-authentication-implementation-b3-plan.md`. `B4` is implemented; the
implementation record is in
`009-authorization-authentication-implementation-b4-plan.md`. `B5` is implemented; the
implementation record is in
`010-authorization-authentication-implementation-b5-plan.md`. `B6` is implemented; the
implementation record is in
`011-authorization-authentication-implementation-b6-plan.md`. `B7` is the next
block; its detailed file is
`012-authorization-authentication-implementation-b7-plan.md`, written but not
yet implemented.

## B1 - Test foundation and pure authorization/authentication contracts

**Purpose:** establish a repeatable test harness and lock down the pure
security contracts before changing runtime permissions.

**Scope:** role validation, capability mapping, fail-closed behavior, typed
authentication results, and test fixtures for anonymous, user, admin, and
owner identities. No database privilege, RLS policy, route, or production
authentication behavior changes belong here.

**Verification:** unit tests only. The detailed implementation plan is
`002-authorization-authentication-implementation-b1-plan.md`.

**Release condition:** the test command is reproducible, the security contract
tests pass, and the baseline build/lint status is recorded.

## B2 - Three-role data model and registration invariant

**Purpose:** make the role model explicit without creating an application
promotion path.

**Scope:** audit `public.users.role`; allow exactly `user`, `admin`, and
`owner`; preserve a literal `role = 'user'` in the signup trigger; verify all
email, OAuth, linking, and future provisioning paths; document manual SQL
promotion; protect the last owner; and add application role/capability types.

**Verification:** development migration tests, signup metadata-injection tests,
manual promotion/demotion tests, last-owner tests, and role parsing unit tests.

**Release condition:** every new account is `user`; only an authorized manual
database operation can create `admin` or `owner`; no application surface can
change `public.users.role`.

## B3 - Auth DAL, request cache, and route protection

**Purpose:** centralize authentication and make authorization checks explicit
at every server entry point.

**Scope:** React-cached `auth()` for one request/render pass; `requireUser()`,
`requireAdmin()`, and `requireOwner()`; fail-closed unknown roles; Next.js 16
`proxy.ts` migration; session refresh; safe same-origin `next` redirects; and
`401`/`403` responses from Route Handlers.

**Verification:** unit tests for role/capability decisions plus focused tests
for direct page, Route Handler, and Server Action access. Verify that `owner`
passes admin checks but not owner-only checks unless explicitly allowed.

**Release condition:** duplicate auth/profile queries are removed within one
render pass and direct requests cannot bypass the DAL.

## B4 - Supabase client boundaries and service-role removal

**Purpose:** eliminate privileged access from regular-user data paths.

**Scope:** remove the cookie-less anon singleton from `lib/supabase.ts`; keep a
cookie-bound SSR client for authenticated server work; isolate a `server-only`
privileged client with no fallback to anon; move regular-user reads and writes
to the SSR client; derive user identity inside the DAL/query; and keep
service-role access only behind an explicit admin/owner/system check.

This includes `getRegistrationCounts`, `getUserRegistrations`,
`getTrainingParticipants`, `getStatisticsData`, `updateUserPhone`, and
`registerForTraining`. Admin data functions must protect themselves and not
rely only on the calling page.

**Verification:** import inventory, regular-user integration tests, privileged
path tests, and a missing-secret test proving that the privileged client fails
closed instead of silently becoming anon.

**Release condition:** no regular-user path uses service-role and every
authenticated user-data query reaches RLS through the cookie-bound client.

## B5 - RLS, grants, column protection, and ownership enforcement

**Purpose:** make PostgreSQL enforce the same boundaries independently of the
application UI or route structure.

**Scope:** extend admin policies to include `admin` and `owner`; protect
`public.users.role`, `id`, and `email`; use table-level privilege revocation
followed by explicit column grants; restrict registration updates to allowed
columns and the row owner; verify Data API grants and default privileges; and
keep role assignment outside application policies and RPCs.

The migration must inspect existing grants before changing them. The intended
shape is:

```sql
REVOKE UPDATE ON TABLE public.users FROM authenticated;
REVOKE UPDATE ON TABLE public.users FROM anon;
GRANT UPDATE ("phoneNumber") ON TABLE public.users TO authenticated;
```

The exact editable profile columns must be confirmed against the schema before
the migration is written. A column-level revoke alone must not be treated as a
replacement for removing a broad table-level UPDATE privilege.

**Verification:** real development Supabase tests as `anon`, `authenticated`,
`user`, `admin`, and `owner`; direct Data API attempts to change protected
columns; cross-user reads/writes; and grant/default-privilege inspection.

**Release condition:** RLS and PostgreSQL grants deny self-escalation and
cross-user access even when the application is bypassed.

## B6 - Calendar API, Server Actions, and atomic registration

**Purpose:** close exposed application entry points and remove the registration
capacity race.

**Scope:** require authentication for `/api/calendar` and return `401` to
anonymous callers; use the SSR client and a minimum DTO; remove the accidental
public `trainings` policy unless a separate public endpoint is approved; guard
every Server Action by capability and ownership; return typed results for
expected form errors; and replace `count` followed by `insert` with one atomic
database operation.

**Verification:** direct API requests, direct Server Action POST requests,
typed-error tests, authorization bypass tests, and concurrent registration
integration tests proving that `maxParticipants` cannot be exceeded.

**Release condition:** `/api/calendar` is not accidentally public, expected
form failures are readable and typed, and capacity is enforced atomically.

## B7 - Login, signup, reset, redirect, and rate-limit hardening

**Purpose:** complete the authentication-specific protections that are outside
the authorization DAL.

**Scope:** rate limiting for login, signup, password reset, and public
endpoints; `NEXT_PUBLIC_SITE_URL` validation; exact OAuth callback allowlists;
safe same-origin redirects; generic signup and reset responses that do not
enumerate accounts; cookie/session refresh verification; secure cache and
referrer behavior; and safe generic UI error mapping.

**Verification:** auth-flow integration tests, invalid redirect tests,
enumeration tests, repeated-submission tests, `429` tests, expired-session
tests, and selected browser E2E flows.

**Release condition:** authentication flows do not disclose account existence,
cannot redirect off-origin, and excessive requests are rejected safely.

## B8 - Key migration, final audit, regression, and release

**Purpose:** close the remaining operational gaps and verify the complete
hardening result.

**Scope:** migrate legacy `anon`/`service_role` keys to publishable/secret keys
where supported; verify secrets are absent from bundles, logs, and responses;
rotate old keys with an approved fallback window; repeat the role, RLS, grant,
service-role, API, action, and authentication checks; and prepare release
sign-off with branch, environment, migrations, rollback, and uncertainty.

**Verification:** full unit, integration, RLS/Data API, API/action, E2E,
security-smoke, lint, TypeScript, and production-build checks.

**Release condition:** all previous block gates pass, production approval is
explicit, and the active Supabase environment and secret rotation state are
verified without exposing secret values.

## Release gates for every block

A block may be deployed independently only when:

1. its own tests and acceptance criteria pass;
2. it does not grant broader access than the previous release;
3. compatibility with the next block has been checked;
4. a rollback or forward-fix procedure exists;
5. the active branch and development Supabase URL are verified;
6. no secret values appear in logs or build artifacts;
7. no application code path can change `public.users.role`;
8. every new registration still receives `user`.

Database changes follow expand -> migrate -> contract: add a compatible path,
switch the application, then remove the old path or privilege in a later
release. Production database changes are never part of local verification.

## Master-plan acceptance criteria

- Every email, OAuth, or future-provider registration creates a
  `public.users` row with `role = 'user'`.
- Injecting `admin` or `owner` through signup metadata, OAuth metadata, a
  request body, form, query parameter, cookie, or JWT claim cannot change the
  role.
- Promotion to `admin` or `owner` is performed only by an authorized manual
  database operation and is auditable.
- No regular-user path uses a service-role or secret-key client.
- The cookie-less server anon singleton is removed.
- Anonymous requests to `/api/calendar` receive `401` and do not receive all
  trainings by accident.
- A regular user cannot access statistics, admin/owner training operations,
  another user's data, or an admin Server Action directly.
- `public.users.role`, `id`, and `email` cannot be changed by an authenticated
  user through the Data API.
- Expected form failures use typed results; unexpected failures do not expose
  tokens, keys, or personal data.
- Signup and password reset do not reveal account existence and excessive
  requests receive `429`.
- All block-level tests and final release verification pass in development
  before production approval.

## Primary sources

- [Next.js Authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Supabase SSR client for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase migration to publishable/secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [PostgreSQL REVOKE](https://www.postgresql.org/docs/current/sql-revoke.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [OWASP REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
