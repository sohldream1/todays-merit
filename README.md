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

## This machine's dev environment (Windows on ARM)

This machine is Windows on ARM64, and neither Node.js nor Prisma's query engine ships a
native Windows-ARM64 build yet (Prisma always resolves `binaryTarget` to plain `windows`,
i.e. x64, and an ARM64 Node process can't load that x64 native addon). So this project's
tooling runs under **x64 Node via Windows' built-in x64 emulation**, not the ARM64 Node
build:

- A portable x64 Node.js is unpacked at `C:\Users\cbmwe\.local-node-x64\node-v24.19.0-win-x64`
  (separate from whatever `node`/`npm` resolves to on your normal `PATH`). Prepend it to
  `PATH` before running any npm script in this repo, e.g. in PowerShell:

  ```powershell
  $x64 = "C:\Users\cbmwe\.local-node-x64\node-v24.19.0-win-x64"
  $env:PATH = "$x64;$env:PATH"
  npm run dev
  ```

- Prisma is pinned to `6.19.2` (not the new `7.x` line) because Prisma 7 requires a
  `prisma.config.ts` + driver-adapter rewrite that's still early days; `6.19.2` keeps the
  classic `datasource { url = env("DATABASE_URL") }` schema style.
- Postgres itself **is** installed as a normal Windows service (`postgresql-x64-17`, port
  5432, via the official installer) — architecture doesn't matter for the server, only for
  Node's native addons. However, this session didn't have the admin rights needed to set/know
  that service's superuser password, so for local development a **second, user-owned Postgres
  cluster** was initialized instead, with trust auth (no admin rights needed):
  - Data directory: `C:\Users\cbmwe\.local-postgres\todays-merit-data`
  - Running on port **5433** (not 5432, to avoid clashing with the Windows service)
  - `apps/api/.env` points `DATABASE_URL` at `localhost:5433`

  Start/stop it with:

  ```powershell
  $bin = "C:\Program Files\PostgreSQL\17\bin"
  $data = "C:\Users\cbmwe\.local-postgres\todays-merit-data"
  & "$bin\pg_ctl.exe" -D $data -l "C:\Users\cbmwe\.local-postgres\server.log" -o "-p 5433" start
  & "$bin\pg_ctl.exe" -D $data stop
  ```

  If you'd rather use the "real" Windows Postgres service on 5432 instead, you'll need an
  admin to set the `postgres` user's password, then update `DATABASE_URL` in
  `apps/api/.env` accordingly.

None of this is Today's-Merit-specific — it only exists because of this machine's ARM64
architecture and non-admin session. On a normal x64 dev machine (or an admin session on
ARM64), skip straight to the plain "Getting started" steps above.

## What's built so far

- Full Prisma schema for every entity in the MVP spec (organizations, users, org_admins,
  volunteer_opportunities, volunteer_signups, volunteer_hours, campaigns, donations,
  badges, user_badges, tiers, user_tiers).
- End-to-end auth: signup (member + nonprofit-with-org-creation), login, logout, session
  check (`/api/auth/me`), protected routes on the frontend.

Everything else in the spec's "first-slice features" (directory, opportunities, hour
logging, campaigns/donations, badges/tiers, dashboard content) is not built yet.
