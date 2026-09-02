# Engineering Quality Overview

## Document role

- **Type:** normative, long-lived engineering-quality overview
- **Reading order:** fourth project overview
- **Scope:** TypeScript safety, input boundaries, error handling, logging,
  dependencies, testing, verification, configuration, performance, and handoff
- **Last reviewed:** 2026-08-14 against the `development` branch, Next.js 16,
  TypeScript strict mode, and current primary guidance

This document defines how a change is made trustworthy. It does not define
business rules, file ownership, visual design, or authorization capabilities.
Those belong respectively to domain documentation,
`01-application-architecture-overview.md`,
`03-ui-design-system-overview.md`, and
`02-authentication-authorization-overview.md`.

Quality gates are proportional to risk. A documentation correction does not
need an E2E test; a database permission change cannot be accepted with only a
unit test.

## Engineering principles

1. Verify the current branch, working tree, runtime, and environment before
   changing them.
2. Prefer the smallest complete change that satisfies the requirement.
3. Preserve unrelated tracked and untracked user work.
4. Treat every external or caller-controlled value as untrusted.
5. Make expected failures explicit and keep unexpected failures observable.
6. Test at the lowest layer that proves the contract, then add higher-layer
   tests where boundaries can fail independently.
7. Do not add dependencies, abstractions, directories, or compatibility shims
   for hypothetical future needs.
8. A successful command is evidence only for what that command actually checks.
9. Record what was verified, what was not verified, and remaining uncertainty.

## TypeScript contract

The project uses strict TypeScript. New and changed code must:

- avoid `any`; use `unknown` at untrusted boundaries and narrow it;
- avoid unchecked type assertions for FormData, JSON, environment values,
  database results, URL parameters, and caught exceptions;
- avoid `@ts-ignore`; use `@ts-expect-error` only for an intentional tested
  compiler contract with an explanatory comment;
- prefer discriminated unions for finite states and typed results;
- use literal unions or `as const` maps rather than TypeScript `enum`;
- expose return types on public cross-module functions when inference does not
  make the contract immediately clear;
- keep generated database types separate from narrower application DTOs;
- model impossible states out of the API instead of adding boolean combinations
  that callers can misuse.

Caught JavaScript values are not assumed to be `Error`:

```ts
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}
```

This example is for internal classification only. It does not authorize sending
the resulting raw message to a user or API client.

## Input and validation boundaries

Validate and normalize data at the first trusted server boundary:

- FormData in Server Actions;
- JSON bodies in Route Handlers;
- URL parameters and search parameters;
- cookies and headers;
- environment variables;
- webhook or external API payloads;
- database values that predate current constraints.

Client validation and HTML attributes improve user experience but never replace
server validation. Authorization is performed before any mutation and is not a
validation substitute.

Validation rules should be colocated with their first real consumer. Promote a
validator to `services/validators/` only when a second consumer needs the same
contract. Do not add a validation dependency without explicit approval; if one
is later approved, it must not duplicate browser, action, and database schemas
without a clear source-of-truth strategy.

## Error handling and observability

### Error taxonomy

Every failure is classified before deciding how to represent it.

| Category                        | Examples                                                      | Handling                                                       |
| ------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Expected input error            | Missing field, invalid date, invalid format                   | Typed result with field/general error                          |
| Expected domain conflict        | Already registered, full capacity, deadline passed            | Typed result or `409` API response                             |
| Authentication/authorization    | Missing identity, insufficient capability                     | Auth overview contract; `401`/`403` for APIs                   |
| Not found                       | Missing route resource or record                              | `notFound()` for pages or `404` API response                   |
| Rate limit                      | Too many requests                                             | Safe typed response and `429` for APIs                         |
| External dependency failure     | Supabase outage, email provider timeout                       | Log safe context; retry only when safe; return generic failure |
| Configuration/invariant failure | Missing server secret, impossible state, corrupt trusted data | Fail closed, log, and treat as unexpected                      |
| Programmer defect               | Null misuse, unreachable branch reached, rendering exception  | Throw; handle at an error boundary; fix the defect             |

Expected errors are part of normal application operation and must be represented
explicitly. Unexpected exceptions indicate that the requested result cannot be
trusted; they are logged safely and allowed to reach the appropriate framework
boundary.

### Typed expected results

Server Actions and other form-oriented mutations return a discriminated result
for expected failures. An action-specific type is preferred until multiple
actions genuinely share the same contract:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      code: 'VALIDATION_ERROR' | 'CONFLICT' | 'FORBIDDEN'
      message: string
      fieldErrors?: Record<string, string[]>
    }
```

Rules:

- `message` is safe Slovak user-facing copy, not a vendor or database message;
- `code` is stable enough for presentation logic and tests;
- `fieldErrors` uses submitted field names and contains no sensitive values;
- expected errors do not depend on `throw new Error('Unauthorized')` or another
  exception whose production representation may become an opaque digest;
- success data is the minimum DTO required by the caller;
- do not introduce one global result abstraction until real reuse proves its
  shape.

### Exceptions and framework control flow

Throw for unexpected failures, missing required server configuration, and
violated trusted invariants. Do not catch an exception merely to throw a new
generic exception and lose the useful cause.

Next.js `redirect()`, `notFound()`, and related framework functions use control
flow that throws internally. Call them outside broad `try/catch` blocks or
rethrow them unchanged. A generic catch must not convert a valid redirect or
404 into a `500`.

### Error ownership by layer

| Layer                            | Responsibility                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| UI component                     | Display safe typed errors and recovery actions; never classify raw infrastructure errors                         |
| Page/Server Action/Route Handler | Validate boundary input, authorize, map expected outcomes to presentation or HTTP contracts                      |
| Service                          | Translate known database/provider outcomes into application-level results; preserve unexpected causes internally |
| Infrastructure module            | Report typed/raw provider failure to the service; never decide user-facing copy                                  |
| `error.tsx`                      | Last-resort UI for uncaught route exceptions; show safe generic text and retry where valid                       |
| Logging/monitoring               | Preserve diagnostic context without exposing secrets or unnecessary personal data                                |

Do not let Supabase, Postgres, Resend, network, or stack-trace messages cross
directly into a component or API response.

### Route Handler status contract

Use HTTP status codes consistently:

| Status | Meaning in this application                                           |
| ------ | --------------------------------------------------------------------- |
| `400`  | Malformed request or body that cannot be interpreted                  |
| `401`  | Authentication is missing or invalid                                  |
| `403`  | Identity is valid but lacks the required capability or ownership      |
| `404`  | The requested resource does not exist or must not be disclosed        |
| `409`  | Current resource state conflicts with the operation                   |
| `422`  | Request syntax is valid but submitted values fail semantic validation |
| `429`  | Rate limit exceeded                                                   |
| `500`  | Unexpected server failure with a generic response body                |

Do not return `200` with `{ error: ... }` for a failed API operation. Do not
redirect an API caller to an HTML login page. Whether a protected missing
resource returns `403` or a non-disclosing `404` is a deliberate security
contract owned with the auth overview.

### Error UI

- Expected field errors stay with the form and preserve safe submitted values.
- Expected page-level errors appear in normal page flow with a useful next
  action.
- Missing page resources use `notFound()` and the nearest `not-found.tsx`.
- Uncaught route errors use the nearest `error.tsx` boundary.
- A root/global fallback displays generic Slovak copy and may expose a safe
  support/reference identifier, never `error.message`, stack, digest, query, or
  secret.
- Retry is offered only when rerunning the operation is safe and meaningful.
- Error presentation follows the UI overview's accessibility and focus rules.

### Logging rules

Log enough structured context to diagnose a failure, but no more. Until a
dedicated logger or monitoring service is approved, server-side logging should
remain minimal and intentional.

Useful context may include:

- operation or event name;
- route or service name;
- safe internal entity identifier when needed;
- result category and severity;
- HTTP status;
- sanitized provider error code;
- request/correlation identifier if one exists.

Do not log:

- passwords, reset links, session cookies, access/refresh tokens, API keys,
  secrets, or connection strings;
- complete request headers or bodies;
- raw FormData;
- participant lists or unnecessary names, emails, and phone numbers;
- unreviewed raw Supabase/Resend objects that may contain protected values;
- environment-variable values.

Sanitize caller-controlled log fields to prevent line-break or delimiter
injection. Logging failure must not broaden access, change authorization, or
turn a recoverable user operation into data corruption.

### Retry and recovery

- Never automatically retry a non-idempotent mutation unless idempotency is
  designed and tested.
- Retry transient reads or external calls only with a bounded policy and a
  clear timeout.
- Do not retry validation, authorization, not-found, or deterministic conflict
  errors.
- Background email failure must not silently roll back an already committed
  database mutation unless the operation was explicitly designed as one atomic
  workflow.
- A UI retry must not duplicate the original mutation.

### Error testing

Test both the failure and the information boundary:

- unit tests for classification, typed result mapping, and safe message maps;
- integration tests for Server Action and Route Handler responses;
- database tests for constraint/RLS errors that the service translates;
- error-boundary tests for generic rendering and retry behavior;
- security tests proving secrets, raw provider messages, and protected data are
  absent from responses and logs;
- E2E tests only for critical recoverable user journeys.

## Dependency policy

- Do not add, update, or replace a dependency without explicit approval.
- Search the platform, React, Next.js, browser APIs, and installed packages
  before proposing a dependency.
- Explain the current need, maintenance/security cost, bundle/runtime impact,
  and why existing capabilities are insufficient.
- Keep package and lockfile changes together.
- Do not add overlapping libraries for icons, dates, validation, styling,
  state, or testing.
- A dependency used only to avoid a small readable function is usually not
  justified.
- Remove a dependency only after an import/runtime inventory proves it is
  unused.

## Test strategy

Test locations are defined by the architecture overview. This document defines
which evidence is required.

| Change type                    | Minimum verification                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Documentation only             | Link/reference scan, formatting, consistency review                                                              |
| Pure file move                 | File/import inventory, TypeScript, route comparison when relevant, diff review                                   |
| Pure calculation or parser     | Focused unit tests including edge and failure cases                                                              |
| Reusable interactive component | Behavior test plus keyboard/accessibility review                                                                 |
| Server Action                  | Unit tests for pure contracts and integration tests for direct invocation, auth, validation, and expected result |
| Route Handler                  | Integration tests for method, status, DTO, auth, invalid input, and unexpected failure                           |
| Auth boundary                  | Unit, request-level integration, and selected E2E tests defined by the auth overview                             |
| Database migration/RLS/grant   | Migration replay and real database tests as relevant roles                                                       |
| Cross-layer user journey       | Focused E2E only when lower layers cannot prove the complete contract                                            |

### Test commands

| Command            | Scope                                                    |
| ------------------ | -------------------------------------------------------- |
| `npm test`         | Vitest, one run over `tests/unit/**/*.test.ts`           |
| `npm run test:watch` | Same suite in watch mode during local development      |

The runner is Vitest, configured in `vitest.config.mts`, which resolves the
`@/*` alias the same way `tsconfig.json` does. The unit suite must stay free of
Supabase, network access, filesystem state, wall-clock time, and real secrets;
`environment: 'node'` is intentional until a block introduces component tests.

Additional rules:

- Test public behavior and contracts, not private implementation details.
- A regression fix includes a test that fails for the original defect when
  practical.
- Keep fixtures minimal, explicit, deterministic, and free of real personal
  data.
- Do not use large snapshots as a substitute for meaningful assertions.
- Mock only outside the contract under test; database authorization requires a
  real database boundary.
- Tests must not depend on production credentials or production data.
- Flaky tests are defects and must not be ignored or retried indefinitely.

## Static and build verification

The intended complete local/CI gate is:

1. formatting check;
2. ESLint;
3. TypeScript without emit;
4. unit tests;
5. applicable integration/database/E2E tests;
6. production build.

Not every change needs every expensive test locally, but a release runs the
complete applicable suite. Never report a check as passing if it was skipped,
blocked, or failed for a pre-existing reason.

Generated files and caches are not proof of a clean checkout build. Final
release verification must run from a reproducible environment with documented
configuration and without production secrets.

## Configuration and environment

- Environment variable names and safe placeholders belong in `.env.example`;
  secret values do not.
- Server-only values are never prefixed with `NEXT_PUBLIC_`.
- Validate required server configuration before the protected operation; do
  not silently fall back to a weaker client or environment.
- Verify the active Supabase URL/environment before SQL, migration, or data
  changes without printing credentials.
- Local development uses the development project only.
- Production changes require an explicit release step and cannot be inferred
  from local success.
- A missing optional integration must have an explicit degraded behavior; a
  missing security-critical value fails closed.

## Performance and reliability

- Default to Server Components and move the client boundary down to the first
  component that requires browser behavior.
- Run independent reads in parallel when their authorization and failure
  semantics permit it.
- Select only required database columns and return minimum DTOs.
- Avoid request waterfalls caused by repeated auth/profile work; use the
  request-cached auth DAL defined by the auth overview.
- Do not add memoization, caching, pagination, or indexes without a current
  measured or structurally clear need.
- Mutations that enforce capacity, uniqueness, ownership, or other race-prone
  invariants belong in an atomic database operation.
- External calls use explicit timeout and failure behavior when the underlying
  API supports it.

## Change and handoff discipline

Before implementation:

1. inspect branch and working tree;
2. read the relevant overview and plan;
3. inventory affected consumers and boundaries;
4. identify the required verification layer;
5. record assumptions that materially affect scope.

Before handoff:

1. inspect the final diff and status;
2. run the applicable verification;
3. confirm unrelated user work is preserved;
4. report files changed and the behavior affected;
5. report checks passed, checks not run, known pre-existing failures, and
   remaining uncertainty;
6. state explicitly whether database, environment, production, dependency, or
   secret state changed.

## Change rules

- Update this overview when the approved error contract, verification matrix,
  dependency policy, or delivery gate changes.
- Keep tool-specific commands in project configuration or a plan when they are
  transitional; keep stable quality expectations here.
- Do not move business rules into this document. Business tests consume these
  quality rules but define their own domain outcomes elsewhere.
- Adding an observability provider, centralized logger, retry framework, or
  global error catalogue requires an explicit plan and dependency/security
  review.

## Sources

- [Next.js error handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js `notFound()`](https://nextjs.org/docs/app/api-reference/functions/not-found)
- [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [HTTP Semantics status codes](https://www.rfc-editor.org/rfc/rfc9110.html#name-status-codes)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

## Deferred work register

This register contains verified engineering-quality findings. `Open` entries
have no approved implementation plan and must not be mixed into unrelated work.

| ID        | Deferred finding and exit condition                                                                                                                                     | Status  | Tracking                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------- |
| `ENG-001` | `npm run lint` uses removed `next lint`, while direct ESLint fails in the current compatibility configuration. Resolve when the supported direct ESLint command passes. | Open    | Requires a delivery/tooling plan        |
| `ENG-002` | `.github/copilot-instructions.md` sections 2 and 3 were corrected, but its code examples still come from an unrelated cabins/bookings tutorial and show NextAuth, `app/_lib/`, `app/_components/`, `date-fns`, and heroicons. Resolve when every example matches this repository.                | Open    | Requires a documentation pass           |
| `ENG-003` | `.env.example` and `.github/workflows/ci.yml` now exist, running `npm test` and `npm run build` with placeholder values. Resolve when a run on GitHub actually passes.  | Open    | Awaiting first CI run                   |
| `ENG-005` | Training create/update/delete still throw on expected failures such as a missing form field; production replaces the message with a digest. The registration actions were converted to typed results in `B6`. Resolve when every action returns a typed result. | Open    | Requires a form-handling plan           |
| `ENG-006` | Several paths log raw provider errors through `console.error`. Resolve when logging uses reviewed safe context and tests exclude secrets/PII.                           | Open    | Requires an error-handling/logging plan |
| `ENG-007` | Production build depends on fetching a Google Font. Resolve when the approved font strategy builds deterministically without unintended external network dependency.    | Open    | Requires a delivery/UI plan             |
| `ENG-010` | The Supabase CLI cannot open a database connection to the production project `uklqoodkivkwswnyksza`; it fails while creating `cli_login_postgres`, so that project has no migration history and its migrations are pasted into the SQL Editor by hand. Resolve when `npx supabase migration list` succeeds against it. | Open    | Support request with Supabase           |
| `ENG-009` | The validation layer is only started. `services/validators/password.ts` exists after `B7`, but `updatePhoneAction` still writes caller-supplied text straight to `public.users` and the training form is unvalidated. Resolve when action inputs are parsed and normalized before the mutation, with tests for rejected input. | Open    | Requires a validation plan              |
| `ENG-008` | Generated development database types are absent. Resolve when generation is reproducible and clients consume them without hand-editing the generated file.              | Open    | Requires a data/tooling plan            |
