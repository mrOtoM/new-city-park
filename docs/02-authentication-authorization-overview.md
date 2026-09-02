# Authentication and Authorization Overview

## Document role

- **Type:** normative, long-lived security overview
- **Reading order:** second project overview
- **Scope:** identity, sessions, roles, capabilities, Supabase client trust,
  protected entry points, and database authorization
- **Last reviewed:** 2026-08-14 against the `development` branch and current
  primary Next.js, Supabase, PostgreSQL, and OWASP guidance

This document defines the security model that all new code must follow. It is
not proof that every control is implemented. Known gaps and their rollout are
tracked in `plans/001-authorization-authentication-hardening-plan.md`.

Physical file placement is defined by
`01-application-architecture-overview.md`. If a security change needs a new
module, follow both documents: this overview defines its trust boundary and the
architecture overview defines its location.

The physical placement work from architecture plan `003` is complete for the
existing route, component, auth, and Supabase modules. This is only a structural
status; the authentication and authorization controls below remain governed by
plan `001` and its deferred-work register.

## Security model

The application separates three concerns:

1. **Authentication** verifies the Supabase Auth identity.
2. **Session management** carries and refreshes the authenticated identity
   through cookie-bound browser/server requests.
3. **Authorization** decides which data and operations that verified identity
   may access.

Authentication never implies unrestricted authorization. Hiding a link,
placing a page in `(protected)`, or passing Proxy is not sufficient protection
for a query, mutation, Server Action, or Route Handler.

## Roles and provisioning invariant

The application has exactly three application roles:

```text
user < admin < owner
```

The hierarchy supplies inherited baseline capabilities, but authorization is
implemented through explicit capability checks rather than arbitrary string
comparisons throughout the application.

| Role    | Approved capability boundary                                                                       |
| ------- | -------------------------------------------------------------------------------------------------- |
| `user`  | Own profile, own registrations, and authenticated training/calendar access                         |
| `admin` | All user capabilities plus training management and participant data; no statistics                 |
| `owner` | All admin capabilities plus statistics and explicitly approved owner-only security operations      |

No role has an application capability to assign roles.

Every newly registered account must always receive the literal `user` role.
This applies to email/password registration, OAuth, future identity providers,
account linking, imports, and every other provisioning path. The database
provisioning function must assign `user` directly and must ignore any requested
role in form data, JSON, query parameters, cookies, user metadata, OAuth
metadata, or client-supplied claims.

Promotion from `user` to `admin` or `owner`, and demotion from either role, is
manual database administration only. It must be performed against a verified
environment by an authorized operator using an auditable SQL operation. There
must be no role-management UI, Server Action, Route Handler, public API, RPC,
or generic application service for promotion. The last-owner invariant must be
preserved.

`owner` is an application value stored in `public.users`; it is not a
PostgreSQL superuser, does not receive `BYPASSRLS`, and is not equivalent to a
Supabase service-role or secret key.

### Manual promotion and demotion procedure

This is the only approved way to change `public.users.role`. It runs in the
Supabase SQL Editor of the target project, never from application code.

1. Verify the target environment before running anything. Confirm the project
   in the Supabase dashboard and that its URL matches the intended environment.
   Do not promote in production merely to test the statement.
2. Read the current state and confirm the account is the intended one:

   ```sql
   SELECT id, email, role FROM public.users WHERE email = 'osoba@example.com';
   ```

3. Promote or demote by explicit `id`, never by a `LIKE` pattern or an
   unfiltered predicate:

   ```sql
   UPDATE public.users SET role = 'admin' WHERE id = '<uuid>';
   ```

   Allowed values are `user`, `admin`, and `owner`; the
   `users_role_allowed_values` constraint rejects anything else.
4. Verify the result with the same `SELECT` and confirm exactly one row
   changed.
5. Record who ran the change, when, on which environment, for which account,
   and why.

Demoting or deleting the last remaining `owner` fails with a
`restrict_violation` raised by the `enforce_last_owner` trigger. This is
intentional. Promote the replacement owner first, then demote the previous one.
Because `public.users.id` references `auth.users` with `ON DELETE CASCADE`, the
same guard also blocks deleting the last owner's authentication account.

## Request authorization flow

```text
Request
  ↓
proxy.ts: refresh session and perform optional optimistic routing check
  ↓
page / Server Action / Route Handler / service entry point
  ↓
lib/auth/dal.ts: verify identity and load the application role
  ↓
explicit capability or ownership check
  ↓
cookie-bound Supabase client
  ↓
PostgreSQL grants + RLS + constraints
  ↓
minimum DTO returned to the caller
```

Proxy improves routing and session refresh but is never the only security
boundary. Secure checks must run close to the protected operation and data
source. Layout checks may protect a shared shell, but every callable entry
point and privileged data function must remain independently safe when invoked
directly.

## Auth DAL contract

`lib/auth/dal.ts` is the single server-only entry point for application auth
state. It should expose a small request-cached contract such as:

- `auth()` or equivalent verified auth context;
- `requireUser()`;
- `requireAdmin()`;
- `requireOwner()`;
- explicit capability checks when a role hierarchy alone is insufficient.

The DAL must:

- verify the current Supabase identity on the server;
- load the matching `public.users` profile and role;
- fail closed for a missing profile, missing role, unknown role, query error,
  or inconsistent identity;
- derive the user ID from the verified session rather than a caller-supplied
  argument;
- use React request/render caching to avoid duplicate `getUser()` plus profile
  queries inside one render/request flow;
- return only the identity fields required by the caller.

Pure role and capability definitions belong in `lib/auth/roles.ts`. UI
components may use a verified capability result for presentation, but must not
become the authority that grants access.

## Supabase client boundaries

| Module                    | Trust and allowed use                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `lib/supabase/browser.ts` | Browser-only publishable/legacy anon client for auth and RLS-protected browser operations                                      |
| `lib/supabase/server.ts`  | Cookie-bound SSR client for authenticated Server Components, Server Actions, Route Handlers, DAL, and regular-user data access |
| `lib/supabase/session.ts` | Session refresh used by `proxy.ts`; it does not grant application capabilities                                                 |
| `lib/supabase/admin.ts`   | `server-only` privileged client for explicitly approved admin/owner/system operations after an appropriate check               |

The privileged client must fail closed when its secret is missing. It must
never fall back to a publishable/anon client. Secret and service-role keys must
never be imported into Client Components, exposed in `NEXT_PUBLIC_*`
variables, logs, responses, or browser bundles.

The absolute data-access rule is:

> A regular-user path must never use a service-role or secret-key client for
> user-data reads or writes.

Regular authenticated work uses the cookie-bound server client so PostgreSQL
receives the user's auth context and applies RLS. Privileged functions must
protect themselves; a check in the calling page alone is not sufficient.

## Protected entry-point rules

### Pages and layouts

- `(protected)` is an organizational route group, not a security primitive.
- The protected shell may require a user, but sensitive pages still perform
  their own capability checks close to data access.
- `statistics` and training-management views require an admin capability;
  `owner` inherits that capability.
- A regular user must not receive participant PII, statistics, or management
  DTO fields merely because the UI hides the corresponding control.

### Server Actions

Every Server Action is a directly callable mutation boundary and must perform:

1. authentication;
2. capability and ownership authorization;
3. input parsing, validation, and normalization;
4. mutation;
5. revalidation or redirect as appropriate.

Expected form failures return a typed result suitable for Slovak user-facing
messages. Do not depend on `throw new Error('Unauthorized')` for an expected
form outcome because production Server Action errors may be represented by an
opaque digest. Unexpected failures may throw after sensitive details are kept
out of the response and logs.

### Route Handlers

- Unauthenticated API requests return `401`.
- Authenticated requests without the required capability return `403`.
- API boundaries return minimum explicit DTOs, never unrestricted
  `select('*')` results.
- `/api/calendar` is authenticated unless a separately reviewed public
  calendar contract is intentionally introduced.
- Redirect responses are for browser navigation; APIs use status codes and
  typed response bodies.

## Database authorization

PostgreSQL is an independent authorization boundary, not merely storage behind
trusted application code.

- RLS is enabled and tested for every Data API table containing protected data.
- Policies scope regular users to their own rows and approved operations.
- Admin policies include `admin` and `owner` only where the capability is
  required.
- Table and column grants follow least privilege in addition to RLS.
- `public.users.role`, identity, and protected profile columns cannot be
  changed through a regular authenticated Data API path.
- Remove broad table-level `UPDATE` before granting updates on explicitly
  editable profile columns; an UPDATE policy alone is not the role-escalation
  control.
- `SECURITY DEFINER` functions use fully qualified names, a safe explicit
  `search_path`, narrow execution grants, and reviewed inputs.
- Capacity, uniqueness, ownership, and last-owner invariants that can race are
  enforced atomically in PostgreSQL.

RLS cannot protect a request executed with a service-role/secret authorization
context that bypasses RLS. This is why regular-user client selection is a hard
security boundary rather than a code-style preference.

## Authentication-flow protections

- `NEXT_PUBLIC_SITE_URL` must match the active environment and is used to build
  approved same-origin callback and password-reset URLs.
- Login return paths and `redirectTo` values are restricted to safe same-origin
  destinations; external or malformed redirects are rejected.
- Signup, password reset, and recovery responses do not reveal whether an
  account exists.
- Login, registration, reset, recovery, and intentionally public endpoints are
  rate-limited with environment-appropriate controls.
- OAuth callback destinations use an explicit allowlist.
- Session cookies and refresh behavior are verified without logging tokens.
- Secrets, tokens, email addresses, participant data, and internal database
  errors are not exposed through generic error responses.

## Required verification layers

| Layer                   | Security contract                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Unit                    | Role parsing, capability mapping, fail-closed behavior, typed results, redirect validation           |
| Application integration | DAL caching, direct page/action/Route Handler access, client-boundary enforcement                    |
| Database                | Registration always creates `user`; RLS, grants, ownership, protected columns, manual-only promotion |
| API/action              | `401`/`403`, minimum DTOs, typed failures, direct invocation, atomic capacity                        |
| E2E                     | Login, signup, reset, expiry, redirects, user/admin/owner journeys, rate limiting                    |
| Release audit           | No privileged key in browser bundles/logs and no regular-user service-role import                    |

Security tests are introduced in the implementation block that first changes
the relevant boundary and are all rerun before release. UI-only tests are not a
substitute for direct entry-point and database tests.

## Change rules

- Any change to roles, capabilities, provisioning, client trust, or protected
  entry points updates this overview in the same reviewed change.
- A plan may stage a migration but may not silently weaken an invariant in this
  overview.
- New roles, role-assignment surfaces, public data endpoints, privileged client
  uses, or owner-only capabilities require an explicit security decision; do
  not infer them from feature requirements.
- Production auth, secret, or database changes require a separate deliberate
  release step after development verification.

## Sources

- [Next.js authentication guide](https://nextjs.org/docs/app/guides/authentication)
- [Next.js Proxy convention](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Supabase SSR client for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&package-manager=npm&queryGroups=framework&queryGroups=package-manager)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase API key model](https://supabase.com/docs/guides/getting-started/api-keys)
- [PostgreSQL REVOKE](https://www.postgresql.org/docs/current/sql-revoke.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

## Deferred work register

The target security model is not yet fully implemented. Do not infer that a
control exists because it is documented above; use the owning plan/block to
determine implementation status.

| ID         | Deferred finding and exit condition                                                                                                                                                                                 | Status  | Tracking                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------- |
| `AUTH-007` | Redirects, site-URL validation, enumeration, and safe error copy were closed in `B7`. What remains: nobody has read the project rate limits in the Supabase dashboard and judged whether they suffice. | Open | Manual dashboard step, recorded in plan `012` |
| `AUTH-008` | The audit is done and recorded in plan `013`. Both projects still use legacy JWT keys (valid to 2035 and 2036); migrating to publishable/secret keys is an owner decision that has not been made. | Open    | Owner decision, recorded in plan `013` |
