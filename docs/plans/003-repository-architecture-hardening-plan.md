# Repository Architecture Hardening Plan

## Plan identity

- **Plan number:** `003`
- **Prefix meaning:** chronological plan order only; it is not an
  implementation block number
- **Plan type:** architecture hardening master plan
- **Normative architecture:** `../01-application-architecture-overview.md`
- **Related security plan:**
  `001-authorization-authentication-hardening-plan.md`
- **Detailed block plans:**
  - `004-repository-architecture-hardening-implementation-b1-plan.md`
  - `005-repository-architecture-hardening-implementation-b2-plan.md`
  - `006-repository-architecture-hardening-implementation-b3-plan.md`
- **Target environment:** local development only
- **Implementation status:** Completed — B1, B2, and B3 verified on 2026-08-14

In this plan, “hardening” means making physical ownership and import paths
deterministic. It does not mean implementing authentication, authorization,
database, API, build, or business-logic changes.

This master plan defines three implementation blocks. Each block is a
behavior-preserving set of file moves and import updates. A detailed block plan
implements exactly one block and must not introduce a nested block sequence.

## Implementation status

This master plan is complete within its approved scope. Blocks B1, B2, and B3
were implemented in order and verified on the `development` branch. The
verification included structural inventories, stale-import scans, source-body
comparisons, Next.js route type generation, and TypeScript without emit. No
repository test files were present at verification time.

The open root-route finding `ARCH-004` remains recorded in the architecture
overview. It requires an explicit product decision between the two `/` pages
and is outside this plan's behavior-preserving scope; it does not reopen the
completed B1–B3 migration.

## Scope boundary

This plan owns only:

- route-group and framework-file placement;
- Route Handler physical placement without URL or contract changes;
- component ownership and colocation;
- physical grouping of existing auth and Supabase modules;
- import updates required by those moves;
- structural verification and rollback.

This plan does not own:

- authentication, authorization, roles, capabilities, redirects, or session
  behavior;
- Supabase client construction, service-role behavior, RLS, grants, policies,
  migrations, or generated database types;
- query/action responsibility changes, DTOs, validation, or business logic;
- choosing the product behavior for the conflicting `/` pages;
- lint, formatting, test-runner, CI, font, Node.js, build, environment, or
  deployment work.

Security work remains in plan `001`. A future non-security delivery/tooling
plan must own build and CI work if it is approved. Keeping those concerns out
of this plan makes every architecture block mechanically reviewable.

## Architecture rules being enforced

The implementation must follow
`../01-application-architecture-overview.md`, especially these rules:

1. Use route groups for organization without changing URLs.
2. Colocate a route-owned component in that route's `_components/` directory.
3. Promote a component only when current reuse crosses its ownership boundary.
4. Keep domain-free primitives in `components/ui/`, global providers in
   `components/providers/`, and the shared shell in `components/layout/`.
5. Group infrastructure modules by responsibility under `lib/` without adding
   missing future modules prematurely.
6. Keep one-file utilities flat and create no empty speculative directories.
7. Preserve behavior; source changes are limited to framework names required
   by a file rename and import specifiers required by moves.

## Verified starting point (historical baseline)

- `app/(app)` and `app/(public)` exist.
- `app/(app)/api/calendar/route.ts` resolves to `/api/calendar`.
- `middleware.ts` is the current root request file.
- Components are flat under `components/`.
- `lib/auth.ts`, `lib/supabase-browser.ts`, and
  `lib/supabase-server.ts` are existing standalone modules.
- `lib/supabase.ts` is a separate legacy mixed module and remains unchanged by
  this architecture plan.
- `app/page.tsx` and `app/(public)/page.tsx` both resolve to `/`; selecting one
  behavior is intentionally excluded because it changes product behavior.
- `app/(app)/statistics/loading.tsx` is current untracked user work and must be
  preserved by any directory move.

Recheck the active branch, working tree, file consumers, and route inventory
before each block. This baseline does not authorize overwriting later user
changes.

## Implementation block catalogue

| Block | Structural scope                                                   | Detailed plan                                                     | Dependency | Status    |
| ----- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------- | --------- |
| `B1`  | Route group, calendar Route Handler, and root Proxy file placement | `004-repository-architecture-hardening-implementation-b1-plan.md` | None       | Completed |
| `B2`  | Component colocation and shared-component directories              | `005-repository-architecture-hardening-implementation-b2-plan.md` | B1         | Completed |
| `B3`  | Existing auth and Supabase module grouping under `lib/`            | `006-repository-architecture-hardening-implementation-b3-plan.md` | B2         | Completed |

No block adds a new test runner or placeholder unit tests because no block
changes application behavior. Existing tests at implementation time must still
pass. Structural checks, TypeScript, route comparison, and source-diff review
are the relevant verification layers.

## B1 - Route and framework structure

**Purpose:** establish the approved physical route ownership without changing
URLs, access behavior, redirects, session handling, or API contracts.

**Scope:**

- rename `app/(app)` to `app/(protected)`;
- move `app/(protected)/api/calendar/route.ts` to
  `app/api/calendar/route.ts` while keeping `/api/calendar` unchanged;
- rename `middleware.ts` to `proxy.ts` and rename only the exported framework
  function from `middleware` to `proxy`;
- update imports made stale by these moves.

**Explicit exclusion:** do not resolve the duplicate `/` page, expand the
matcher, change auth checks, add safe-return redirects, add `401`/`403`, or
extract session helpers.

**Detailed plan:**
`004-repository-architecture-hardening-implementation-b1-plan.md`.

## B2 - Component ownership structure

**Purpose:** place every existing component at its narrowest current ownership
boundary without changing props, rendering, state, styles, or behavior.

**Target moves:**

| Existing component                             | Target ownership                                   |
| ---------------------------------------------- | -------------------------------------------------- |
| `Button`, `Spinner`, `ConfirmSheet`            | `components/ui/`                                   |
| `ThemeProvider`, `TrainingContext`             | `components/providers/`                            |
| `Navigation`                                   | `components/layout/`                               |
| `ProfilePhone`, `ThemeToggle`, `SignOutButton` | `app/(protected)/profile/_components/`             |
| `Calendar`                                     | `app/(protected)/calendar/_components/`            |
| `TrainingForm`                                 | `app/(protected)/trainings/_components/`           |
| `TrainingEditTabs`                             | `app/(protected)/trainings/[id]/edit/_components/` |
| `TrainingList`                                 | `components/trainings/`                            |

`ThemeToggle` and `SignOutButton` remain profile-owned because they currently
have one route consumer. They move to `components/layout/` only if the shared
shell actually begins using them. `TrainingList` belongs to the training
domain outside a route because both calendar and training routes consume it.

**Verification:** inventory every consumer before moving, update direct
imports, search for old paths, run TypeScript and existing tests, and confirm
that component bodies changed only where import specifiers changed.

**Detailed plan:**
`005-repository-architecture-hardening-implementation-b2-plan.md`.

## B3 - Existing library module structure

**Purpose:** group the existing infrastructure modules under their approved
physical ownership without introducing future auth or client behavior.

**Target moves:**

| Current path              | Target path               |
| ------------------------- | ------------------------- |
| `lib/auth.ts`             | `lib/auth/dal.ts`         |
| `lib/supabase-browser.ts` | `lib/supabase/browser.ts` |
| `lib/supabase-server.ts`  | `lib/supabase/server.ts`  |

Keep `lib/supabase.ts`, `lib/constants.ts`, `lib/email.ts`, `lib/types.ts`, and
`lib/utils.ts` at their current paths. Do not create `roles.ts`, `admin.ts`,
`session.ts`, `database.types.ts`, compatibility re-exports, or empty
directories in this block. Those files are introduced only by the plan that
implements their real behavior.

**Verification:** update all consumers, search for old import paths, run
TypeScript and existing tests, and confirm that module bodies and Supabase
client construction are unchanged.

**Detailed plan:**
`006-repository-architecture-hardening-implementation-b3-plan.md`.

## Release gate for every block

A block is complete only when:

1. the active branch and working tree were checked before the move;
2. all tracked and untracked user work was preserved;
3. every source path in that block is gone and every intended target exists;
4. stale-import and unresolved-import scans pass;
5. TypeScript reports no new error;
6. existing tests, if present, report no regression;
7. route URLs and public contracts remain unchanged;
8. the diff contains no logic, dependency, SQL, environment, or unrelated
   formatting change;
9. rollback consists only of reversing moves, import updates, and the allowed
   framework export rename;
10. `../01-application-architecture-overview.md` is updated if the approved
    target placement changed during implementation.

Known pre-existing build, route, lint, or test failures must be recorded
separately. They do not permit a new structural regression and are not repaired
inside an unrelated architecture block.

## Completion criteria

- The three blocks are completed in order and independently reviewed.
- Existing routes expose the same URLs and contracts as before the plan.
- Every moved component follows the documented current-consumer rule.
- Existing auth/browser/server modules live under their target directories but
  retain their original behavior.
- No speculative directory, compatibility shim, or barrel export was added.
- The architecture overview accurately distinguishes completed structure from
  remaining auth and product work.
- Plan `001` can implement security behavior without simultaneously performing
  broad file moves.

## Rollback

Each block is independently reversible by restoring the previous paths and
import specifiers. B1 also restores the `middleware` export name. No database,
data, secret, environment, dependency, or deployment rollback is required
because this plan must not change any of them.

## Primary source

- [Next.js project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure)
