# New City Park

Training calendar and registration application. Members browse and register for
trainings; administrators manage trainings, participants, and statistics.
User-facing copy is Slovak.

## Quick start

```bash
npm install
```

Copy `.env.example` to `.env` and fill in the values from the **development**
Supabase project.

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Commands

| Command              | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `npm run dev`        | Development server (Turbopack)                              |
| `npm run build`      | Production build                                            |
| `npm start`          | Serve the production build                                  |
| `npm test`           | Vitest unit suite over `tests/unit/`, no network             |
| `npm run test:db`    | Integration suite over `tests/integration/` against the linked development Supabase project |
| `npm run test:watch` | Vitest in watch mode                                        |
| `npm run db:backup`  | Local data-only dump of the linked database into `backups/` |

`npm run lint` is currently broken: it calls `next lint`, which Next.js 16
removed. Tracked as `ENG-001` in `docs/04-engineering-quality-overview.md`.

## Technologies

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, design tokens in `app/globals.css`
- **Backend**: Supabase — Auth, PostgreSQL, Row Level Security
- **Email**: Resend
- **Tests**: Vitest

## Project structure

| Directory              | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `app/(public)/`        | Unauthenticated routes: login, register, password reset |
| `app/(protected)/`     | Authenticated routes: calendar, trainings, profile      |
| `components/`          | Shared UI components                                    |
| `lib/auth/`            | Auth DAL, roles, and capability contracts               |
| `lib/supabase/`        | Supabase client boundaries                              |
| `services/queries/`    | Reads                                                   |
| `services/actions/`    | Writes (Server Actions)                                 |
| `supabase/migrations/` | Database migrations                                     |
| `tests/unit/`          | Unit tests                                              |
| `tests/integration/`   | Database tests against development Supabase             |
| `services/validators/` | Pure input validation                                   |
| `docs/`                | Architecture, security, UI, and quality overviews       |

## Before you change anything

Read [`AGENTS.md`](AGENTS.md) first. It owns the working rules: branch and
release flow, the database migration workflow, the three-role model, secrets
handling, and project conventions. This README deliberately does not repeat
them.

Deeper documentation:

- [`docs/01-application-architecture-overview.md`](docs/01-application-architecture-overview.md)
- [`docs/02-authentication-authorization-overview.md`](docs/02-authentication-authorization-overview.md)
- [`docs/03-ui-design-system-overview.md`](docs/03-ui-design-system-overview.md)
- [`docs/04-engineering-quality-overview.md`](docs/04-engineering-quality-overview.md)
- [`docs/plans/`](docs/plans/) — implementation plans and their records
