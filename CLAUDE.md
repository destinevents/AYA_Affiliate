# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AYA (AsYouAreBaguio) Affiliate Program** — admin dashboard for managing affiliates, campaigns, referral codes, and commission payouts.

- **Frontend** (`frontend/`) — Vite + TypeScript, deployed to Vercel
- **Backend** (`backend/`) — Express + TypeScript, deployed to Railway
- **Database** — PostgreSQL on Railway (schema in `backend/src/db/schema.sql`)

## Running Locally

**Backend:**
```bash
cd backend
cp .env.example .env   # fill in values
npm run dev            # ts-node-dev with hot reload on port 3000
```

**Frontend:**
```bash
cd frontend
# create frontend/.env.local with: VITE_API_URL=http://localhost:3000
npm run dev            # Vite dev server
```

**Build for production:**
```bash
cd backend && npm run build   # tsc → dist/
cd frontend && npm run build  # tsc + vite → dist/
```

## Architecture

### Backend (`backend/src/`)

| File/Dir | Purpose |
|---|---|
| `index.ts` | Express entry — registers helmet, morgan, CORS, routes, error handler |
| `db/index.ts` | `pg` Pool + typed `query<T>()` helper |
| `db/schema.sql` | Run once on Railway PostgreSQL to create all tables |
| `middleware/auth.ts` | JWT `requireAuth` middleware (Bearer token) |
| `middleware/errorHandler.ts` | Global error handler — ZodError → 400, others → 500 |
| `routes/auth.ts` | `POST /api/auth/login` with bcrypt + rate limiting (10 req/15 min) |
| `routes/affiliates.ts` | `GET/POST /api/affiliates`, `PATCH /api/affiliates/:id/status` |
| `routes/campaigns.ts` | `GET/POST /api/campaigns` (with aggregated codes/conversions/revenue) |
| `routes/codes.ts` | `POST /api/codes/generate` — creates affiliate + promo_code atomically |
| `routes/conversions.ts` | `GET/POST /api/conversions`, `PATCH /api/conversions/:id/pay` |

Every route validates input with **Zod** before touching the DB. All errors propagate via `next(err)` to the global error handler.

### Frontend (`frontend/src/`)

| File | Purpose |
|---|---|
| `main.ts` | App entry — boot, login gate, tab routing, nav handlers |
| `api.ts` | All `fetch()` calls — attaches JWT, handles 401 redirect |
| `auth.ts` | JWT read/write/clear in `localStorage`, expiry check |
| `types.ts` | Shared TypeScript interfaces (`Affiliate`, `Campaign`, `Conversion`) |
| `utils.ts` | `fmtPHP()` currency formatter |
| `style.css` | All styles — design tokens as CSS custom properties |
| `env.d.ts` | Vite `import.meta.env` type declarations |
| `views/login.ts` | Login form render + handler |
| `views/affiliates.ts` | Affiliates tab — list, pause/reactivate |
| `views/campaigns.ts` | Campaigns tab — list + Create Campaign form |
| `views/generate.ts` | Generate Code tab — new affiliate + code form |
| `views/conversions.ts` | Commissions tab — list, Mark Paid, Record Conversion form |

Each view exports `render*()` (returns HTML string) and `attach*Handlers(reload)` (wires up events after the HTML is injected). `main.ts` calls both after every tab switch.

### Database Schema

```
affiliates          — member_name, code, commission_rate, status, lifetime_earned
affiliate_campaigns — name, status, start_date, end_date
promo_codes         — code, affiliate_id (FK), campaign_id (FK)
referral_conversions — affiliate_id (FK), promo_code, sale_amount, commission_amount, status
```

### Design System

Fonts: `Fraunces` (serif display), `DM Sans` (body), `DM Mono` (monospace labels/codes) — loaded from Google Fonts in `frontend/index.html`.

Key CSS variables: `--pine` (dark green), `--gold` (accent), `--fog` (light background), `--terra` (rust/error), `--muted` (secondary text).

## Environment Variables

**Railway (backend):**
```
DATABASE_URL=        # auto-provided by Railway PostgreSQL addon
ADMIN_USERNAME=
ADMIN_PASSWORD=      # plain text or bcrypt hash (starts with $2)
JWT_SECRET=          # long random string
FRONTEND_URL=        # Vercel URL for CORS
PORT=                # auto-provided by Railway
```

**Vercel (frontend):**
```
VITE_API_URL=        # Railway backend URL (required — app warns if missing)
```

## Deployment

1. Push to `main` → Vercel auto-deploys `frontend/` (set Root Directory to `frontend` in Vercel settings)
2. Railway: create PostgreSQL addon → run `backend/src/db/schema.sql` in the DB console
3. Railway: create Node.js service → Root Directory: `backend` (nixpacks.toml handles build + start)
4. Set all env vars in Railway and Vercel dashboards

## Context

- **Prepared by:** Jenn Castro (`jenncastro@destinevents.biz`) — Disenyo Digitals Collective
- **Organization:** Destine Events / AYA (AsYouAreBaguio) / Disenyo Digitals
