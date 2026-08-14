# Repository Architecture Hardening Implementation Plan - B3

## Plan identity

- **Plan number:** `006`
- **Prefix meaning:** chronological plan order only; it is not an architecture
  block number
- **Architecture block:** `B3`
- **Master plan:** `003-repository-architecture-hardening-plan.md`
- **Normative architecture:** `../01-application-architecture-overview.md`
- **Related security overview:**
  `../02-authentication-authorization-overview.md`
- **Dependency:** architecture blocks `B1` and `B2` completed and verified
- **Scope:** physical grouping of three existing library modules only
- **Target environment:** local development only
- **Implementation status:** Completed — verified on 2026-08-14

This plan implements exactly one block from the architecture master plan. It
does not contain nested implementation blocks.

## Goal

Move the existing auth, browser Supabase, and cookie-bound server Supabase
modules under their approved `lib/` ownership directories and update consumers
without changing any auth, session, client, query, or error behavior.

## Non-negotiable behavior boundary

The implementation may change only:

- the three file paths listed in the move map;
- import specifiers made stale by those moves;
- directories required to contain those three real files.

It must not:

- change the body, exports, return values, caching, role fallback, environment
  validation, cookie handling, or Supabase client construction of a moved
  module;
- add `server-only`, request caching, DAL guards, roles, capabilities, typed
  results, or session helpers;
- create `roles.ts`, `admin.ts`, `session.ts`, `database.types.ts`, a barrel,
  compatibility re-export, or speculative empty directory;
- remove or modify the legacy `lib/supabase.ts` mixed client;
- migrate any legacy anon/service-role consumer to a different client;
- change services, queries, actions, API contracts, RLS, SQL, dependencies,
  configuration, or business logic;
- combine this physical move with auth hardening plan `001`.

The target directory names describe ownership only. Moving `lib/auth.ts` to
`lib/auth/dal.ts` does not claim that the current implementation already meets
the final cached/fail-closed DAL contract.

## Expected starting point (historical baseline)

After B1 and B2:

- route files and components already use their approved architecture paths;
- `lib/auth.ts`, `lib/supabase-browser.ts`, and
  `lib/supabase-server.ts` remain at their original flat paths;
- `lib/supabase.ts` remains the legacy mixed module;
- existing consumers import the three flat modules through `@/lib/...` aliases.

Recheck the branch, working tree, module contents, import graph, and current
consumers before implementation. If B1 or B2 is incomplete, stop rather than
mixing architecture blocks. Preserve unrelated tracked and untracked user work.

## Exact move map

| Current path              | Target path               | Restriction                                                      |
| ------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `lib/auth.ts`             | `lib/auth/dal.ts`         | Move current exports and implementation unchanged                |
| `lib/supabase-browser.ts` | `lib/supabase/browser.ts` | Move current browser client implementation unchanged             |
| `lib/supabase-server.ts`  | `lib/supabase/server.ts`  | Move current cookie-bound server client implementation unchanged |

Keep these modules at their current paths:

- `lib/supabase.ts`;
- `lib/constants.ts`;
- `lib/email.ts`;
- `lib/types.ts`;
- `lib/utils.ts`.

No compatibility files remain at the old paths after all imports are updated.

## Import migration inventory

Before moving, inventory every direct and transitive consumer. The current
baseline includes:

- pages and layouts importing `auth()` from `@/lib/auth`;
- Server Actions importing `auth()` from `@/lib/auth`;
- public auth pages importing the browser client;
- the Supabase auth callback, user actions, and registration queries importing
  the cookie-bound server client.

This baseline may change after B1/B2 and is not a substitute for a fresh
repository-wide search. Separately inventory imports from `@/lib/supabase` so
the legacy module can be proven unchanged rather than accidentally migrated.

## Execution sequence

1. Verify branch/status and confirm B1/B2 acceptance evidence.
2. Record hashes or exact diffs of the three module bodies and inventory every
   consumer.
3. Create `lib/auth/` by moving `lib/auth.ts` to `lib/auth/dal.ts`.
4. Create `lib/supabase/` by moving the browser and server modules to
   `browser.ts` and `server.ts`.
5. Update every consumer to the new direct import paths.
6. Search for old paths, unresolved imports, circular imports, shims, barrels,
   duplicate modules, and empty directories.
7. Verify `lib/supabase.ts` and all its consumers are behaviorally unchanged.
8. Run the verification gate and inspect the complete diff before handoff.

Use history-preserving Git moves for tracked files where practical. Do not use
cleanup or reset commands that could discard user work.

## Verification gate

1. Confirm the three old flat source paths are absent.
2. Confirm `lib/auth/dal.ts`, `lib/supabase/browser.ts`, and
   `lib/supabase/server.ts` exist exactly once.
3. Search for imports of `@/lib/auth`, `@/lib/supabase-browser`, and
   `@/lib/supabase-server` and confirm none remain.
4. Search for forbidden new files: `roles.ts`, `admin.ts`, `session.ts`,
   `database.types.ts`, and compatibility `index.ts` barrels.
5. Compare the moved module bodies and confirm no source change beyond import
   specifiers required by their new paths.
6. Confirm `lib/supabase.ts`, its client construction, fallback, and consumers
   are unchanged.
7. Run TypeScript without emit.
8. Run existing tests if any are present at implementation time.
9. Confirm browser consumers import only the moved browser module and no new
   privileged/server module crosses into a client bundle.
10. Inspect the diff and confirm there are no changes to routes, component
    behavior, services, queries, actions, package/lock files, environment files,
    SQL, RLS, DTOs, validation, or user-facing copy.
11. Confirm auth and Supabase security findings remain in the auth deferred-work
    register and plan `001` rather than being partially fixed here.

Any new TypeScript, import, client/server boundary, or runtime behavior error
fails the block. Known pre-existing security or tooling findings remain
separate work.

## Acceptance criteria

- All three existing modules live at their exact approved target paths.
- Every consumer imports the new path directly.
- Module exports, auth behavior, client construction, cookies, environment
  handling, errors, queries, and return values are unchanged.
- `lib/supabase.ts` remains intact and no consumer is silently migrated away
  from it.
- No future auth/client module, shim, barrel, duplicate, or speculative
  directory was added.
- TypeScript reports no new error and existing tests report no regression.
- Unrelated tracked and untracked user changes are preserved.
- Plan `001` can subsequently harden the modules without performing these
  broad physical moves.

## Rollback

1. Move `lib/auth/dal.ts` back to `lib/auth.ts`.
2. Move `lib/supabase/browser.ts` and `lib/supabase/server.ts` back to their
   original flat filenames.
3. Restore all original import specifiers.
4. Remove only directories made empty by reversing this block after verifying
   their resolved paths and contents.
5. Rerun the same import, TypeScript, client-boundary, and existing-test checks.

No database, data, secret, dependency, environment, or deployment rollback is
required.

## Out of scope

- route, Proxy, or component moves;
- request caching, role/capability logic, DAL behavior, typed auth results, or
  protected entry-point changes;
- privileged/session client creation or legacy client removal;
- service-role migration, RLS, grants, SQL, generated types, validation,
  services, tests/tooling, CI, build, or deployment work.
