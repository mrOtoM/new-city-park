# Authorization Authentication Implementation Plan - B1

## Plan identity

- **Plan number:** `002`
- **Prefix meaning:** chronological plan order only; it is not the block
  number.
- **Implementation block:** `B1`
- **Master plan:** `001-authorization-authentication-hardening-plan.md`
- **Scope:** test foundation and pure authorization/authentication contracts
- **Target environment:** local development first; no production change

This document contains exactly one implementation block: `B1`. It is a
standalone plan and does not contain a nested block sequence.

## Objective

Create a reliable unit-test foundation and define the pure security contracts
that later runtime changes must obey. This block must be safe to implement and
deploy independently because it does not change database permissions, RLS,
routes, session behavior, or role assignment.

## Verified repository baseline

- `package.json` currently exposes `dev`, `build`, `start`, and `lint` scripts,
  but no test script.
- No test-runner configuration was found in the repository during plan
  preparation.
- `lib/auth.ts` currently performs the Supabase session/profile lookup directly
  and falls back to `user` when the profile role is missing. The intended
  security contract is fail-closed for missing or unknown persisted roles; the
  runtime refactor belongs to a later block, but this block must lock down the
  contract with unit tests.

Do not add a test dependency without explicit approval. First inspect the
available project/runtime options and then use the smallest approved unit-test
runner. The chosen runner and command must be recorded in the implementation
change.

## Scope

### Test harness

- Add a reproducible unit-test command to the project scripts.
- Add the selected runner configuration with TypeScript support if required.
- Keep tests deterministic and independent of Supabase, network access,
  cookies, filesystem state, wall-clock time, and real secrets.
- Add a clear test fixture factory for anonymous, user, admin, and owner
  identities.
- Ensure the unit suite can run locally and in CI without a live database.

### Pure role contract

Define and test a single source of truth for the application role type:

```text
Role = user | admin | owner
```

The contract must:

- accept only the three exact lowercase values;
- reject `null`, `undefined`, empty strings, arbitrary strings, and malformed
  values;
- fail closed for a missing or unknown persisted role;
- never convert untrusted metadata into a privileged role;
- keep `owner` distinct from both `admin` and the service-role key.

The tests must explicitly cover attempted `admin` and `owner` injection through
signup-style metadata and request-shaped input. These are pure contract tests;
they do not replace the later database/provisioning tests.

### Pure capability contract

Define and test capability decisions independently from UI visibility:

- a `user` can use only regular-user capabilities;
- an `admin` can use explicitly approved admin capabilities;
- an `owner` can use admin capabilities and only explicitly approved owner
  capabilities;
- an `owner` capability must not imply role assignment;
- no role can grant service-role access through the application contract;
- unknown roles receive no capability.

Use table-driven tests so that adding a capability later requires an explicit
test case and an explicit decision.

### Pure authentication result contract

Define the result shapes that the authorization layer will consume without
performing network or database work. At minimum, distinguish:

- unauthenticated;
- authenticated regular user;
- authenticated admin-capable user;
- authenticated owner-capable user;
- authenticated user with an invalid or missing role, which must fail closed.

Do not implement user-facing Server Action error handling in this block. The
typed form-result contract is verified together with the Server Actions that
return it.

## Unit-test cases

The unit suite must cover at least:

1. every valid role is accepted;
2. every missing, unknown, mixed-case, or malformed role is denied;
3. `user` does not receive admin or owner capabilities;
4. `admin` receives admin capabilities but not owner-only capabilities;
5. `owner` receives admin capabilities and only explicitly approved owner
   capabilities;
6. no role receives a role-assignment capability;
7. metadata containing `admin` or `owner` cannot change the trusted role;
8. malformed identity input produces an unauthenticated or denied result;
9. fixture identities are isolated and cannot mutate one another;
10. the tests do not require a Supabase URL, anon key, service-role key, or
    network connection.

## Implementation sequence

1. Confirm the active branch is `development` and record the current lint,
   build, and dependency baseline without printing secrets.
2. Inspect the repository for an existing test convention and choose the
   smallest approved unit-test setup.
3. Add the unit-test script and minimal configuration.
4. Add pure role, capability, and authentication-result contracts in the
   project location that will be shared by the later auth DAL.
5. Add deterministic identity fixtures and table-driven unit tests.
6. Run the new unit suite, lint, and production build.
7. Record the exact commands, results, and any pre-existing failures.

No migration, RLS policy, grant, Supabase client, Proxy/middleware, API route,
Server Action, rate limiter, redirect configuration, or environment secret is
changed in this block.

## Verification and acceptance

The block is complete only when all of the following are true:

- the unit-test command is documented and reproducible;
- all pure role and capability tests pass;
- missing and unknown roles fail closed;
- metadata injection cannot produce an admin or owner authorization result;
- owner is represented as a distinct application role, not as service-role;
- no test requires a live Supabase project or real secret;
- lint and production build pass, or a pre-existing failure is documented;
- no runtime permission or database behavior changed;
- the resulting changes are independently revertible without a database
  rollback.

## Deployment and rollback

This is a test-foundation release. It may be merged and deployed with no
database migration and no permission change after the acceptance criteria pass.

Rollback is limited to reverting the test harness, pure contracts, and test
fixtures. It must not require changing production data, roles, grants, or RLS.

## Explicit testing decision

This first implementation block uses unit tests only. Higher-level tests are
not postponed until the end: they are added in the later standalone block that
introduces each runtime boundary. Database/RLS tests begin when database
privileges change, API/action tests begin when direct entry points change, and
selected E2E tests begin when browser authentication flows change. The final
release repeats the complete matrix.
