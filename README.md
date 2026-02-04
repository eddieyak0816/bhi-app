Balanced Health Institute — MVP (plain language)

Quick: this repo contains a small web app that shows trusted health learning resources based on a lab test name + number. It does NOT give medical advice and it does NOT save your lab numbers.

## Live Deployment ✅

The app is currently deployed and live:
- **Frontend:** https://gleaming-praline-ba5b42.netlify.app/ (Netlify)
- **Backend:** https://bhi-app-backend.onrender.com (Render)
- **Database:** Supabase PostgreSQL

No localhost setup needed—just visit the live URL above!

---

## Local Development Setup

How to run locally (detailed)

Quick start (macOS / Linux)
1. Copy `.env.example` → `.env` and add Supabase keys (optional). If you don't add keys the app will use sample data.
2. npm ci
3. npm run dev
4. Open http://localhost:3000

Quick start (Windows — PowerShell)
1. Copy file: `Copy-Item .env.example .env`
2. Install: `npm ci`
3. Run frontend + backend (dev):
   - `npm run dev` (frontend)
   - In a separate terminal: `SETBACKEND=1; $env:BACKEND_API_KEY = 'foo'; npm run dev:server` or run via the provided npm script: `npm run dev:all`
4. Open http://localhost:3000

Non-developer demo (one-click)
- No setup: run `npm ci && npm run dev` and open `http://localhost:3000`. Try: Enter lab → Vitamin D → value `25` → See resources.
- To save a demo result (opt-in): check **Save result for later** and click **Save** (consent required).
- Admin (dev-only): click **Admin** in the header (requires `BACKEND_API_KEY` in `.env.server` or `x-backend-api-key` header).

Troubleshooting (common)
- MODULE_NOT_FOUND when running `node index.js`: run the server via the project script: `npm run dev:server` or `node server/index.js` from the repo root.
- EADDRINUSE (port 4242): another server is running — stop it or pick a new port: `npx kill-port 4242` (PowerShell: `Get-Process -Id (Get-NetTCPConnection -LocalPort 4242).OwningProcess | Stop-Process`).
- Playwright CI failures (browser download): set `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` in CI and use the provided Playwright GitHub Action which installs browsers on the runner.
- Blank page on Netlify: Ensure `vite.config.ts` has `base: '/'` (not `/bhi-app/`). GitHub Pages uses different base path than Netlify.

Testing & DB
- Seed sample data (optional): `DATABASE_URL="<pg_url>" npm run seed:db`
- Dev-only inspection endpoint: set `ENABLE_DEV_ENDPOINT=true` in `.env.server` then call `GET /api/dev/user-lab-values` with header `x-backend-api-key: foo`.
- Database Migrations: Run SQL migrations in Supabase Dashboard → SQL Editor:
  - `db/migrations/20260128_create_categories_table.sql` (creates categories table + default categories)
  - `db/migrations/20260128_create_health_goals_table_v2.sql` (creates health_goals table + default health goals)

CI & deployment notes
- Add `DATABASE_URL` to GitHub Secrets so the schema validator can run in CI.
- CI enforces presence of `ASSISTANT_PREFERENCES.md` in PRs via `.github/workflows/assistant-preferences-check.yml`.
- To run the admin E2E locally: `npx playwright test tests/admin.spec.ts` (use `--debug` to open the headed runner).
- Netlify: Auto-deploys on push to main branch. Build command: `npm run build`, publish directory: `dist/`
- Render: Auto-deploys backend on push to main branch. Requires env variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `BACKEND_API_KEY`, `SUPABASE_SERVICE_ROLE`

What I built (short)
- React + Vite frontend (stateless lab input).
- Client-only tag mapping (no lab numbers saved by default).
- Supabase wiring for live data (read-only in this flow).
- Opt-in storage scaffold for user lab values (disabled by default; backend + RLS required to enable).
- Playwright smoke test and CI schema validator (already added).
- Admin UI for managing resources, tags, categories, health goals, and lab markers.

Next (I recommend)
- Run database migrations in Supabase (see "Testing & DB" section above) — this fixes "Loading" states on Resources, Profile, and Admin pages
- Provide `DATABASE_URL` as a GitHub secret so CI can run the DB validator
- To enable opt-in storage: add these secrets to GitHub (do NOT paste them here):
  - `BACKEND_API_KEY` (short secret for the frontend to call the server in dev)
  - `SUPABASE_SERVICE_ROLE` (server-only; never expose to browser)
- Run the backend locally for testing: `BACKEND_API_KEY=foo SUPABASE_SERVICE_ROLE=<service_role> VITE_SUPABASE_URL=<url> npm run dev:server`
- Dev-only: to inspect recent opt-in saves locally, set `ENABLE_DEV_ENDPOINT=true` in `.env.server` and restart the backend; then call `GET /api/dev/user-lab-values` with the header `x-backend-api-key: foo`.

For help
- See DEVELOPER_STATUS.md for current development status and blockers
- See IMPROVEMENT_ROADMAP.md for strategic recommendations from expert analysis
- See docs/USER_GUIDE.md for end-user documentation
- See docs/FEATURE_ROADMAP.md for planned features
