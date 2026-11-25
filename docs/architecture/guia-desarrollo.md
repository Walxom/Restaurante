# Guía de desarrollo

Referencia técnica para quien trabaja en el código de este repositorio: comandos, arquitectura, contratos de API y convenciones.

## Project Overview

POS / restaurant-management system ("Fondo Marino" / "Bendistaurante") for a local Peruvian
cevichería. It runs **local-first** on a single machine over a LAN: a Next.js app backed by
SQLite, plus a separate Python AI microservice. Roles are `JEFE` (owner/admin) and `MESERO`
(waiter). UI text, comments, and domain terms are in **Spanish** — match that when editing.

## Commands

Package manager is **pnpm**. Node app runs on port **3001**; AI engine on **8000**.

```bash
# Setup & Health Check (Turnkey DevEx)
.\scripts\bootstrap.ps1     # native OS bootstrap for Windows (installs node, pnpm, uv if missing)
pnpm setup:all              # turnkey orchestrator: .env crypto + deps + db push/seed + AI venv + doctor
pnpm doctor                 # pre-flight diagnostic: ports (:3001, :8000), .env, SQLite, Python 3.10, disk
pnpm db:backup              # create timestamped SQLite snapshot in backups/

# Web app (Next.js + Socket.IO via custom server.js)
pnpm dev                    # custom server.js (Socket.IO) + Turbopack — the normal dev command
pnpm dev:next               # plain `next dev --turbopack` — NO Socket.IO (realtime won't work)
pnpm build                  # production build
pnpm start                  # production, custom server
pnpm lint                   # eslint . (ignored during builds — see next.config.ts)

# Database (Prisma + SQLite)
pnpm db:push                # push schema to DB (no migrations are used)
pnpm db:seed                # run prisma/seed.ts (tsx, loads .env)
pnpm db:setup               # db:push + db:seed
pnpm db:generate            # regenerate Prisma client (required after schema changes)

# Tests (Vitest, node environment)
pnpm test                   # run once
pnpm test:watch             # watch mode
pnpm vitest run src/services/__tests__/billing.test.ts   # single file
pnpm vitest run -t "name"   # single test by name

# AI engine (Python, run from repo root; uses ai_engine/venv)
pnpm ai:setup               # bootstrap python venv + deps
pnpm ai:start               # uvicorn on :8000 with reload
pnpm dev:ai                 # concurrently: web (pnpm dev) + AI engine
```

There is **no migration workflow** — schema changes go through `prisma db push`. After any schema
change, run both `pnpm db:push` (applies to DB) and `pnpm db:generate` (regenerates TS types).

## Architecture

### Layered Next.js app (App Router)
```
Page (src/app/**)  →  Hook (useXxx, SWR)  →  API route (src/app/api/**)  →  Service (src/services/**)  →  Prisma
```

- **Services** (`src/services/*.service.ts`) hold business logic — import **only from API routes /
  server code, never directly from React components**.
- **API routes** handle HTTP + auth (`getServerSession(authOptions)`) and delegate to services.
- **`src/lib/prisma.ts`** is the single Prisma client singleton — always import `prisma` from there.
- **Validation**: Zod schemas live in `src/features/<domain>/validations/`. Routes parse with these.
- **Authorization helper**: `validateRole(roles)` in `src/lib/auth-utils.ts` — use it in route
  handlers that need role checking beyond what middleware provides (external APIs, admin-only routes).

### Feature-sliced component structure (canonical)
All UI lives under `src/features/<domain>/`:
- `orders`, `menu`, `inventory`, `billing`, `dashboard`, `tables`, `auth`, `ai-analytics`
- Each has `components/`, `hooks/`, `validations/`, `utils/`
- `src/components/` only contains truly shared code: `ui/` (Radix wrappers), `layout/`,
  `auth/role-guard.tsx`, `ConfirmDialog.tsx`, `NavigationProgress.tsx`, `providers.tsx`

### Key API contracts

**`GET /api/orders`** — paginated, returns `{ orders: Order[], pagination: { page, limit, total, pages } }`.
- Params: `status`, `userId`, `tableId`, `showAll`, `withoutInvoice`, `date`, `page` (default 1), `limit` (default 200, max 500)
- `status=active` → excludes COMPLETED and CANCELLED (use this for kitchen/live views)
- All consumers must destructure `.orders`, not treat the response as a bare array.

**`POST /api/invoices`** — validates with `createInvoiceSchema` (Zod, in `src/features/billing/validations/invoice.ts`).
Invoice number is generated **inside** the `$transaction` with an atomic `increment: 1` on `SystemConfig` to prevent concurrent-request duplicates.

### Realtime (Socket.IO)
- `server.js` is a **single unified server** (dev + prod), parametrized by `NODE_ENV`.
  In dev it binds to `localhost`; in prod to `0.0.0.0` (LAN). `pnpm dev:next` skips Socket.IO.
- Emit via `src/lib/socket-events.ts` typed helpers (`emitNewOrder`, `emitOrderStatusChange`, …).
  Never emit raw strings or call `global.io` directly from application code.
- Socket logs (connect/disconnect) only active in dev — no per-event logging in production.

### Auth & routing
- NextAuth v4, **JWT strategy**, Credentials provider (username + bcrypt) in `src/lib/auth.ts`.
- `src/middleware.ts` is the access-control source of truth:
  - `JEFE`-only: `/dashboard`, `/menu`, `/mesas`, `/impresion`
  - `MESERO`+`JEFE`: `/pedidos`, `/mesero`
  - Public: `/login`, `/api/auth/*`, `/api/public/*`
  - All other `/api/*` require a valid token (but not role — add `validateRole` in the handler).
- After login: `JEFE` → `/dashboard`, `MESERO` → `/mesero`.

### Thermal printing
`src/services/printer/` drives ESC/POS thermal printers (network/USB/serial via `serialport`).
`serialport` is externalized from bundling in `next.config.ts` — keep it **server-only**.
Printing routes: `/api/thermal-print/*` and `/api/printers/*`.
Admin-only routes (`test-formats`, `start-service`) are protected with `validateRole(['JEFE'])`.

### AI engine (separate service)
`ai_engine/` is a **standalone FastAPI app** (port 8000), not part of the Next.js bundle.
Opens the same SQLite DB **read-only** (`DATABASE_URL` in `ai_engine/.env`).
- ML models: demand forecasting, market-basket (Apriori), inventory prediction.
- LLM: Google Gemini with circuit breaker + rate-limiter + in-memory cache (30 min TTL, configurable via `GEMINI_CACHE_TTL_SECONDS`).
- Restaurant name in LLM prompts comes from `RESTAURANT_NAME` env var (default: `Fondo Marino`).
- Endpoints FastAPI: `/api/insights/*`, `/api/train/*`, `/api/chat`, `/health`.
- Service Lifecycle: Next.js API `/api/ai/service` (GET health/PID/logs, POST start/stop/restart - JEFE role).
- The POS works fully without this service.

### Data model (Prisma / SQLite)
`prisma/schema.prisma` — core entities: `User`, `Category`/`Product` (+ `Recipe`/`RecipeIngredient`),
`Table`, `Order`/`OrderItem`, `Ingredient`/`IngredientCategory`, `Invoice`/`InvoiceItem`,
`SystemConfig` (company info, IGV rate, boleta/factura counters), `Printer`,
`CashSession` (US-10 cash shifts with blind count — never expose `expectedAmount` while `ABIERTA`).
`User` also stores login lockout state (`failedLoginAttempts`, `firstFailedLoginAt`, `lockedUntil`) — use `src/services/login-attempts.service.ts`, never a module-level map.
SQLite runs in **WAL** mode (set in `src/lib/prisma.ts`); `pnpm test:power-loss` checks crash safety.

Critical notes:
- Enums stored as **plain strings** — validate with Zod, never assume valid values from DB.
- Money fields are `Decimal` — always wrap in `Number(...)` before arithmetic.
- `SystemConfig` has a single row. Invoice correlativos use `{ increment: 1 }` inside `$transaction`.
- Indexes on `Order(status, createdAt)`, `Order(tableId)`, `Order(userId)`, `OrderItem(orderId)`,
  `OrderItem(productId)`, `Invoice(issuedAt)`, `Invoice(type, status)` — applied via `db:push`.

## Conventions

- **Spanish-first**: domain vocabulary, comments, and user-facing strings are in Spanish.
  `billing.service.ts` mirrors thesis/paper naming for academic traceability — do not rename.
- Import alias `@/*` → `src/*` (`tsconfig.json`; tests use `vite-tsconfig-paths`).
- UI: Radix primitives + Tailwind v4, shadcn-style wrappers in `src/components/ui/`.
- `docs/` is **academic deliverables** governed by `docs/README.md` — follow its
  "don't duplicate" rules; do not create new docs files without checking the index first.
- **After `pnpm db:generate`**: replace the `// TODO: tipar como Prisma.XxxWhereInput` comments
  in `src/app/api/orders/route.ts` and `src/app/api/invoices/route.ts` with the proper Prisma types.
