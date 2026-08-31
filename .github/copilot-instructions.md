# AI Coding Instructions — Next.js + TypeScript + React + Tailwind CSS

> This file defines the coding standards, architecture patterns, and conventions
> for this project. AI assistants MUST follow these rules when generating,
> modifying, or reviewing code. The goal is clean, minimal, readable code
> with zero unnecessary complexity.

> **Warning about the code examples below.** Sections 2 and 3 describe this
> repository accurately. Many examples further down do not: they come from an
> unrelated cabins/bookings tutorial and show NextAuth, `app/_lib/`,
> `app/_components/`, `date-fns`, and heroicons, none of which exist here. Read
> them for style only, never for imports, paths, or auth patterns. Tracked as
> `ENG-002` in `docs/04-engineering-quality-overview.md`. When this file
> conflicts with the repository, the repository wins.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [TypeScript Standards](#4-typescript-standards)
5. [Component Architecture](#5-component-architecture)
6. [Server vs Client Components](#6-server-vs-client-components)
7. [Styling with Tailwind CSS](#7-styling-with-tailwind-css)
8. [State Management](#8-state-management)
9. [Data Fetching & Mutations](#9-data-fetching--mutations)
10. [Forms & Validation](#10-forms--validation)
11. [Routing & Navigation](#11-routing--navigation)
12. [Error Handling](#12-error-handling)
13. [Authentication](#13-authentication)
14. [Naming Conventions](#14-naming-conventions)
15. [Import Ordering](#15-import-ordering)
16. [Performance Patterns](#16-performance-patterns)
17. [Anti-Patterns — What to Avoid](#17-anti-patterns--what-to-avoid)
18. [Code Formatting Rules](#18-code-formatting-rules)
19. [File Templates](#19-file-templates)

---

## 1. Core Philosophy

- **Simplicity over cleverness.** Write code a junior developer can understand.
- **Minimal footprint.** Do not add anything that is not explicitly needed.
- **No dead code.** Never leave commented-out code, unused imports, or unused variables.
- **Consistency is king.** Follow existing patterns exactly. Do not invent new ones.
- **Server-first.** Default to Server Components. Only use Client Components when
  interactivity, hooks, or browser APIs are strictly required.
- **Flat over nested.** Avoid deeply nested JSX. Extract sub-components early.
- **Readability over DRY.** Three similar lines are better than a premature abstraction.
- **No over-engineering.** Do not build for hypothetical future requirements.

---

## 2. Tech Stack

| Layer            | Technology                                    |
|------------------|-----------------------------------------------|
| Framework        | Next.js 16 (App Router)                       |
| Language         | TypeScript (strict mode)                      |
| UI Library       | React 19                                      |
| Styling          | Tailwind CSS v4                               |
| Database         | Supabase (PostgreSQL + RLS)                   |
| Authentication   | Supabase Auth via `@supabase/ssr`             |
| Email            | Resend                                        |
| Icons            | lucide-react                                  |
| Theming          | next-themes                                   |
| Tests            | Vitest (`tests/unit/`)                        |
| Migrations       | Supabase CLI (`supabase/migrations/`)         |

There is no NextAuth, no date-fns, and no heroicons in this project. Date
helpers live in `lib/utils.ts`.

Do NOT introduce new dependencies without explicit approval. Prefer native
platform APIs and existing dependencies over adding new packages.

---

## 3. Project Structure

```
app/
├── (public)/           # Unauthenticated routes: login, register, reset
├── (protected)/        # Authenticated routes: calendar, trainings, profile
│   └── **/_components/ # Route-local components
├── api/                # Route Handlers (use sparingly)
├── auth/               # Supabase auth callback
├── globals.css         # Tailwind and design tokens
├── layout.tsx          # Root layout
└── page.tsx            # Homepage
components/             # Shared UI components
lib/
├── auth/               # Auth DAL, roles, capability contracts
├── supabase/           # Client boundaries (browser / server / privileged)
└── utils.ts            # Date and formatting helpers
services/
├── queries/            # Reads
└── actions/            # Writes (Server Actions)
supabase/migrations/    # Database migrations
tests/unit/             # Vitest unit tests
proxy.ts                # Session refresh and routing checks (Next.js 16)
public/                 # Static assets
```

**Rules:**
- Shared components go in `components/`. One component per file.
- Route-local components go in a `_components/` folder beside the route.
- Reads go in `services/queries/`, writes in `services/actions/`.
- Pages are always `page.tsx`. Layouts are always `layout.tsx`.
- Routing uses `proxy.ts`, not `middleware.ts`.
- Co-locate related files. Keep things close to where they are used.
- Do NOT create deeply nested folder hierarchies.
- `docs/01-application-architecture-overview.md` is the normative source for
  file placement; this section summarises it.

---

## 4. TypeScript Standards

### General Rules

- Enable `strict: true` in tsconfig.json. No exceptions.
- NEVER use `any`. Use `unknown` if the type is truly unknown, then narrow it.
- NEVER use `@ts-ignore` or `@ts-expect-error` without a comment explaining why.
- Prefer `interface` for object shapes and component props.
- Prefer `type` for unions, intersections, primitives, and utility types.
- Do NOT use `enum`. Use `as const` objects or union literal types instead.
- Export types/interfaces only when consumed by other files.
- Always type function return values for public/exported functions.
- Let TypeScript infer types for local variables when the type is obvious.

### Props Typing

```tsx
// CORRECT — interface for props, inline destructuring
interface CabinCardProps {
  cabin: Cabin;
}

function CabinCard({ cabin }: CabinCardProps) {
  const { id, name, maxCapacity, regularPrice, discount, image } = cabin;
  // ...
}

export default CabinCard;
```

```tsx
// WRONG — inline type, no interface
function CabinCard({ cabin }: { cabin: any }) { ... }
```

### Event Handlers

```tsx
// CORRECT
function handleChange(e: React.ChangeEvent<HTMLInputElement>) { ... }
function handleSubmit(e: React.FormEvent<HTMLFormElement>) { ... }
function handleClick(e: React.MouseEvent<HTMLButtonElement>) { ... }

// WRONG
function handleClick(e: any) { ... }
function handleClick(e: Event) { ... }  // Use React-specific types
```

### Utility Types — Use When Appropriate

- `Partial<T>` — all properties optional
- `Pick<T, K>` — select specific properties
- `Omit<T, K>` — exclude specific properties
- `Record<K, V>` — dictionary/map type
- `NonNullable<T>` — exclude null/undefined

### Enums Alternative

```tsx
// CORRECT — const object + type derivation
const CABIN_STATUS = {
  AVAILABLE: "available",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
} as const;

type CabinStatus = (typeof CABIN_STATUS)[keyof typeof CABIN_STATUS];

// WRONG — TypeScript enum
enum CabinStatus { Available, Booked, Maintenance }
```

---

## 5. Component Architecture

### Declaration Style

- Use **regular function declarations** for components. NOT arrow functions.
- **Default export** at the bottom of the file. NOT inline `export default function`.
- One component per file. File name matches component name in PascalCase.

```tsx
// CORRECT
function CabinCard({ cabin }: CabinCardProps) {
  return ( ... );
}

export default CabinCard;

// WRONG — arrow function component
const CabinCard = ({ cabin }: CabinCardProps) => { ... };

// WRONG — inline export
export default function CabinCard({ cabin }: CabinCardProps) { ... }
```

### Component Size

- A component SHOULD NOT exceed 150 lines including JSX.
- If a component grows beyond this, extract logical pieces into sub-components.
- Each component should have a single, clear responsibility.

### Props Destructuring

- Destructure props in the function signature.
- Extract nested properties in the component body.

```tsx
function ReservationCard({ booking, onDelete }: ReservationCardProps) {
  const { id, startDate, endDate, numNights, totalPrice } = booking;
  // ...
}
```

### Conditional Rendering

```tsx
// Ternary for two branches
{isLoggedIn ? <Dashboard /> : <LoginPrompt />}

// Logical AND for single branch
{hasDiscount && <DiscountBadge />}

// Early return for guard clauses
if (!data) return null;
if (items.length === 0) return <EmptyState />;
```

### List Rendering

```tsx
// Key always on the outermost element, use stable IDs
{cabins.map((cabin) => (
  <CabinCard cabin={cabin} key={cabin.id} />
))}
```

### Children Pattern

```tsx
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
}

function Button({ children, onClick }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
```

---

## 6. Server vs Client Components

### Default: Server Components

Every component is a Server Component unless marked otherwise. Server Components:
- Can be `async` and `await` data directly
- Can access databases, file systems, secrets
- Have zero client-side JavaScript bundle cost
- CANNOT use hooks, event handlers, or browser APIs

```tsx
// Server Component — no directive needed
async function CabinList({ filter }: CabinListProps) {
  const cabins = await getCabins();
  const filteredCabins = filterCabins(cabins, filter);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {filteredCabins.map((cabin) => (
        <CabinCard cabin={cabin} key={cabin.id} />
      ))}
    </div>
  );
}
```

### Client Components

Add `"use client"` directive ONLY when the component needs:
- `useState`, `useEffect`, `useContext`, or any React hook
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `localStorage`)
- Third-party libraries that use hooks internally

```tsx
"use client";

import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}

export default Counter;
```

### Rules

- `"use client"` goes on the **very first line** of the file. Nothing before it.
- Keep Client Components as small as possible. Push the boundary down.
- A Server Component CAN render a Client Component as a child.
- A Client Component CANNOT import a Server Component directly.
- Pass Server Component data to Client Components via props.
- Never mark a component as `"use client"` just because a child is a Client Component.

---

## 7. Styling with Tailwind CSS

### General Rules

- Use Tailwind utility classes exclusively. No custom CSS unless absolutely necessary.
- Do NOT use `@apply` in CSS files. Write utilities inline.
- Do NOT use CSS Modules or styled-components.
- Do NOT use inline `style={{}}` attributes.

### Class Organization Order

Write Tailwind classes in this logical order within a single string:

1. **Layout** — `grid`, `flex`, `block`, `hidden`, `relative`, `absolute`
2. **Grid/Flex props** — `grid-cols-*`, `items-*`, `justify-*`, `gap-*`
3. **Sizing** — `w-*`, `h-*`, `max-w-*`, `min-h-*`
4. **Spacing** — `p-*`, `px-*`, `py-*`, `m-*`, `mx-*`, `my-*`
5. **Borders** — `border`, `border-*`, `rounded-*`
6. **Background** — `bg-*`
7. **Typography** — `text-*`, `font-*`, `leading-*`, `tracking-*`
8. **Effects** — `shadow-*`, `opacity-*`, `ring-*`
9. **Transitions** — `transition-*`, `duration-*`
10. **Interactive** — `hover:*`, `focus:*`, `active:*`, `disabled:*`
11. **Responsive** — `sm:*`, `md:*`, `lg:*`, `xl:*`

```tsx
// CORRECT — organized by category
className="grid grid-cols-2 gap-8 w-full p-6 border border-primary-800
  rounded-lg bg-primary-900 text-primary-100 font-semibold
  transition-colors hover:bg-primary-800"

// WRONG — random order
className="font-semibold hover:bg-primary-800 grid p-6 border
  text-primary-100 grid-cols-2 gap-8 rounded-lg bg-primary-900"
```

### Conditional Classes

```tsx
// Template literal for conditional classes
className={`px-5 py-2 transition-colors hover:bg-primary-700 ${
  isActive ? "bg-primary-700 text-primary-50" : "bg-transparent"
}`}
```

### Color System

Use the project's custom color tokens exclusively:

- **Primary palette** (50–950): Backgrounds, text, borders
- **Accent palette** (50–950): CTAs, highlights, interactive elements

```tsx
// Backgrounds (dark to light): bg-primary-950 → bg-primary-50
// Text (light to dark):        text-primary-100 → text-primary-900
// Accent buttons:              bg-accent-500 hover:bg-accent-600
// Accent text:                 text-accent-400
```

Do NOT use arbitrary Tailwind colors (`bg-blue-500`, `text-gray-200`).
Always use `primary-*` or `accent-*` from the theme.

### Long Class Strings

When a className string exceeds ~80 characters, break it across multiple lines
for readability. Keep the grouping order consistent.

---

## 8. State Management

### Principles

- Use the **simplest state solution** that works.
- Default to **no state** — derive values from props or server data when possible.
- Local UI state → `useState`
- Shared client state → React Context (keep contexts small and focused)
- Server state → fetch directly in Server Components
- Form state → `useFormStatus` for pending states
- Optimistic updates → `useOptimistic`
- Non-blocking transitions → `useTransition`

### Context Pattern

```tsx
"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ReservationContextType {
  range: DateRange;
  setRange: (range: DateRange) => void;
  resetRange: () => void;
}

const ReservationContext = createContext<ReservationContextType | undefined>(
  undefined
);

const initialState: DateRange = { from: undefined, to: undefined };

function ReservationProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>(initialState);

  const resetRange = () => setRange(initialState);

  return (
    <ReservationContext.Provider value={{ range, setRange, resetRange }}>
      {children}
    </ReservationContext.Provider>
  );
}

function useReservation(): ReservationContextType {
  const context = useContext(ReservationContext);
  if (context === undefined) {
    throw new Error("useReservation must be used within a ReservationProvider");
  }
  return context;
}

export { ReservationProvider, useReservation };
```

**Rules:**
- Always provide a custom hook for consuming context.
- Always throw if context is used outside its provider.
- Export the Provider and the hook. NOT the raw context.
- Keep context state minimal. Do not stuff everything into one context.

---

## 9. Data Fetching & Mutations

### Server Component Fetching

```tsx
// Direct async/await in Server Components
async function CabinPage({ params }: CabinPageProps) {
  const cabin = await getCabin(params.cabinId);
  return <Cabin cabin={cabin} />;
}
```

### Parallel Fetching

```tsx
// CORRECT — parallel with Promise.all
const [settings, bookedDates] = await Promise.all([
  getSettings(),
  getBookedDatesByCabinId(cabin.id),
]);

// WRONG — sequential (waterfall)
const settings = await getSettings();
const bookedDates = await getBookedDatesByCabinId(cabin.id);
```

### Server Actions (Mutations)

```tsx
// app/_lib/actions.ts
"use server";

import { auth } from "./auth";
import { revalidatePath } from "next/cache";

async function updateGuest(formData: FormData): Promise<void> {
  // 1. Authentication
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // 2. Extract and validate data
  const nationalID = formData.get("nationalID") as string;
  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID)) {
    throw new Error("Please provide a valid national ID");
  }

  // 3. Perform mutation
  const { error } = await supabase
    .from("guests")
    .update({ nationalID })
    .eq("id", session.user.guestId);

  if (error) throw new Error("Guest could not be updated");

  // 4. Revalidate affected paths
  revalidatePath("/account/profile");
}
```

**Rules:**
- Always check authentication first in server actions.
- Always validate and sanitize inputs.
- Always revalidate affected paths after mutations.
- Throw errors — let error boundaries handle them.
- Use `.bind(null, data)` to pre-fill server action arguments.

### Supabase Query Pattern

```tsx
const { data, error } = await supabase
  .from("cabins")
  .select("id, name, maxCapacity, regularPrice, discount, image")
  .order("name");

if (error) {
  console.error(error);
  throw new Error("Cabins could not be loaded");
}

return data;
```

---

## 10. Forms & Validation

### Server Action Forms

```tsx
// Bind extra data to server action
const createBookingWithData = createBooking.bind(null, bookingData);

<form action={createBookingWithData}>
  <input name="numGuests" required />
  <textarea name="observations" maxLength={1000} />
  <SubmitButton pendingLabel="Reserving...">Reserve now</SubmitButton>
</form>
```

### Submit Button with Pending State

```tsx
"use client";

import { useFormStatus } from "react-dom";

interface SubmitButtonProps {
  children: React.ReactNode;
  pendingLabel: string;
}

function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      disabled={pending}
      className="bg-accent-500 px-8 py-4 font-semibold text-primary-800
        transition-all hover:bg-accent-600 disabled:cursor-not-allowed
        disabled:bg-gray-500 disabled:text-gray-300"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export default SubmitButton;
```

---

## 11. Routing & Navigation

### Links

```tsx
import Link from "next/link";

<Link href="/cabins" className="hover:text-accent-400 transition-colors">
  Explore cabins
</Link>
```

### Programmatic Navigation

```tsx
"use client";
import { useRouter } from "next/navigation";

const router = useRouter();
router.push("/cabins");
router.replace("/account");
```

### URL State with Search Params

```tsx
"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

function Filter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function handleFilter(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("capacity", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const activeFilter = searchParams.get("capacity") ?? "all";
  // ...
}
```

### Metadata

```tsx
// Static metadata
export const metadata: Metadata = {
  title: "Cabins",
};

// Dynamic metadata
export async function generateMetadata({
  params,
}: CabinPageProps): Promise<Metadata> {
  const { name } = await getCabin(params.cabinId);
  return { title: `Cabin ${name}` };
}
```

### Static Params Generation

```tsx
export async function generateStaticParams() {
  const cabins = await getCabins();
  return cabins.map((cabin) => ({ cabinId: String(cabin.id) }));
}
```

### Suspense Boundaries

```tsx
// Use key prop to re-trigger Suspense on filter change
<Suspense fallback={<Spinner />} key={filter}>
  <CabinList filter={filter} />
</Suspense>
```

---

## 12. Error Handling

### Data Service Layer

```tsx
// Throw descriptive errors — let boundaries catch them
if (error) {
  console.error(error);
  throw new Error("Cabins could not be loaded");
}
```

### Server Actions

```tsx
// Numbered steps for clarity
// 1. Authentication
const session = await auth();
if (!session) throw new Error("You must be logged in");

// 2. Authorization
if (booking.guestId !== session.user.guestId)
  throw new Error("You are not allowed to delete this booking");

// 3. Mutation
```

### Error Boundary (error.tsx)

```tsx
"use client";

interface ErrorProps {
  error: Error;
  reset: () => void;
}

function Error({ error, reset }: ErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Something went wrong!</h1>
      <p className="text-lg">{error.message}</p>
      <button
        onClick={reset}
        className="bg-accent-500 px-6 py-3 text-lg text-primary-800"
      >
        Try again
      </button>
    </div>
  );
}

export default Error;
```

**Rules:**
- Throw errors in data/service layer. Do NOT silently swallow them.
- Use `error.tsx` files for route-level error boundaries.
- Include numbered steps (1, 2, 3) as comments in server actions for clarity.
- Log errors with `console.error` before throwing.

---

## 13. Authentication

### Auth Check in Server Components

```tsx
import { auth } from "@/app/_lib/auth";

async function AccountPage() {
  const session = await auth();
  // session.user available here
}
```

### Conditional Rendering

```tsx
{session?.user ? (
  <ReservationForm cabin={cabin} user={session.user} />
) : (
  <LoginMessage />
)}
```

### Middleware Protection

```tsx
// middleware.ts
import { auth } from "@/app/_lib/auth";

export const middleware = auth;

export const config = {
  matcher: ["/account"],
};
```

---

## 14. Naming Conventions

| Category              | Convention      | Example                           |
|-----------------------|-----------------|-----------------------------------|
| Components            | PascalCase      | `CabinCard`, `ReservationForm`    |
| Component files       | PascalCase.tsx  | `CabinCard.tsx`                   |
| Pages                 | page.tsx        | `app/cabins/page.tsx`             |
| Layouts               | layout.tsx      | `app/account/layout.tsx`          |
| Utility files         | kebab-case.ts   | `data-service.ts`                 |
| Functions             | camelCase       | `getCabins`, `handleDelete`       |
| Variables             | camelCase       | `bookedDates`, `maxCapacity`      |
| Constants (config)    | camelCase       | `navLinks`, `authConfig`          |
| Constants (values)    | UPPER_SNAKE     | `MAX_GUESTS`, `API_TIMEOUT`       |
| Interfaces            | PascalCase      | `CabinCardProps`, `Booking`       |
| Type aliases          | PascalCase      | `CabinStatus`, `DateRange`        |
| Boolean variables     | is/has/should   | `isPending`, `hasBreakfast`       |
| Event handlers        | handle + Action | `handleDelete`, `handleFilter`    |
| Server actions        | verb + Noun     | `createBooking`, `updateGuest`    |
| Custom hooks          | use + Name      | `useReservation`, `useOutsideClick` |
| Context               | Name + Context  | `ReservationContext`              |
| Provider              | Name + Provider | `ReservationProvider`             |

---

## 15. Import Ordering

Organize imports in this exact order, with a blank line between each group:

```tsx
// 1. React / Next.js core
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

// 2. Third-party libraries
import { format, differenceInDays } from "date-fns";
import { TrashIcon } from "@heroicons/react/24/solid";

// 3. Local components
import CabinCard from "@/app/_components/CabinCard";
import Spinner from "@/app/_components/Spinner";

// 4. Local utilities, services, types
import { getCabins } from "@/app/_lib/data-service";
import { createBooking } from "@/app/_lib/actions";
import type { Cabin, Booking } from "@/app/_lib/types";

// 5. Styles / Assets (rare)
import logo from "@/public/logo.png";
```

**Rules:**
- Use `@/` path alias for all imports from project root.
- Use `import type` for type-only imports.
- Never use relative paths (`../`) when `@/` alias is available.
- Remove unused imports immediately. No dead imports.

---

## 16. Performance Patterns

### Images

```tsx
// ALWAYS use next/image for optimized images
import Image from "next/image";

// Fill mode for dynamic images
<Image
  src={cabin.image}
  fill
  sizes="(max-width: 768px) 100vw, 50vw"
  className="object-cover"
  alt={`Cabin ${cabin.name}`}
/>

// Fixed size for static images
<Image
  src={logo}
  height={60}
  width={60}
  quality={100}
  alt="The Wild Oasis logo"
/>
```

NEVER use `<img>` tags. Always use `next/image`.

### Revalidation

```tsx
// Time-based revalidation for semi-static pages
export const revalidate = 3600; // 1 hour

// On-demand revalidation after mutations
revalidatePath("/account/reservations");
```

### Optimistic Updates

```tsx
const [optimisticBookings, optimisticDelete] = useOptimistic(
  bookings,
  (current, bookingId: number) =>
    current.filter((booking) => booking.id !== bookingId)
);
```

### Suspense Boundaries

- Wrap async Server Components in `<Suspense>` with appropriate fallback.
- Use `loading.tsx` for route-level loading states.
- Use `key` prop on Suspense to re-trigger on parameter changes.

---

## 17. Anti-Patterns — What to Avoid

### TypeScript

- **NEVER** use `any`. Use `unknown` and narrow the type.
- **NEVER** use `Function` type. Use specific function signatures.
- **NEVER** use `enum`. Use `as const` objects.
- **NEVER** use `@ts-ignore` without justification.
- **NEVER** use non-null assertion `!` unless you are 100% certain.

### React

- **NEVER** use class components.
- **NEVER** use `useEffect` for data fetching. Use Server Components.
- **NEVER** pass `key={index}` on lists. Use stable unique IDs.
- **NEVER** create components inside other components.
- **NEVER** mutate state directly. Always use setter functions.
- **NEVER** store derived values in state. Compute them during render.
- **NEVER** use `React.FC` or `React.FunctionComponent`. Use plain functions.

### Next.js

- **NEVER** use `<img>` tags. Use `next/image`.
- **NEVER** use `<a>` tags for internal links. Use `next/link`.
- **NEVER** use `getServerSideProps` or `getStaticProps` (Pages Router).
- **NEVER** create API routes for data that can be fetched in Server Components.
- **NEVER** add `"use client"` to a component that does not need it.
- **NEVER** fetch data in Client Components when Server Components can do it.

### Styling

- **NEVER** use inline `style={{}}` attributes.
- **NEVER** use `@apply` in CSS files.
- **NEVER** use arbitrary Tailwind colors. Use theme tokens.
- **NEVER** use CSS Modules or styled-components.
- **NEVER** create utility CSS classes for one-time use.

### General

- **NEVER** leave `console.log` in production code (except error logging).
- **NEVER** leave commented-out code. Delete it. Git has history.
- **NEVER** leave unused variables, imports, or functions.
- **NEVER** hardcode magic numbers. Extract to named constants.
- **NEVER** use `var`. Use `const` by default, `let` only when reassignment is needed.
- **NEVER** nest ternaries more than one level deep.
- **NEVER** add comments that restate what the code does. Comment only *why*.
- **NEVER** create a file with more than 200 lines. Split it up.
- **NEVER** add error handling for scenarios that cannot happen.
- **NEVER** add features, refactoring, or "improvements" beyond what was asked.

---

## 18. Code Formatting Rules

- Use 2-space indentation.
- Use double quotes for JSX attributes, single quotes for JS strings where possible.
- Always use semicolons.
- Trailing commas in multi-line arrays, objects, and parameters.
- Maximum line length: ~100 characters (soft limit for readability).
- Blank line between logical sections within a component.
- No blank lines inside JSX blocks unless separating major sections.
- One blank line between import groups.
- One blank line before `return` statement if function body has logic.
- No blank line after opening brace or before closing brace.

---

## 19. File Templates

### Server Component

```tsx
import Image from "next/image";

import { getCabin } from "@/app/_lib/data-service";
import type { Cabin } from "@/app/_lib/types";

interface CabinDetailProps {
  cabin: Cabin;
}

async function CabinDetail({ cabin }: CabinDetailProps) {
  const { name, maxCapacity, image, description } = cabin;

  return (
    <div className="grid grid-cols-[3fr_4fr] gap-20 border border-primary-800 p-10">
      <div className="relative">
        <Image src={image} fill className="object-cover" alt={name} />
      </div>
      <div>
        <h3 className="mb-5 text-xl font-semibold text-accent-400">{name}</h3>
        <p className="text-lg text-primary-200">{description}</p>
      </div>
    </div>
  );
}

export default CabinDetail;
```

### Client Component

```tsx
"use client";

import { useState } from "react";

interface TextExpanderProps {
  children: string;
  maxLength?: number;
}

function TextExpander({ children, maxLength = 200 }: TextExpanderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayText = isExpanded ? children : children.slice(0, maxLength);

  return (
    <span>
      {displayText}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="border-b border-primary-700 pb-1 text-primary-300"
      >
        {isExpanded ? "Show less" : "...Show more"}
      </button>
    </span>
  );
}

export default TextExpander;
```

### Page Component

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";

import CabinList from "@/app/_components/CabinList";
import Spinner from "@/app/_components/Spinner";

export const metadata: Metadata = {
  title: "Cabins",
};

interface CabinsPageProps {
  searchParams: { capacity?: string };
}

function CabinsPage({ searchParams }: CabinsPageProps) {
  const filter = searchParams?.capacity ?? "all";

  return (
    <div>
      <h1 className="mb-5 text-4xl font-medium text-accent-400">
        Our luxury cabins
      </h1>

      <Suspense fallback={<Spinner />} key={filter}>
        <CabinList filter={filter} />
      </Suspense>
    </div>
  );
}

export default CabinsPage;
```

### Server Action

```tsx
"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/app/_lib/auth";
import { supabase } from "@/app/_lib/supabase";

async function deleteBooking(bookingId: number): Promise<void> {
  // 1. Authentication
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // 2. Authorization
  const booking = await getBooking(bookingId);
  if (booking.guestId !== session.user.guestId) {
    throw new Error("You are not allowed to delete this booking");
  }

  // 3. Delete
  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) throw new Error("Booking could not be deleted");

  // 4. Revalidate
  revalidatePath("/account/reservations");
}

export { deleteBooking };
```

---

## Quick Reference Card

```
Component declaration:  function Name() {}  +  export default Name;
Client directive:       "use client" (first line, only when needed)
Server directive:       "use server" (first line, only in action files)
Props:                  interface NameProps {}  +  inline destructuring
State:                  useState for local, Context for shared
Fetching:               async Server Components + Promise.all
Mutations:              Server Actions + revalidatePath
Styling:                Tailwind utilities only, theme colors only
Images:                 next/image always, never <img>
Links:                  next/link always, never <a>
Types:                  interface for objects, type for unions
Exports:                default for components, named for utilities
```
