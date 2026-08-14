# Repository Architecture Hardening Implementation Plan - B1

## Plan identity

- **Plan number:** `004`
- **Prefix meaning:** chronological plan order only; it is not an architecture
  block number
- **Architecture block:** `B1`
- **Master plan:** `003-repository-architecture-hardening-plan.md`
- **Normative architecture:** `../01-application-architecture-overview.md`
- **Scope:** route and framework file structure only
- **Target environment:** local development only
- **Implementation status:** Completed — verified on 2026-08-14

This plan implements exactly one block from the architecture master plan. It
does not contain nested implementation blocks.

## Goal

Move the existing route group, calendar Route Handler, and root request file to
their approved physical locations while preserving all current runtime
behavior, URLs, contracts, and user work.

## Non-negotiable behavior boundary

The implementation may change only:

- directory and file paths listed in the move map;
- import specifiers made stale by those moves;
- the exported function name required by the Next.js `middleware.ts` to
  `proxy.ts` convention change.

It must not:

- add or change authentication, authorization, roles, capabilities, redirects,
  cookies, session refresh, Proxy matcher behavior, or return-path handling;
- change `/api/calendar` methods, access, response status, payload, query, or
  error behavior;
- resolve the conflict between `app/page.tsx` and
  `app/(public)/page.tsx`;
- move components or library modules assigned to later architecture blocks;
- add a helper, abstraction, dependency, test runner, environment variable,
  compatibility shim, or empty directory;
- change SQL, Supabase, services, DTOs, validation, or business logic;
- reformat or refactor unrelated source while moving files.

## Verified starting point (historical baseline)

- The integration branch is `development`; verify it again immediately before
  implementation.
- `app/(app)` owns calendar, profile, statistics, trainings, their shared
  layout, and the current calendar Route Handler.
- `app/(app)/api/calendar/route.ts` currently maps to `/api/calendar` because
  route groups do not affect URLs.
- `middleware.ts` exports `middleware` and has an explicit matcher.
- `app/page.tsx` and `app/(public)/page.tsx` both map to `/`; this known conflict
  remains unchanged by this block.
- `app/(app)/statistics/loading.tsx` is current untracked user work and must move
  with its owning route group without being lost or overwritten.

The repository and current working tree remain the factual source at execution
time. Re-inventory them before any move.

## Exact move map

| Current path                            | Target path                 | Allowed source change                                                                |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `app/(app)/`                            | `app/(protected)/`          | Import specifiers only; preserve every tracked and untracked file                    |
| `app/(protected)/api/calendar/route.ts` | `app/api/calendar/route.ts` | Import specifiers only; preserve handler body and `/api/calendar` contract           |
| `middleware.ts`                         | `proxy.ts`                  | Rename exported `middleware` function to `proxy`; preserve body and `config` exactly |

The route-group rename is organizational only. Parenthesized route-group names
are omitted from URLs, so every existing page URL must remain the same.

## Execution sequence

1. Verify the active branch and record `git status --short --branch`.
2. Inventory every tracked and untracked file under `app/(app)` and every import
   affected by the three moves.
3. Record the current page and Route Handler URL map, including the known
   duplicate `/` ownership.
4. Move the complete `(app)` directory to `(protected)` in a way that preserves
   tracked and untracked files.
5. Move the calendar Route Handler to `app/api/calendar/route.ts` without
   editing its implementation.
6. Rename `middleware.ts` to `proxy.ts` and rename only the exported framework
   function to `proxy`.
7. Update import specifiers made stale by the moves.
8. Search for old paths, unresolved imports, accidental source changes, and
   empty directories.
9. Run the verification gate and inspect the complete diff before handoff.

Use history-preserving Git moves for tracked files where practical. Do not use
cleanup or reset commands that could discard untracked user work.

## Verification gate

This block does not add logic, so it does not add placeholder unit tests. Run
the verification layer appropriate to structural work:

1. Confirm `app/(app)` and `middleware.ts` are absent.
2. Confirm the full former route group, including
   `statistics/loading.tsx`, exists under `app/(protected)`.
3. Confirm `app/api/calendar/route.ts` and `proxy.ts` exist.
4. Search for imports or documentation references that incorrectly depend on
   the old runtime paths.
5. Compare the before/after route inventory:
   - all page URLs are unchanged;
   - `/api/calendar` remains `/api/calendar`;
   - the known duplicate `/` mapping is still explicit and was not silently
     resolved.
6. Run `npx tsc --noEmit`.
7. Run existing tests if any are present at implementation time.
8. Run `npx next typegen` if the pre-existing duplicate root route permits it.
   A new route or import error fails this block; a confirmed pre-existing root
   conflict is recorded for separate work rather than fixed here.
9. Inspect the diff and verify:
   - Route Handler body unchanged;
   - Proxy body and matcher unchanged apart from the function name;
   - page, layout, loading, and component bodies unchanged apart from necessary
     import paths;
   - no component/library move from later blocks;
   - no package, lockfile, environment, SQL, query, action, DTO, or unrelated
     formatting change.

## Acceptance criteria

- All tracked and untracked files from `(app)` are preserved under
  `(protected)`.
- Existing page URLs and `/api/calendar` are unchanged.
- `proxy.ts` contains the original middleware behavior with only its framework
  function name changed.
- No source import uses a stale route or root framework path.
- TypeScript reports no new error and existing tests report no regression.
- No authentication, authorization, Supabase, API, service, database,
  dependency, or business behavior changed.
- The duplicate root route remains documented as separate product-level work.
- The block can be rolled back using file moves and import restoration only.

## Rollback

1. Move `app/api/calendar/route.ts` back under
   `app/(protected)/api/calendar/route.ts`.
2. Move `app/(protected)` back to `app/(app)` while preserving all files.
3. Rename `proxy.ts` back to `middleware.ts` and restore the exported function
   name.
4. Restore the original import specifiers.
5. Rerun the same structural and TypeScript checks.

No database, data, secret, dependency, environment, or deployment rollback is
required.

## Out of scope

- component reorganization;
- auth or Supabase module reorganization;
- duplicate root-route resolution;
- auth DAL, role, capability, Proxy, redirect, or session logic;
- calendar API protection or contract changes;
- service, DTO, validation, database, test-tooling, CI, font, build, or
  deployment work.
