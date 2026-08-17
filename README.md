Balanced Health Institute — MVP (plain language)

Quick: this repo contains a small web app that shows trusted health learning resources based on a lab test name + number. It does NOT give medical advice and it does NOT save your lab numbers..

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
 - No setup: run `npm ci && npm run dev` and open `http://localhost:3000`. Try: Enter lab → Vitamin D → value `25` → See library.
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
- Database Migrations: Run SQL migrations in Supabase Dashboard → SQL Editor **in this order**:
  - `db/migrations/20260128_create_categories_table.sql` — creates categories table + default categories
  - `db/migrations/20260128_create_health_goals_table_v2.sql` — creates health_goals table + default health goals
  - `db/migrations/20260120_add_logic_rules_id_optional.sql` — adds `id` UUID primary key to logic_rules
  - `db/migrations/20260125_add_operator_column.sql` — adds `operator` column to logic_rules
  - `db/migrations/20260205_add_category_to_tags.sql` — adds optional `category_id` to tags
  - `db/migrations/20260206_create_tag_categories_table.sql` — creates `tag_categories` join table
  - `db/migrations/20260207_seed_cardiometabolic.sql` — seeds "Cardiometabolic Health" category
  - `db/migrations/20260302_add_vitamin_b12.sql` — adds Vitamin B12 marker + logic rules
  - `db/migrations/20260302_add_biometrics_to_profiles.sql` — adds sex, waist, grip fields to profiles
  - `db/migrations/20260302_add_biometric_markers.sql` — adds Waist Circumference + Grip Strength markers
  - `db/insert_medical_criteria.sql` — inserts all logic rules for the 8 core blood markers (idempotent, run after migrations above)

CI & deployment notes
- Add `DATABASE_URL` to GitHub Secrets so the schema validator can run in CI.
- CI enforces presence of `ASSISTANT_PREFERENCES.md` in PRs via `.github/workflows/assistant-preferences-check.yml`.
- To run the admin E2E locally: `npx playwright test tests/admin.spec.ts` (use `--debug` to open the headed runner).
 - Notes for admins/developers: The Admin UI now supports assigning multiple categories per tag and editing tags in a modal. After running the three new migrations above you can seed the example "Cardiometabolic Health" mappings by running the seed file in Supabase SQL Editor.
- Netlify: Auto-deploys on push to main branch. Build command: `npm run build`, publish directory: `dist/`
- Render: Auto-deploys backend on push to main branch. Requires env variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `BACKEND_API_KEY`, `SUPABASE_SERVICE_ROLE`

What I built (short)
- React + Vite frontend with Supabase auth, RLS, and live data.
- Admin CMS: resources, tags, categories, logic rules (criteria), lab markers, health goals.
- User lab input with BHAS scoring (Optimal/Improvement/Out of Range per marker, rolled up to a % score).
- Logic rules engine: marker value → tag → resource recommendations.
- Profile page: saves name, age, sex, waist circumference, grip strength to Supabase.
- Playwright smoke test and CI schema validator.

## Recent Admin UI updates (2026-02-06)

Summary of recent changes applied to the Admin UI and related flows:

- Category ↔ Tag management: Categories can now be edited to select multiple Tags (many-to-many mapping), and Tags can include associated Categories. Backend migrations and a join table (`tag_categories`) support this behavior.
- Alphabetical consistency: Most Admin list and card views (Resources, Tags, Categories, Resource Types, Lab Markers, Health Goals, Criteria) now use case-insensitive alphabetical ordering when no explicit column sort is active.
- Category edit UX: Editing a Category presents a tag checklist in the modal; changes persist back to the server and update tag↔category mappings.
- UI polish: Vertical spacing in the Categories checkbox list and category cards was tightened for a denser layout.
- Selection behavior: When picking categories from any picker, newly-selected categories are prepended so they appear first among selected chips.
- Health Goals fix: Resolved a runtime crash when opening Health Goals cards and ensured their tag chips display correctly.

If you want a live verification, run the dev server locally and open the Admin tab to exercise creating/editing items and confirming alphabetical placement.

Next (I recommend)
- Run all database migrations listed above in order (see "Testing & DB" section)
- See `IMPLEMENTATION_TRACKER.html` for full phase-by-phase build status (open in browser)
- See `DEVELOPER_REQUIREMENTS.md` for the full feature specification
- Phase 2 remaining: biannual lab reminder tracking (item 9), public profile/consent page (item 10)
- Phase 3 next: lab PDF upload + AI extraction, provider verification workflow
- Provide `DATABASE_URL` as a GitHub secret so CI can run the DB validator
- Backend secrets needed: `BACKEND_API_KEY`, `SUPABASE_SERVICE_ROLE` (never expose to browser)

For help
- See DEVELOPER_STATUS.md for current development status and blockers
- See IMPROVEMENT_ROADMAP.md for strategic recommendations from expert analysis
- See docs/USER_GUIDE.md for end-user documentation
- See docs/FEATURE_ROADMAP.md for planned features
