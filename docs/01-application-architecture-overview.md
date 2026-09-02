# Application Architecture Overview

## Document role

- **Type:** normative, long-lived architecture overview
- **Reading order:** first project overview
- **Scope:** repository structure, module ownership, file placement, and
  dependency direction
- **Last reviewed:** 2026-08-14 against the `development` branch and Next.js
  App Router guidance
- **Structural hardening status:** Plan `003` completed; blocks `B1`–`B3`
  verified on 2026-08-14

This document answers where code belongs and which layer owns it. It does not
describe an implementation sequence and it does not define authentication or
authorization behavior. Security rules live in
`02-authentication-authorization-overview.md`, UI and component rules live in
`03-ui-design-system-overview.md`, engineering-quality rules live in
`04-engineering-quality-overview.md`, and migration work lives under
`docs/plans/`.

The structure below is the approved target architecture. The structural
migration defined by plan `003` is complete for blocks `B1`–`B3`, so the current
source tree now reflects the approved route, component, and existing-library
placement. `lib/auth/roles.ts` and `lib/supabase/admin.ts` now exist; `app/api/`
does not, because `B6` removed its only route. `lib/supabase/session.ts` and
generated database types remain governed by the work that would introduce their
real behavior. `ARCH-004` is the one
recorded architecture finding still requiring a separate product/route
decision.

## Architecture style

The application uses a pragmatic modular Next.js App Router architecture:

- routes and route-specific code are colocated under `app/`;
- reusable UI is promoted to `components/` only after ownership crosses a
  route boundary;
- infrastructure and framework adapters live in `lib/`;
- application reads and writes live in `services/`;
- database migrations and database-level tests live in `supabase/`;
- cross-cutting tests live in `tests/`;
- stable overview documentation is separate from temporary implementation
  plans.

This is not a layered Clean Architecture implementation. Do not add repository,
use-case, domain, adapter, or other generic layers without a concrete current
need. The goal is deterministic ownership with shallow paths, not the maximum
number of abstractions.

## Target repository structure

```text
app/
├── (public)/
│   ├── login/
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
├── (protected)/
│   ├── layout.tsx
│   ├── calendar/
│   │   └── _components/
│   ├── profile/
│   │   └── _components/
│   ├── statistics/
│   └── trainings/
│       └── _components/
├── auth/
│   └── callback/
├── layout.tsx
├── error.tsx
├── loading.tsx
├── not-found.tsx
└── page.tsx

components/
├── ui/
├── providers/
├── layout/
└── <domain>/

lib/
├── auth/
│   ├── dal.ts
│   └── roles.ts
├── supabase/
│   ├── browser.ts
│   ├── server.ts
│   ├── admin.ts
│   └── session.ts
├── database.types.ts
├── constants.ts
├── email.ts
├── types.ts
└── utils.ts

services/
├── queries/
├── actions/
└── validators/

supabase/
├── config.toml
├── migrations/
└── tests/

tests/
├── unit/
├── integration/
└── e2e/

docs/
├── 01-application-architecture-overview.md
├── 02-authentication-authorization-overview.md
├── 03-ui-design-system-overview.md
├── 04-engineering-quality-overview.md
└── plans/
    └── NNN-<descriptive-name>-plan.md

proxy.ts
```

Directories shown for an established boundary may be created when their first
real file is introduced. Do not create empty `<domain>`, `validators`, test, or
other placeholder directories merely to mirror this tree.

## Route ownership rules

- `app/(public)/` groups public UI routes without adding `(public)` to their
  URLs.
- `app/(protected)/` groups authenticated UI routes and owns their shared
  layout. The group name is organizational; its security behavior is defined
  by the authentication overview and cannot be inferred from the folder name.
- Route Handlers belong under `app/api/` unless colocating one with a feature
  has a concrete routing reason. UI route groups must not be used merely to
  hide API ownership.
- Supabase authentication callbacks belong under `app/auth/`.
- Every URL has one owning `page.tsx` or `route.ts`. Route groups do not change
  URLs, so two pages in different groups must not resolve to the same path.
- Route-only implementation files use private folders such as `_components/`
  so their ownership is immediately visible and future framework naming
  collisions are avoided.
- Root framework conventions stay at the repository root or under `app/` as
  required by Next.js. The request proxy is `proxy.ts` at the repository root.

## Component placement decision

Use the narrowest ownership boundary that contains every current consumer:

| Current use                                               | Required location                           |
| --------------------------------------------------------- | ------------------------------------------- |
| One route                                                 | `app/<route>/_components/`                  |
| Multiple routes in one feature subtree                    | nearest common `app/<feature>/_components/` |
| Multiple unrelated feature areas, but one business domain | `components/<domain>/`                      |
| Domain-free reusable primitive                            | `components/ui/`                            |
| Global React provider                                     | `components/providers/`                     |
| Shared application shell or navigation                    | `components/layout/`                        |

Start a component beside its route. Promote it only when a real second use
crosses the current ownership boundary. Do not copy a component to avoid a
justified promotion, and do not promote it in anticipation of hypothetical
reuse.

Use direct imports. Do not add barrel `index.ts` files unless they solve a
measured problem; hidden re-export graphs make server/client boundaries and
circular dependencies harder to audit.

## Library and service ownership

### `lib/`

`lib/` contains shared infrastructure, framework adapters, and small
cross-cutting utilities:

- `lib/auth/` owns auth infrastructure modules; behavioral rules are defined
  in the authentication overview;
- `lib/supabase/` owns distinct Supabase client factories and session plumbing;
- `database.types.ts` is generated from the development database and is not a
  hand-maintained domain model;
- `types.ts` contains application DTO/domain types that are genuinely shared;
- `constants.ts`, `email.ts`, and `utils.ts` remain flat until multiple files
  justify a dedicated directory.

Do not turn `lib/` into a catch-all for feature code. A helper used by one
route stays with that route; a helper used by one service stays beside that
service.

### Transactional email

`lib/email.ts` owns every outgoing transactional message and is the only module
that may talk to Resend. It exposes one function per notification and shares a
single `emailLayout` shell so message chrome stays consistent.

Implemented notifications:

| Trigger                              | Function                          | Recipients              |
| ------------------------------------ | --------------------------------- | ----------------------- |
| A user registers for a training      | `sendTrainingRegistrationEmail`   | the registering user    |
| A user unregisters themselves        | `sendTrainingUnregistrationEmail` | that user               |
| An admin removes a participant       | `sendTrainingUnregistrationEmail` | the removed participant |
| An admin deletes a training          | `sendTrainingCancelledEmails`     | all active participants |

Invariants:

- Only `services/actions/` triggers an email, after the database write has
  succeeded; queries and UI components must not send mail.
- Sending is fire-and-forget and its failure never fails the user operation, as
  required by the retry rules in the engineering-quality overview.
- All interpolated values are HTML-escaped before they reach a template.
- A missing `RESEND_API_KEY` or empty recipient list is a silent no-op, so local
  development works without mail credentials.
- Copy is Slovak; `EMAIL_FROM` sets the sender and falls back to a project
  default.
- One function may serve two triggers when the message differs only in wording,
  as `sendTrainingUnregistrationEmail` does: being removed by an organizer is
  news to the recipient, while confirming their own action is not.
- A recipient without an address is skipped, never an error: the notification
  is a side effect of the operation, not part of it.

Changing a training does not notify anyone, and there is no cancelled training
state — deletion is the only cancellation path today.

### `services/`

- `services/queries/` contains application data reads.
- `services/actions/` contains Server Action entry points and application
  writes.
- A validator starts beside its action or Route Handler. Move it to
  `services/validators/` only when it has a second real consumer.
- Services may depend on `lib/`; `lib/` must not depend on `services/`.
- Services must not import UI components or route files.

Complex database work belongs in a reviewed Postgres view or RPC when a long
JavaScript query chain would obscure correctness. This project does not use an
ORM.

## Dependency direction

```text
app/ and components/
        ↓
     services/
        ↓
       lib/

supabase/ defines the database contract consumed through lib/supabase/
```

Additional constraints:

- `components/ui/` must not import feature, service, auth, or database modules;
- browser modules must not import server-only modules;
- route-specific code must not be imported by unrelated routes;
- generated database rows must not leak directly into public UI/API contracts
  when a narrower DTO is appropriate;
- avoid circular dependencies and cross-layer re-export shortcuts.

## Test placement

- Pure functions and contracts go under `tests/unit/`.
- Application boundary tests for services, Server Actions, Route Handlers, and
  framework integration go under `tests/integration/`.
- Selected browser journeys go under `tests/e2e/`.
- RLS, grants, triggers, migrations, and database invariants go under
  `supabase/tests/`.
- A structural-only move is verified with import inventory, type checking, and
  route comparison; do not create unit tests for code whose behavior did not
  change.

## Documentation structure

- Overview files use a two-digit reading prefix: `01`, `02`, and so on.
- `01-application-architecture-overview.md` is the first architecture source.
- `02-authentication-authorization-overview.md` is the security model source.
- `03-ui-design-system-overview.md` is the UI, token, accessibility, and
  canonical-component source.
- `04-engineering-quality-overview.md` is the error-handling, validation,
  dependency, testing, verification, and handoff source.
- Plans use an independent three-digit chronological prefix: `001`, `002`,
  `003`, and so on.
- An implementation-block plan includes `bN` in its filename, but its `NNN`
  prefix remains only the global plan sequence.
- A master plan may define `B1`, `B2`, and later blocks. A detailed block plan
  implements exactly one block and must not create a nested block hierarchy.
- Overviews contain decisions and invariants, not task checklists. Plans contain
  migration scope, sequence, verification, and rollback.
- Every overview ends with a compact deferred-work register. It indexes only
  verified unresolved findings and links to a plan when one exists; it does not
  contain implementation steps.
- Register IDs use one owning prefix: `ARCH-*`, `AUTH-*`, `UI-*`, or `ENG-*`.
  Search every register before adding an item so one finding has one owner.
- A resolved register item is removed only by the change that implements and
  verifies the correction; Git history retains the record.

Update the relevant overview in the same change whenever an approved
architecture rule changes. Completing a plan must leave the overview accurate;
the overview must never claim that an unfinished migration is already
implemented.

## Sources

- [Next.js project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure)
- [Next.js authentication architecture](https://nextjs.org/docs/app/guides/authentication)

## Deferred work register

This register contains verified repository-architecture differences only. It
does not authorize implementation outside the referenced plan.

| ID         | Deferred finding and exit condition                                                                                                                                                           | Status | Tracking                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| `ARCH-004` | `app/page.tsx` and `app/(public)/page.tsx` both map to `/`. Resolve only after one root-page behavior is explicitly selected, the conflict is removed, and the route graph/build verifies it. | Open   | Requires a separate product/route plan |
| `ARCH-005` | The `Training` interface is declared twice with different fields, in `app/(protected)/calendar/_components/Calendar.tsx` and `components/trainings/TrainingList.tsx`. Resolve when one shared shape lives in `lib/types.ts` and both components import it. | Open   | Requires a component/types pass        |
