# UI Design System Overview

## Document role

- **Type:** normative, long-lived UI and design-system overview
- **Reading order:** third project overview
- **Scope:** visual tokens, reusable UI components, interaction states,
  responsive behavior, forms, accessibility, and component reuse
- **Last reviewed:** 2026-08-14 against `app/globals.css`, the current component
  inventory, Tailwind CSS 4, and WCAG 2.2

This document defines how the application UI should look and behave without
describing business-specific screens. File placement is owned by
`01-application-architecture-overview.md`; error semantics and verification are
owned by `04-engineering-quality-overview.md`.

The source of truth is divided deliberately:

- `app/globals.css` owns concrete token values and global CSS primitives;
- this overview owns the meaning and approved use of those tokens;
- each component implementation owns its real props and behavior;
- this overview identifies canonical components so equivalent controls are not
  duplicated.

Do not copy component prop definitions or token values into additional docs.
That creates multiple sources of truth that will drift.

## UI principles

1. Reuse a canonical component before creating a new one.
2. Use project tokens instead of arbitrary colors.
3. Preserve semantic HTML and native browser behavior.
4. Design mobile-first and add wider-layout enhancements progressively.
5. Every interaction exposes loading, disabled, success, empty, and error
   states when those states are possible.
6. Light and dark themes must both remain readable and operable.
7. Accessibility is part of the component contract, not a final visual audit.
8. Keep variants purposeful; a different label or color alone does not justify
   a duplicate component.

## Styling ownership

Tailwind utility classes are the default styling mechanism. Use global CSS only
for:

- Tailwind `@theme` variables;
- theme-dependent CSS custom properties;
- true global base behavior;
- shared keyframes or primitives that utilities cannot express clearly;
- third-party or browser-level overrides that cannot be colocated safely.

Do not add CSS Modules, CSS-in-JS, inline `style` objects, or another styling
system without an explicit architecture decision. Arbitrary Tailwind values
are acceptable only when no existing token can represent a measured one-off
value; arbitrary colors are not acceptable.

The configured Prettier Tailwind plugin owns class ordering. Do not manually
reorder formatted classes or create a second class-order convention.

## Color system

### Primary palette

`app/globals.css` exposes `primary-50` through `primary-950`. These are
theme-adaptive tokens: their concrete values change between `:root` and
`.dark`.

Do not infer that a higher number is always darker or lighter. The current
mapping intentionally reverses across themes. Select a primary token based on
its verified role in both themes and test the resulting contrast.

Primary tokens are used for:

- page and surface backgrounds;
- text hierarchy;
- borders and separators;
- neutral hover, active, and disabled states;
- non-destructive shell and navigation elements.

### Accent palette

The only approved accent tokens currently defined are:

- `accent-pink`;
- `accent-purple`;
- `accent-dark-purple`;
- `accent-blue`;
- `accent-teal`;
- `accent-green`;
- `accent-yellow`;
- `accent-gold`.

These accents have no numeric `50`–`950` scale. Classes such as
`bg-accent-500`, `hover:bg-accent-600`, and `text-accent-400` are invalid for
the current theme. Use a named accent token or add a deliberately reviewed
semantic token to `globals.css` before use.

An accent color must not be the only signal for success, warning, selection,
or failure. Pair color with text, an icon, or another perceivable state, and
verify contrast in both themes.

### Prohibited color usage

- no arbitrary Tailwind palette colors such as `bg-blue-500` or
  `text-gray-200`;
- no copied hexadecimal colors inside components;
- no new color token for a single component variation;
- no assumption that an accent is accessible on every primary surface.

## Typography and content

- The root layout currently uses Josefin Sans through `next/font`.
- Use semantic heading elements in document order; do not choose an `h` level
  only for its default visual size.
- Use Tailwind typography utilities and existing page hierarchy before adding
  a new typographic token.
- Body and supporting text must use a readable line height. The current global
  `line-height: 1 !important` rule is a legacy exception, not an approved
  reusable standard, and requires a separate reviewed correction.
- User-facing text, validation messages, and errors are written in Slovak.
- Labels describe the action or value directly. Avoid ambiguous controls that
  rely only on an icon or surrounding context.
- Do not use all caps or color alone to create semantic hierarchy.

## Spacing, layout, and responsiveness

- Start with the smallest supported viewport and add `sm:`, `md:`, `lg:`, and
  later variants only when layout needs them.
- Prefer normal document flow, flexbox, and grid over absolute positioning.
- Keep spacing consistent with Tailwind's configured spacing scale.
- Use the narrowest reasonable content width for forms and readable text.
- Avoid fixed heights for content that can grow through translation, validation
  messages, dynamic data, or user font scaling.
- Horizontal scrolling must be intentional and tested, not an accidental
  result of fixed widths.
- Mobile and desktop variants of one interaction must expose equivalent
  semantics, controls, and keyboard behavior.

### Native date and time inputs

`input[type="date"]` and `input[type="time"]` do not shrink like ordinary
inputs. iOS Safari gives them an intrinsic minimum width and centers the value
through `::-webkit-date-and-time-value`, so a two-column grid overlaps the value
with the native indicator. Such a field requires:

- `min-w-0` on both the input and its grid or flex parent, because `w-full`
  alone cannot shrink below the intrinsic width;
- `[&::-webkit-date-and-time-value]:text-left` so the value follows the field's
  own alignment;
- a single-column layout on the smallest viewport, widened with `sm:` only when
  both fields verifiably fit;
- a `16px` font size, since a smaller size makes iOS Safari zoom on focus.

Verify a change to these fields on a real iOS device; desktop Chrome does not
reproduce the defect.

## Canonical component catalogue

The paths below are approved target locations from the architecture overview.
Architecture hardening plan `003` has completed its component-placement block;
the canonical locations below are now the current implementation paths.

| Need                                      | Canonical component | Target ownership                           |
| ----------------------------------------- | ------------------- | ------------------------------------------ |
| Button or button-styled internal link     | `Button`            | `components/ui/Button.tsx`                 |
| Pending in-place action indicator         | `Spinner`           | `components/ui/Spinner.tsx`                |
| Route or section loading placeholder      | `Skeleton`          | `components/ui/Skeleton.tsx`               |
| Destructive or consequential confirmation | `ConfirmSheet`      | `components/ui/ConfirmSheet.tsx`           |
| Root light/dark theme context             | `ThemeProvider`     | `components/providers/ThemeProvider.tsx`   |
| Authenticated training selection context  | `TrainingContext`   | `components/providers/TrainingContext.tsx` |
| Shared authenticated navigation           | `Navigation`        | `components/layout/Navigation.tsx`         |
| Profile-specific phone editor             | `ProfilePhone`      | profile route `_components/`               |
| Profile-specific theme control            | `ThemeToggle`       | profile route `_components/`               |
| Profile-specific sign-out control         | `SignOutButton`     | profile route `_components/`               |

`Calendar`, `TrainingForm`, `TrainingEditTabs`, and `TrainingList` are domain or
route components, not general UI primitives. Do not extend them to solve an
unrelated generic UI need.

A route skeleton is composed from the `Skeleton` primitive and owned at the same
boundary as the layout it mirrors: `TrainingListSkeleton` beside `TrainingList`,
`CalendarSkeleton` and `StatisticsSkeleton` in their route `_components/`, and
`TrainingFormSkeleton` in the shared `trainings` route subtree consumed by both
the create and edit routes.

### Reuse decision before creating a component

1. Search `components/ui/` and the relevant shared component directories.
2. Search the owning route's `_components/` directory.
3. Search the nearest feature/domain component directory.
4. If an existing component has the same responsibility, extend its existing
   API with a concrete justified variant.
5. If the responsibility is different, create the new component at the
   narrowest ownership boundary defined by the architecture overview.
6. Promote a route component only when a real second consumer crosses its
   current boundary.

Do not create `PrimaryButton`, `FormButton`, `LoadingButton`, or a second modal
only to bake in text, color, or one call site. Prefer composition and explicit
props on the canonical primitive.

## Component contract rules

- One component has one clear responsibility.
- Prefer native elements (`button`, `a`, `dialog`, `input`, `label`) before
  rebuilding their semantics with `div` and ARIA.
- A component that renders either a link or a button must preserve the correct
  element semantics and supported props for each mode.
- Loading controls remain disabled, preserve their accessible name, and expose
  progress to assistive technology where appropriate.
- Icon-only controls require an accessible name.
- Do not hide authorization solely inside a component; presentation may consume
  an authorized result, but server boundaries own permission enforcement.
- Client Components are used only when hooks, state, events, browser APIs, or a
  client-only library require them.
- Avoid barrel exports that obscure client/server boundaries.

## Standard interaction states

### Loading

- Use route `loading.tsx` or Suspense fallbacks for route/section loading.
- Use the canonical button loading state for a pending button action.
- Keep the previous stable UI visible when that is less disruptive than
  replacing the entire page.
- A loading indicator must have an accessible status or accompanying text when
  the context is not already clear.

Choose the indicator by what is loading:

| Situation                                            | Required indicator                |
| ---------------------------------------------------- | --------------------------------- |
| Route or section whose layout is known in advance    | `Skeleton`-composed placeholder   |
| Pending button, form submit, or other in-place action | `Spinner` or button loading state |
| Route whose layout is unknown, such as the root shell | `Spinner`                         |

Skeleton rules:

- A skeleton mirrors the real layout's element count, sizes, and spacing so the
  resolved page does not shift; a generic block is not an acceptable skeleton.
- Every route that can suspend has a `loading.tsx`; a missing one silently falls
  back to the nearest ancestor and loses the page shape.
- The `loading.tsx` root exposes `role="status"`, `aria-busy="true"`, and a
  Slovak `aria-label`; individual `Skeleton` blocks stay `aria-hidden`.
- A skeleton contains no real or placeholder text content and no interactive
  controls.

### Empty

- Explain what is empty, whether it is expected, and the next available action.
- Do not display an error state for a valid empty collection.
- An empty state must not expose management actions to users without the
  corresponding verified capability.

### Error

- Present a short safe Slovak message and a recovery action when one exists.
- Field errors appear next to their field and are programmatically associated
  with it.
- Page-level expected errors remain in the page flow; unexpected route errors
  use the error boundary defined by the engineering overview.
- Never show raw database, Supabase, stack, token, or internal exception text.

### Disabled and pending

- Disabled state must be visually distinguishable and use the native
  `disabled` attribute where supported.
- Pending state prevents duplicate submissions.
- Do not use `pointer-events-none` as the only disabled mechanism.
- Explain a disabled action when the reason is not apparent.

### Success

- Success feedback confirms the completed action without exposing private
  values.
- Do not rely on green color alone.
- Avoid persistent success banners for actions whose resulting UI state already
  provides clear confirmation.

## Forms

- Every control has a visible label or an intentional screen-reader-only label.
- `label` and control are connected with `htmlFor` and `id` unless the control
  is nested in its label.
- Required state, format hints, and errors are not communicated by placeholder
  text alone.
- Browser constraints improve UX but never replace server validation.
- Preserve submitted values after an expected validation error where safe.
- Focus the first invalid field or error summary when practical.
- Use correct input types, autocomplete tokens, and input modes.
- Destructive submissions require a deliberate confirmation when accidental
  activation would be costly.

## Dialogs and confirmations

- Prefer the native `dialog` element for modal semantics.
- A modal has a programmatically associated title and, when present,
  description.
- Escape and the cancel action close the dialog unless an irreversible request
  is already pending.
- Keyboard focus enters the dialog, remains in its modal context, and returns
  to the initiating control after close.
- Confirmation copy names the action and consequence; generic “Are you sure?”
  text is insufficient by itself.
- The safest non-destructive action receives the default visual emphasis unless
  product requirements explicitly justify otherwise.

## Accessibility baseline

Target WCAG 2.2 Level AA for new and changed UI:

- all interactive behavior works with a keyboard;
- focus remains visible and is not removed without an equal or stronger
  replacement;
- text and non-text UI contrast are verified in both themes;
- controls meet the WCAG minimum target-size or spacing requirement, with
  larger targets preferred for primary touch actions;
- headings, landmarks, labels, lists, tables, and dialogs use correct semantics;
- dynamic status and error messages are announced when necessary;
- motion respects reduced-motion preferences;
- zoom, text enlargement, and mobile reflow do not hide controls or content;
- icons supplement rather than replace an accessible text alternative.

Accessibility verification includes keyboard use and browser/assistive
semantics, not only visual inspection.

## Icons and media

- Reuse `lucide-react`, which is already installed; do not add another icon
  library for a missing glyph without approval.
- Use a consistent icon size and stroke within one control group.
- Decorative icons use `aria-hidden`; meaningful icon-only controls use an
  accessible name.
- Images have useful alternative text when informative and an empty alt when
  purely decorative.
- Do not embed text inside an image when normal HTML can express it.

## Change rules

- Update this overview in the same change that adds a token, primitive,
  component variant, or cross-application UI convention.
- Update the canonical catalogue when a component is introduced, replaced, or
  removed.
- Do not list every feature component; only stable shared primitives,
  providers, and shell components belong in the catalogue.
- A new design token requires current reuse or an approved system-level need.
- A one-off page design does not redefine the design system.

## Sources

- [Tailwind CSS theme variables](https://tailwindcss.com/docs/theme)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- [WCAG 2.2 focus appearance guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)

## Deferred work register

This register contains verified UI/design-system findings. `Open` entries have
no approved implementation plan and must not be repaired incidentally.

| ID       | Deferred finding and exit condition                                                                                                                                                          | Status | Tracking                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| `UI-001` | `Button` uses undefined `accent-500`/`accent-600` classes while the theme exposes named accents only. Resolve when variants use reviewed existing/semantic tokens in both themes.            | Open   | Requires a scoped UI plan |
| `UI-002` | Canonical buttons do not consistently encode visible focus, native disabled semantics for every mode, and accessible pending state. Resolve with component and keyboard/accessibility tests. | Open   | Requires a scoped UI plan |
| `UI-003` | `Spinner` lacks a complete accessible status/announcement contract. Resolve when decorative versus meaningful loading is explicit and tested.                                                | Open   | Requires a scoped UI plan |
| `UI-004` | `ConfirmSheet` needs verified labelled-dialog, focus-entry/containment/return, Escape, and pending-state behavior.                                                                           | Open   | Requires a scoped UI plan |
| `UI-005` | Global `line-height: 1 !important` is not an acceptable reusable typography baseline. Resolve after a scoped visual/accessibility regression review removes or narrows it.                   | Open   | Requires a scoped UI plan |
