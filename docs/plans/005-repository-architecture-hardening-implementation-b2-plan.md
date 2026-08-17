# Repository Architecture Hardening Implementation Plan - B2

## Plan identity

- **Plan number:** `005`
- **Prefix meaning:** chronological plan order only; it is not an architecture
  block number
- **Architecture block:** `B2`
- **Master plan:** `003-repository-architecture-hardening-plan.md`
- **Normative architecture:** `../01-application-architecture-overview.md`
- **Normative UI ownership:** `../03-ui-design-system-overview.md`
- **Dependency:** architecture block `B1` completed and verified
- **Scope:** component ownership and file placement only
- **Target environment:** local development only
- **Implementation status:** Completed — verified on 2026-08-14

This plan implements exactly one block from the architecture master plan. It
does not contain nested implementation blocks.

## Goal

Move every existing component to the narrowest approved current ownership
boundary and update its consumers without changing component behavior, public
props, rendering, styles, accessibility, state, or application logic.

## Non-negotiable behavior boundary

The implementation may change only:

- component file paths listed in the move map;
- import specifiers made stale by those moves;
- directories required to contain an actual moved component.

It must not:

- change props, exported names, client/server directives, JSX, hooks, state,
  context values, event behavior, forms, styles, Tailwind classes, or copy;
- repair known token, focus, loading, dialog, typography, or accessibility
  findings from `03-ui-design-system-overview.md`;
- create a new component, variant, barrel export, compatibility re-export, or
  speculative empty directory;
- move route/framework files from B1 or library modules from B3;
- change authentication, authorization, queries, actions, DTOs, validation,
  API contracts, database behavior, dependencies, or configuration;
- reformat or refactor component bodies while moving them.

## Expected starting point (historical baseline)

After B1:

- authenticated routes live under `app/(protected)`;
- the calendar Route Handler lives at `app/api/calendar/route.ts`;
- the request file is `proxy.ts`;
- the thirteen existing component files remain flat under `components/`;
- their imports still use the current flat aliases.

Recheck the active branch, working tree, actual component inventory, and every
consumer before implementation. If B1 is not complete, stop rather than
partially combining two architecture blocks. Preserve all unrelated tracked and
untracked user work.

## Exact move map

### Shared primitives, providers, and shell

| Current path                     | Target path                                | Ownership reason                                    |
| -------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| `components/Button.tsx`          | `components/ui/Button.tsx`                 | Domain-free shared control                          |
| `components/Spinner.tsx`         | `components/ui/Spinner.tsx`                | Domain-free shared loading primitive                |
| `components/ConfirmSheet.tsx`    | `components/ui/ConfirmSheet.tsx`           | Domain-free shared confirmation primitive           |
| `components/ThemeProvider.tsx`   | `components/providers/ThemeProvider.tsx`   | Root application provider                           |
| `components/TrainingContext.tsx` | `components/providers/TrainingContext.tsx` | Provider shared by authenticated training consumers |
| `components/Navigation.tsx`      | `components/layout/Navigation.tsx`         | Shared authenticated application shell              |

### Route-owned components

| Current path                      | Target path                                                            | Ownership reason                                  |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| `components/ProfilePhone.tsx`     | `app/(protected)/profile/_components/ProfilePhone.tsx`                 | Profile route only                                |
| `components/ThemeToggle.tsx`      | `app/(protected)/profile/_components/ThemeToggle.tsx`                  | Profile route only                                |
| `components/SignOutButton.tsx`    | `app/(protected)/profile/_components/SignOutButton.tsx`                | Profile route only                                |
| `components/Calendar.tsx`         | `app/(protected)/calendar/_components/Calendar.tsx`                    | Calendar route only                               |
| `components/TrainingForm.tsx`     | `app/(protected)/trainings/_components/TrainingForm.tsx`               | Shared by new/edit routes in the training subtree |
| `components/TrainingEditTabs.tsx` | `app/(protected)/trainings/[id]/edit/_components/TrainingEditTabs.tsx` | Edit route only                                   |

### Cross-route domain component

| Current path                  | Target path                             | Ownership reason                                            |
| ----------------------------- | --------------------------------------- | ----------------------------------------------------------- |
| `components/TrainingList.tsx` | `components/trainings/TrainingList.tsx` | Training-domain UI consumed by calendar and training routes |

`ThemeToggle` and `SignOutButton` must remain profile-owned until a real second
consumer crosses the profile boundary. Do not place them in
`components/layout/` merely because they could theoretically appear in the
shell.

## Import migration inventory

Before moving, inventory both route-to-component and component-to-component
imports. The known internal relationships include:

- `ConfirmSheet` imports `Button`;
- `SignOutButton` imports `Button`;
- `Calendar` imports `TrainingContext`;
- `TrainingEditTabs` imports `TrainingForm`;
- `TrainingForm` imports `Button` and `ConfirmSheet`;
- `TrainingList` imports `TrainingContext`, `Button`, and `ConfirmSheet`;
- root and protected layouts import providers and shell components;
- public pages, loading files, and error/not-found UI import shared primitives.

This list is a verified baseline, not a substitute for a fresh repository-wide
search immediately before implementation.

## Execution sequence

1. Verify branch/status and confirm B1 acceptance evidence.
2. Inventory all component files, consumers, exports, and current source
   contents.
3. Move `Button`, `Spinner`, and `ConfirmSheet` to `components/ui/`.
4. Move both providers to `components/providers/` and `Navigation` to
   `components/layout/`.
5. Move profile-owned components to the profile route `_components/` folder.
6. Move `Calendar`, `TrainingForm`, and `TrainingEditTabs` to their exact route
   ownership paths.
7. Move `TrainingList` to `components/trainings/`.
8. Update all direct imports in one controlled pass.
9. Search for stale flat imports, duplicate component files, compatibility
   shims, empty directories, and unintended source changes.
10. Run the verification gate and inspect the complete diff before handoff.

Use history-preserving Git moves for tracked files where practical. Do not use
cleanup or reset commands that could discard user work.

## Verification gate

1. Confirm every current source path in the move map is absent.
2. Confirm every target path exists exactly once.
3. Search for stale imports matching the old flat component paths.
4. Search for duplicate default exports or copied component implementations.
5. Confirm no barrel or compatibility re-export was introduced.
6. Run TypeScript without emit.
7. Run existing tests if any are present at implementation time.
8. Compare route URLs before/after and confirm no route ownership changed.
9. Inspect each moved component diff and verify that only import specifiers may
   differ inside component source.
10. Confirm no changes to CSS, package/lock files, SQL, environment files,
    services, auth, Supabase clients, DTOs, validation, or user-facing copy.
11. Confirm deferred UI findings remain recorded rather than being silently
    mixed into this structural block.

Any new TypeScript, import, route, or component behavior error fails the block.
A known pre-existing lint/build/test blocker is recorded separately and is not
repaired here.

## Acceptance criteria

- All thirteen existing components live at the exact approved target paths.
- Every consumer imports the new canonical path directly.
- Component public APIs, behavior, rendering, styles, accessibility, and copy
  are unchanged.
- Route URLs and server/client boundaries are unchanged.
- No duplicate, shim, barrel, or empty speculative directory exists.
- TypeScript reports no new error and existing tests report no regression.
- Unrelated tracked and untracked user changes are preserved.
- Rollback requires only reverse file moves and import restoration.

## Rollback

1. Move every component back to its original flat `components/` path.
2. Restore every original import specifier.
3. Remove only directories made empty by reversing this block after verifying
   their resolved paths and contents.
4. Rerun the same inventory, TypeScript, route, and existing-test checks.

No database, data, secret, dependency, environment, or deployment rollback is
required.

## Out of scope

- route or Proxy moves;
- auth or Supabase library moves;
- component refactoring or new component APIs;
- UI token, accessibility, typography, focus, error-state, or responsive fixes;
- authentication, authorization, services, validation, database, test tooling,
  CI, build, or deployment work.
