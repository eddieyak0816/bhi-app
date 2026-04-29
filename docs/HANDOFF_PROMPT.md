# NHL App — AI Developer Handoff Prompt

**Date:** 2026-04-28  
**Project:** NHL (National Health League) App  
**Client:** Damon DiLorenzo — Balanced Health Institute  
**Working directory:** `c:\Users\eddie\Google Drive\Maximus Digital Marketing\Customers\Balanced Health Institute\BHI App`

---

## What this app is

A health scoring and corporate wellness platform. Users enter lab results; the app computes a BHAS (Balanced Health Assessment Score) v2.3 out of 7.0 based on 7 metabolic markers. Employers and brokers see de-identified aggregate views of their members' scores. The app is HIPAA-sensitive: no PHI ever appears in employer, broker, or league views — only username, public_id (NHL-XXXX-XXXX), team, and aggregate BHAS %.

---

## Stack

- **Frontend:** React 18 + TypeScript + Vite — runs on `http://localhost:3000` (`npm run dev` in project root)
- **Backend:** Node/Express — runs on `http://localhost:4242` (`node server/index.js`)
- **Database:** Supabase PostgreSQL (RLS + PostgREST)
- **Deployment:** Frontend → Netlify, Backend → Render, DB → Supabase

---

## Critical rules — read before writing a single line of code

### HIPAA (non-negotiable)
- Employer, broker, and league views: show **only** username, public_id, team, and aggregate BHAS %. Never real names, emails, or individual lab values.
- No PHI in logs, URLs, or query strings.
- Every new Supabase table with PHI must have RLS enabled.
- Default `is_public = false`. Consent required before sharing any profile data.

### Auth pattern (avoid deadlock)
- **Never** call `supabase.auth.getSession()` from a component `useEffect` on mount — it deadlocks the Supabase JS auth client.
- Use `getStoredJwt()` from `src/lib/supabase.ts` to read the JWT from localStorage.
- Use `supabase.auth.setSession()` to hydrate the client's internal session (required for RLS on insert/update/delete).

### Server auth pattern
- Admin server endpoints (`requireAdmin()`) check for `x-backend-api-key` header — **not** `Authorization: Bearer`.
- User-facing endpoints check for `x-user-id` header.
- `VITE_BACKEND_API_KEY` is the env var for the admin key on the frontend.
- `VITE_BACKEND_URL` points to the backend (`http://localhost:4242` locally, Render URL in prod).

### Code exploration
- Use **jCodemunch MCP tools** for all code exploration. Call `list_repos` first. The indexed repo is `local/src-1b49057d`.
- `get_file_outline` before `get_file_content`. `search_symbols` / `search_text` before reading.
- Only fall back to Read/Grep if jCodemunch returns "file not found".

### Large docs
- Use **context-mode MCP** (`ctx_index` + `ctx_search`) for `CLIENT_FEEDBACK.md` and `DEVELOPER_REQUIREMENTS.md` — keeps them out of context window.

### SQL
- All migrations run in **Supabase Dashboard → SQL Editor**. Never via CLI.

### After every feature
- Update `IMPLEMENTATION_TRACKER.html` (phase progress, stats bar, last-updated line, footer)
- Append to `CHANGELOG.md`
- Add entry to `.ai/project-progress.json`
- Add new test items to `docs/browser-test-checklist.html` (append only — never change existing item IDs, as they map to localStorage data)

---

## Current build status (as of 2026-04-28)

**62 built · 2 partial · 5 not built/skipped out of 69 total items**

| Phase | Status | Summary |
|-------|--------|---------|
| 1 | ✅ 4/4 | Core infra, Admin CMS, Resource Library, Lab Input |
| 2 | ✅ 6/6 | BHAS v1 scoring, Vitamin B12, Biometrics, Reminders, Public profile |
| 3 | ✅ 4/5 | AI PDF upload, duplicate detection, New Marker Wizard, Provider Verification; F13 skipped |
| 4 | ✅ 6/6 | Org structure, Username system, Employer view, Team scoring, Admin filters |
| 5 | ✅ 6/6 | Corporate analytics, Lab trend charts, National benchmarks, Insurance reports, PDF health report |
| 6 | 🔶 3/6 | Supplements dropdown ✅, Affiliate catalog ✅, Affiliate display ✅; payment ❌, HSA partial, HSA bank ❌ |
| 7 | 🔶 4/5 | VO2 Max calculator ✅, ACP ✅, Insulin tracking ✅, Acute visits ✅; CGM ❌ |
| 8 | ✅ 13/13 | BHAS v2.3 engine (max 7.0, HOMA-IR, TG/HDL, WtHR, VitD, B12, ACP, T1 insulin) |
| 9 | ✅ 2/2 | DB-driven scoring tier, multiple ranges per tier in Wizard |
| 10 | 🔶 15/17 | All backlog items done except F52 (lab API research ❌) and F66 (challenges 🔶 DB-only) |

### Recently completed (session 6, 2026-04-28) — browser-tested ✅
- **F63 browser-tested** — Leagues: list page, league detail, org assignment, slug auto-fill. 6/6 pass.
- **F64 browser-tested** — Brokers tab, role assignment via new Users tab. 4/4 pass.
- **F65 browser-tested** — Virtual Providers: Admin create, Dashboard cards, expand/collapse. 4/4 pass.
- **F62 browser-tested** — PSA range 0–4, Free T/Total T male + female hormones track-only. 4/4 pass.
- **Admin UX — Option D nav** — icon+label tile grid (13 tabs, wraps, no overflow). Replaces flat tab bar.
- **Slug auto-fill** — Both org and league create forms auto-populate slug from name; editable.
- **Admin → Users tab** — full user management: create (email/password/role/username), inline role change, delete (super admin only with confirm dialog).
- **Employer View back button** — "← Back to Organizations" deep-links to Admin → Organizations tab via `admin/organizations` route + `initialTab` prop.
- **3 new server endpoints** — `POST /api/admin/users`, `PATCH /api/admin/users/:id/role`, `DELETE /api/admin/users/:id`.

### ⚠️ Session 2 items NOT YET browser-tested
Items 22–28 in `docs/browser-test-checklist.html`. Start next session by testing these:
1. Admin Option D nav renders correctly (item 22)
2. Org slug auto-fill (item 23)
3. League slug auto-fill (item 24)
4. Create user with broker role (item 25)
5. Inline role change (item 26)
6. Delete user — Super Admin only (item 27)
7. Employer View back button → lands on Orgs tab (item 28)

---

## What to build next (blocked on Damon's answers)

**Send Damon these questions and build once answers arrive:**

### Health Assessment (blocks F66 challenge UI and F67 health assessment feature)
1. Sleep: how is Yes/No framed? (e.g., "Do you get 7–9 hours of sleep most nights?")
2. Stress: how is Yes/No framed?
3. Exercise: how is Yes/No framed? (e.g., "Do you exercise at least 150 min/week?")
4. Alcohol: threshold for Yes/No?
5. Smoking: threshold for Yes/No?
6. Does the assessment affect BHAS scoring or is it tracked separately?
7. Cadence: signup only, quarterly, or with every lab entry?
8. Can employers see aggregate symptom/lifestyle data (de-identified)?

### Other open questions
- **Virtual provider state filter:** State dropdown filter for providers — org-specific or global? Build now or defer?
- **De-identified org join:** When a user joins an org, can they do so without the employer knowing who they are? If yes, what does the employer see — just a headcount?
- **Challenge UI (F66 DB done):** Once health assessment Q's answered, build: Admin creates challenge, assigns 2+ orgs, 9-month window with 0+6-month lab snapshots. Members see org standing vs other orgs.

### Deprioritized (free app pivot — do NOT build unless Damon re-confirms)
- Payment processing (F26)
- HSA bank integration (F28)
- Employer invoice PDF
- Tax code compliance (§105/§125/§213)

---

## Key architecture facts

### BHAS v2.3 scoring
- Engine: `src/utils/bhasV2.ts` → `calculateBhasV2Score()`
- 7 scored metrics: HOMA-IR, TG/HDL, Vitamin D, Vitamin B12, WtHR, ACP, Insulin Units/kg (T1 only)
- Max score = 7.0. Bands: Optimal ≥6.0, Healthy ≥5.0, Needs Improvement ≥4.0, High Risk <4.0
- VO2 Max + Grip Ratio are **tracked but not scored** — biometrics only
- HOMA-IR: Optimal <2.0, Improvement 2.0–3.0, Out of Range ≥3.0
- Tie-breakers: #1 VO2 Max %, #2 Grip Strength, #3 acute visits, #4 hs-CRP
- Dashboard shows v2.3 panel when ≥4 of 7 metrics available
- Stored daily in `bhas_v2_scores` table. SessionStorage cache key: `nhl-bhas-v23-result`

### Scoring tier (DB-driven since F47)
- `tags` table has `scoring_tier` column: `'optimal'` | `'improvement'` | `'out_of_range'`
- `EvaluationContext` fetches tiers and passes `TagTierMap` to `calculateBhasScore()`
- Hardcoded `OPTIMAL_TAGS` / `IMPROVEMENT_TAGS` in `evaluateRules.ts` kept as fallback only

### Public ID
- Format: `NHL-XXXX-XXXX`. Generated in `src/utils/publicId.ts` → `generatePublicId()`
- Never expose the user's real name in employer/broker/league views — always public_id + username

### `/api/admin/organizations` response shape
- Returns a **plain array** (not `{ organizations: [] }`). Many components get this wrong. Always check with `Array.isArray()`.

### Admin navigation
- **Option D icon+label tiles** — defined inline in Admin.tsx as a `tabs` array of `{ id, icon, label }`. To add a new tab: add entry to the array, add to `VALID_TABS`, add render block.
- **Deep-link to a tab:** navigate to `admin/organizations` (or any tab id). App.tsx extracts `initialTab` from the path and passes it to Admin. Admin opens to that tab on mount.

### User roles
- `profiles.role`: `'member'` | `'broker'` | `'admin'` | `'super_admin'`
- Broker users appear in Admin → Brokers tab for org assignment
- Delete user: Super Admin only (UI gated by `isSuperAdmin` from `useAuth()`)
- Server endpoints don't distinguish super_admin vs admin at API key level — UI enforcement only for delete

### Supabase RLS
- Two separate SELECT policies are needed for tables where users see active-only but admins see all. `FOR ALL` does NOT override `FOR SELECT` in Postgres.

---

## Key files

| File | Purpose |
|------|---------|
| `src/utils/bhasV2.ts` | BHAS v2.3 engine |
| `src/utils/evaluateRules.ts` | BHAS v1 engine + tag scoring (fallback) |
| `src/context/EvaluationContext.tsx` | Fetches rules/resources, runs evaluation, exposes bhasResult |
| `src/context/ResultsContext.tsx` | User lab results, persisted to Supabase |
| `src/context/AuthContext.tsx` | Auth — uses getStoredJwt(), never getSession() |
| `src/lib/supabase.ts` | getStoredJwt(), getStoredSession() helpers |
| `src/pages/Admin.tsx` | Full Admin CMS (14 tabs). Option D icon nav. Accepts `initialTab` prop. |
| `src/pages/Dashboard.tsx` | BHAS banner, VirtualProviderCards, AffiliateProductCards, national benchmarks |
| `src/pages/EmployerPage.tsx` | De-identified employer view. Has "← Back to Organizations" button. |
| `src/pages/LeaguesListPage.tsx` | All active leagues list |
| `src/pages/LeaguePage.tsx` | Single league standings (org-level avg BHAS) |
| `src/components/AdminLeaguesTab.tsx` | Admin: create leagues, assign orgs. Slug auto-fills from name. |
| `src/components/AdminBrokersTab.tsx` | Admin: assign orgs to broker users |
| `src/components/AdminProvidersTab.tsx` | Admin: create/edit/delete virtual providers |
| `src/components/AdminUsersTab.tsx` | Admin: create users, change roles, delete (super admin only) |
| `src/components/VirtualProviderCards.tsx` | Dashboard: expandable provider cards |
| `src/utils/nationalBenchmarks.ts` | CDC/NHANES benchmark data, 15 markers |
| `src/utils/publicId.ts` | generatePublicId() → NHL-XXXX-XXXX |
| `server/index.js` | All Express endpoints (~2900 lines) |
| `db/migrations/` | All DB migrations (30 total, all run) |
| `docs/browser-test-checklist.html` | Living test checklist — append new items, never change existing IDs |
| `docs/admin-nav-options.html` | 4 nav layout mockups — Option D implemented |
| `DEVELOPER_REQUIREMENTS.md` | Full feature spec — search with ctx_search, don't read directly |
| `CLIENT_FEEDBACK.md` | All email exchanges with Damon — search with ctx_search |
| `IMPLEMENTATION_TRACKER.html` | Phase-by-phase progress tracker |
| `CHANGELOG.md` | Feature/fix log, newest first |
| `.ai/project-progress.json` | Machine-readable session log |

---

## Migration run order (all 30 have been run in Supabase)

The last 6 (all 2026-04-16):
- `20260416_fix_hormone_markers.sql` — hormone marker corrections
- `20260416_create_leagues.sql` — leagues + league_orgs
- `20260416_add_broker_role.sql` — broker_orgs + profiles.role extension
- `20260416_create_virtual_providers.sql` — virtual_providers
- `20260416_create_challenges.sql` — challenges + challenge_orgs

---

## Server endpoints added this session

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/admin/users` | `x-backend-api-key` | Create user via `auth.admin.createUser`. Body: `{ email, password, role, username? }` |
| `PATCH` | `/api/admin/users/:id/role` | `x-backend-api-key` | Change user role. Body: `{ role }`. Valid: `member`, `broker`, `admin` |
| `DELETE` | `/api/admin/users/:id` | `x-backend-api-key` | Permanently delete user. Body: `{ confirm: "DELETE" }` required. Irreversible. |

---

## Dev tooling (present in this repo — remove before client handoff)

- `server/mcp/index.js` — nhl-app MCP server (5 tools: get_implementation_status, get_migration_history, get_db_schema, get_marker_list, get_bhas_scoring_rules). Registered in `.mcp.json`.
- `IMPLEMENTATION_TRACKER.html` — progress tracker
- `DEVELOPER_REQUIREMENTS.md` — full spec
- `CLIENT_FEEDBACK.md` — email Q&A log
- `CHANGELOG.md`, `.ai/`, `.claude/`, `CLAUDE.md` — all dev-only
- `docs/browser-test-checklist.html` — living test checklist (dev only)
- `docs/admin-nav-options.html` — nav layout mockups (dev only)

See `project_handoff_cleanup.md` for the full pre-delivery checklist.

---

## Starting a new session — checklist

1. Call `mcp__jcodemunch__list_repos` — confirm `local/src-1b49057d` is indexed
2. Call `mcp__context_mode__ctx_index` on `CLIENT_FEEDBACK.md` and `DEVELOPER_REQUIREMENTS.md`
3. Start both dev servers: `npm run dev` (Vite, port 3000) + `node server/index.js` (Express, port 4242)
4. If any session-2 items (22–28) in `docs/browser-test-checklist.html` aren't green, test those first
5. Check `CLIENT_FEEDBACK.md` for new answers from Damon before starting new features

## Test checklist rules (important)
- `docs/browser-test-checklist.html` is a **living document** — results saved in browser localStorage survive page refreshes
- When adding new test items, always **append** with new unique IDs (e.g. `s3-featurename`)
- **Never** change or reuse an existing item's `data-id` — it would orphan the stored result
- Item numbers in the UI are cosmetic; the `data-id` is what matters for persistence
