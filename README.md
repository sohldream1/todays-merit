# Today's Merit

Monorepo for the Today's Merit MVP: nonprofit/volunteer/donor platform with a gamified
badge & tier system. Managed with npm workspaces + Turborepo.

## Structure

```
apps/
  web/    React + TypeScript + Tailwind CSS (Vite)
  api/    Node.js + Express + PostgreSQL (Prisma ORM)
packages/
  shared-types/   TypeScript types/DTOs shared between web and api
```

## Auth strategy

- Email/password, hashed with bcrypt.
- On login, the API signs a JWT and sets it as an **httpOnly, secure, SameSite=Lax cookie**
  (never exposed to client-side JS). `credentials: "include"` is used on every frontend
  fetch so the cookie round-trips automatically.
- Individual members and nonprofit admins share one `users` table. Nonprofit signup
  (`POST /api/auth/signup/nonprofit`) creates the `users` row, an `organizations` row, and
  an `org_admins` row (role: `owner`) in a single transaction. Member signup
  (`POST /api/auth/signup/member`) only creates the `users` row.
- Role (`member` | `org_admin` | `platform_admin`) and `organizationId` are resolved from
  `org_admins` at login time and embedded in the JWT claims. `platform_admin` has no signup
  UI yet — it's schema-ready but provisioned manually (out of scope for this MVP slice per
  the spec).
- Frontend has separate routes for each audience: `/signup/member`, `/login/member`,
  `/signup/nonprofit`, `/login/nonprofit`.

## Getting started

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Set up Postgres and environment variables:

   ```bash
   cp apps/api/.env.example apps/api/.env
   # edit apps/api/.env with your local DATABASE_URL and a real JWT_SECRET
   ```

3. Run the first migration (creates all tables from `apps/api/prisma/schema.prisma`):

   ```bash
   npm run db:migrate
   ```

4. Start both apps in dev mode:

   ```bash
   npm run dev
   ```

   - API: http://localhost:4000
   - Web: http://localhost:5173 (proxies `/api/*` to the API)

## Testing and linting

```bash
npm run lint        # ESLint across api, web, and shared-types
npm run typecheck   # tsc --noEmit across every package
npm test            # Vitest — unit + integration tests (api), unit tests (web)
```

The API suite includes real HTTP-level integration tests (via `supertest`, driving the
actual Express `app`) for auth, the nonprofit verification workflow, and kudos — these run
against a **separate, dedicated database** so they never touch your dev data:

1. Create it once (same Postgres instance as your normal dev DB, just a different name):

   ```bash
   createdb todays_merit_test
   # or: psql -c "CREATE DATABASE todays_merit_test;"
   ```

2. Apply migrations to it once (or whenever a new migration is added):

   ```bash
   cd apps/api
   DATABASE_URL="postgresql://<user>:<pass>@localhost:<port>/todays_merit_test?schema=public" npx prisma migrate deploy
   ```

3. `apps/api/.env.test` (checked in — it only holds fixed dummy secrets, nothing real)
   points `DATABASE_URL` at that test database and is loaded automatically by
   `apps/api/vitest.setup.ts` before any test file runs. Adjust the host/port there if your
   local Postgres isn't on the default `localhost:5433` this project's dev setup uses.

Each test creates its own uniquely-named data (`uniqueEmail()` in `apps/api/src/testUtils.ts`)
and cleans up after itself in `afterAll`, so the suite is safe to re-run repeatedly and
doesn't need a full DB reset between runs. Rate limiting is skipped when `NODE_ENV=test`
(the suite would otherwise trip the signup/login limiters within a single run) — that
middleware itself is verified manually, not by the automated suite.

There's no component-level (React Testing Library) or end-to-end (Playwright/Cypress)
coverage yet — the web suite currently only covers pure logic (`src/lib/*.test.ts`).

## Prisma on Windows ARM64

Prisma 7 dropped native Rust query-engine binaries in favor of driver adapters
(`@prisma/adapter-pg` + the pure-JS `pg` driver here — see `apps/api/src/lib/prisma.ts` and
`apps/api/prisma.config.ts`). That happens to fix a real problem on this class of machine:
Prisma's old native engine only ever shipped for Windows x64, so an ARM64-native Node
process couldn't load it. With the driver adapter, plain ARM64 Node works fine — no x64
Node install, PATH tricks, or emulation needed.

Postgres itself runs as a normal service; architecture only ever mattered for the Node
native addon Prisma no longer uses.
