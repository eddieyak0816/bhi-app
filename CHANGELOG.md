# CHANGELOG

## 2026-03-23 — built (F47: DB-driven scoring tier — removes hardcoded OPTIMAL_TAGS / IMPROVEMENT_TAGS)

### F47: scoring_tier column on tags table

**Problem:** The BHAS v1 scoring engine had two hardcoded sets (`OPTIMAL_TAGS`, `IMPROVEMENT_TAGS`) in `src/utils/evaluateRules.ts` and a mirror copy in `server/index.js`. Any new marker created via the New Marker Wizard would always score 0 until a developer manually added its tags to these sets and redeployed.

**Fix — 3 parts:**

**`db/migrations/20260323_add_scoring_tier_to_tags.sql`**
- Adds `scoring_tier TEXT CHECK (IN ('optimal','improvement','out_of_range'))` column to the `tags` table
- Backfills all existing 15 markers' tags with their correct tiers
- Run in Supabase Dashboard → SQL Editor

**`src/utils/evaluateRules.ts`**
- Added `TagTierMap` type (`Map<string, 'optimal'|'improvement'|'out_of_range'>`)
- `tagToScore()` now accepts optional `tagTierMap` — uses DB tier first, falls back to hardcoded sets for any tag with null tier (backward compatible)
- `calculateBhasScore()` accepts optional `tagTierMap` and passes it through

**`src/context/EvaluationContext.tsx`**
- Fetches `tags(name, scoring_tier)` in parallel with existing rules + resources fetch
- Builds `TagTierMap` and passes it to `calculateBhasScore()`

**`server/index.js`**
- Removed hardcoded `OPTIMAL_TAGS` / `IMPROVEMENT_TAGS` sets
- `tagToScore()` now accepts `tagTierMap` parameter
- `computeBhasPct()` now accepts and uses `tagTierMap`
- Employer view endpoint fetches `tags(name, scoring_tier)` and builds the map before computing BHAS scores
- New Marker Wizard endpoint saves `scoring_tier` to the `tags` table when creating tags; updates tier on existing tags that have null tier

**Result:** Creating a new marker via the Wizard is now fully self-contained. No code changes or redeployment needed after wizard use.

**Action required:** Run `db/migrations/20260323_add_scoring_tier_to_tags.sql` in Supabase Dashboard → SQL Editor.

---

## 2026-03-23 — feat: CSV export for EmployerPage and LeaderboardPage

### New: `src/utils/csvExport.ts`

Reusable CSV utility with three exports:
- `buildCsvString(headers, rows)` — builds an RFC 4180-compliant CSV string
- `downloadCsv(csv, filename)` — triggers a browser file download via `Blob` + `URL.createObjectURL`
- `todayIso()` — returns today's date as `YYYY-MM-DD`

### EmployerPage — Export CSV button (members tab)

An **Export CSV** button now appears in the Members section header (right-aligned). It exports the currently-filtered member list to `bhi-members-{orgSlug}-{date}.csv`.

Columns: Username, Public ID, Team, Role, Joined Date, BHAS Score (%), Lab Results

Only visible when the filtered list is non-empty. No PHI — matches the existing de-identified view.

### LeaderboardPage — Export CSV button

An **Export CSV** button now appears above the filter bar (right-aligned). It exports the currently-filtered leaderboard entries to `bhi-leaderboard-{orgSlug}-{date}.csv`.

Columns: Rank, Username, Public ID, Team, BHAS Score (v2.3), Health Label, VO2 Max Percentile, Waist-to-Height Ratio, hs-CRP, Acute Visits, Score Date

Ranks in the CSV reflect the unfiltered position (tie-breaker order), matching the on-screen display. Only visible when the filtered list is non-empty.

### Tracker updates
- Phase 8 item 46 (CSV export) → ✅ Built — Phase 8 is now 13/13 complete
- Phase 5 item 22 (Exportable reports) → ⚠️ Partial — CSV done, PDF reports pending
- Overall stats: Done 39 / Partial 4 / Not Built 16 / Total 59

---

## 2026-03-20 — updates (profile fix + backlog items added)

### Profile Save — fixed (stale Supabase client)

`src/pages/ProfilePage.tsx` — `handleSave()` was using the Supabase JS client `.update()` which hangs without resolving when the connection is stale (known issue on tab re-focus). Replaced with a direct `fetch` PATCH to the Supabase REST API (same pattern as `directFetch` used for reads). Save now completes reliably and shows success/error feedback.

### Profile — Sex selector

Removed "Other" option from the sex selector on the Profile page. Only Male and Female are shown. (DEVELOPER_REQUIREMENTS F55)

### Backlog items added (Phase 10)

The following items were added to `DEVELOPER_REQUIREMENTS.md` as Phase 10 backlog:
- **F49** — Resource Library thumbnails/images (design TBD before building)
- **F50** — Rebrand BHI → NHL (National Health League) — scope to be confirmed
- **F51** — Lab data retention: 1-year limit on stored lab marker results
- **F52** — Research: direct lab API integrations (Labcorp, Quest, Mako, Rhythm)
- **F53** — Review: "Add Provider Verification" section on Labs page
- **F54** — Test: "Add Category" pill in Admin → Resources tab

---

## 2026-03-20 — built (hs-CRP and VO2 Max Percentile markers added to database)

The `20260320_complete_logic_rules.sql` migration skipped hs-CRP and VO2 Max Percentile because those markers did not exist in the `lab_markers` table. A follow-up SQL script was run directly in Supabase SQL Editor to:
- Create the `hs-CRP` marker (unit: mg/L) and its 3 logic rules (Low/Average/High CRP)
- Create the `VO2 Max Percentile` marker (unit: %) and its 3 logic rules (Low/Average/Excellent VO2)

Database now has all 15 markers with 53 logic rules total. Verified by query.

---

## 2026-03-20 — built (Logic Rules Update + Admin UX)

### Medically Current Lab Marker Scoring Ranges

Updated BHAS scoring logic to use current medical guidelines for all 15 markers.

**`src/utils/evaluateRules.ts`** — Added new tags to OPTIMAL_TAGS and IMPROVEMENT_TAGS:
- `Low_CRP` (optimal), `Average_CRP` (improvement) — hs-CRP per ACC/AHA
- `Excellent_VO2` (optimal), `Average_VO2` (improvement) — VO2 Max Percentile per ACSM
- `Optimal_Insulin` (optimal), `Acceptable_Insulin` (improvement) — Fasting Insulin per Kraft/conventional

**`db/migrations/20260320_complete_logic_rules.sql`** — Complete idempotent migration to update all 15 marker logic rules to current medical guidelines:
- Vitamin D (Endocrine Society): <20 Deficient, 20–29.9 Insufficient, 30–100 Adequate, >100 Excess
- Fasting Glucose (ADA 2024): <70 Low, 70–99.9 Normal, 100–125.9 Prediabetic, ≥126 Diabetic
- Fasting Insulin: <5 Optimal, 5–9.9 Acceptable, 10–19.9 Elevated, ≥20 High
- Total Cholesterol (AHA/ACC): <200 Desirable, 200–239.9 Borderline, ≥240 High
- HDL: <40 Low, 40–59.9 Fair, ≥60 Good
- LDL: <100 Optimal, 100–129.9 Near Optimal, 130–159.9 Borderline High, 160–189.9 High, ≥190 Very High
- Triglycerides: <150 Normal, 150–199.9 Borderline High, 200–499.9 High, ≥500 Very High
- BP Systolic/Diastolic (AHA/ACC 2017): Normal / Elevated / Stage 1 / Stage 2
- hs-CRP (ACC/AHA): <1.0 Low, 1.0–3.0 Average, >3.0 High
- VO2 Max Percentile (ACSM): ≥60 Excellent, 40–59 Average, <40 Low
- Vitamin B12: <200 Deficient, 200–299.9 Low Normal, 300–900 Adequate, >900 Excess
- Waist Circumference Male/Female — updated thresholds (inches)
- Grip Strength: ≥35kg Optimal, 25–34.9 Low Normal, <25 Low

> **Action required:** Run `db/migrations/20260320_complete_logic_rules.sql` in Supabase Dashboard → SQL Editor.

### Admin — Removed Quick Add Marker form

Removed the "Quick Add Marker (no rules)" form from the Markers tab. It created markers with no scoring rules, which caused them to always score 0 in BHAS. The **New Marker Wizard** (already present) handles all marker creation with guided rule and tag setup. Cleaned up associated unused state.

---

## 2026-03-18 — built (F18a+ Sortable Column Headers)

### Sortable Column Headers — Admin & Employer pages

Added click-to-sort on column headers across three tables. Clicking a header sorts ascending; clicking again reverses to descending. Active sort column shows ↑/↓ arrow indicator.

**Admin → Organizations → expanded panel → Team Score Summary**
- Sortable: Team (A→Z), Members (numeric), Avg BHAS (numeric), % at Optimal (numeric)
- Default: Avg BHAS descending

**Admin → Organizations → expanded panel → Member table**
- Sortable: Public ID, Role, Team, Joined (all string/date)
- Default: Public ID ascending

**Admin → Organizations → User Identity Mapping table**
- Sortable: Name, Email, Username, Public ID, Role (all string)
- Default: Name ascending

**Employer page → Members tab → Members table**
- Sortable: Username, Public ID, Team, BHAS Score (numeric), Results (numeric), Role, Joined
- Default: BHAS Score descending (preserves prior behavior)

All sorting is client-side. Sort state is per-table (org-keyed for expanded panels). No server changes.

---

## 2026-03-18 — built (F18a Admin Org Filters)

### F18a: Admin Organizations Tab — Search & Filter

Client-side filtering added to the Admin → Organizations tab. No new server endpoints required — all data is already loaded into state on panel expand.

**Org list (card level)**
- Text search input: filter org cards by name or slug (case-insensitive substring)
- Min members number input: hide orgs below a member count threshold
- Sort toggle: A→Z by name, or by member count descending

**Member table (inside expanded org panel)**
- Public ID search: filter member rows by BHI-XXXX-XXXX token substring
- Team dropdown: filter by assigned team (options from the org's team list)
- Role dropdown: filter by `member` | `admin`
- "Unassigned only" checkbox: show only members with no team assigned
- Clear button (appears when any filter active) + "Showing X of Y" count

**Team Score Summary table (inside expanded org panel)**
- Min avg BHAS slider (0–100): hide teams scoring below threshold
- "Has members only" toggle: hide teams with 0 members

Filter state resets when org panel is collapsed. Styling to match existing filter bars on `EmployerPage.tsx` and `LeaderboardPage.tsx`.

---

## 2026-03-18 — dev (F20 Corporate Analytics Dashboard)

### F20: Corporate Analytics Dashboard — Complete

**`server/index.js` — new endpoint `GET /api/analytics/:orgSlug`**
- Auth: org admin or app admin only (same access check as employer endpoint, via `x-user-id` header).
- Returns:
  - `kpis` — `{ total_members, members_with_data, avg_bhas_pct, pct_at_optimal }` — org-level summary.
  - `score_distribution` — member counts in 5 BHAS % buckets (0–24, 25–49, 50–74, 75–99, 100), computed from latest `bhas_v2_scores` per member.
  - `label_distribution` — member counts by BHAS v2 label (Optimal / Healthy / Needs Improvement / High Risk).
  - `trend` — weekly org-average BHAS % for last 12 weeks, grouped by ISO week from `bhas_v2_scores`. One data point per week: `{ week, avg_score, member_count }`. Uses latest score per user per week to avoid double-counting.
  - `metric_breakdown` — per-metric % of members scoring Optimal, extracted from `metric_scores` JSONB in each member's latest `bhas_v2_scores` row. Excludes metrics where `included=false` (e.g. HOMA-IR excluded for Type 1). Each entry: `{ metric, optimal_pct, member_count }`.
- Returns empty payload with zero members if org has no memberships.
- PHI guarantee: aggregates only — no names, emails, or raw lab values.

**`src/pages/EmployerPage.tsx` — Analytics tab**
- Two-tab layout added below org header: **Members** (existing view, unchanged) and **Analytics** (new).
- Analytics data fetched lazily on first tab switch (not on initial page load).
- `AnalyticsPanel` component renders:
  - **4 KPI tiles:** Total Members · Members with Data · Avg BHAS % · % at Optimal.
  - **BHAS Score Distribution** — vertical `BarChart` (Recharts). X-axis: 5 score buckets. Bars colour-coded green/amber/red matching BHAS palette.
  - **Health Label Distribution** — coloured count cards for each BHAS v2 label.
  - **Org BHAS Trend** — `LineChart` (Recharts). X-axis: ISO week. Y-axis: 0–100%. Dashed reference line at 89% (Optimal threshold). Tooltip shows avg % + member count.
  - **Per-Metric % Optimal** — horizontal `BarChart` (Recharts). One bar per BHAS v2 metric. X-axis: 0–100%. Bars colour-coded ≥75% green / ≥50% amber / <50% red. Tooltip shows % + member count.
- No new route — renders inline under `#/employer/:orgSlug`.
- No new dependencies — uses Recharts (already installed).

**No DB migration required** — reads from existing `bhas_v2_scores` and `org_memberships` tables.

---

## 2026-03-18 — dev (update 2)

### Leaderboard & Employer View — Filters + Dark Mode Polish

**`src/pages/LeaderboardPage.tsx`**
- Added inline grid filter bar: username/public ID search, team dropdown, health label dropdown, min BHAS score slider (0–9), Clear button.
- Rank numbers always reflect full unfiltered standings even when filters are active.
- "Showing X of Y" count displayed when any filter is active.
- Fixed `GET /api/leaderboard/:orgSlug` 500 error: replaced PostgREST embedded join `profiles(username, public_id)` with separate profiles fetch joined in JS (same fix as employer endpoint).
- Dark-mode aware team color palette (`TEAM_PALETTE_DARK` using rgba backgrounds with light text).

**`src/pages/EmployerPage.tsx`**
- Added inline grid filter bar above member table: username/public ID search, team dropdown, role dropdown, min BHAS % slider (0–100), Clear button.
- "Showing X of Y" count when filters active; "No members match" empty state.
- Dark-mode aware team color palette for both team summary cards and member table badges.

---

## 2026-03-18 — dev

### F43: Persist BHAS v2.3 Derived Values

**DB migration: `db/migrations/20260318_create_bhas_v2_scores.sql`**
- New table `bhas_v2_scores`: one row per user per day (`UNIQUE(user_id, score_date)`).
- Stores: `total_score`, `label`, `homa_ir`, `tg_hdl_ratio`, `grip_ratio`, `wthr`, `insulin_units_per_kg`, `vo2_max_percentile`, `hs_crp`, `acute_visits`, `metric_scores` (JSONB full breakdown).
- RLS: users can read/insert/update their own rows only.

**`src/pages/Dashboard.tsx`**
- After `calculateBhasV2Score()` runs and `hasEnoughData` is true, fires a fire-and-forget Supabase upsert to `bhas_v2_scores` with conflict target `(user_id, score_date)`.

---

### F45: Leaderboard with Tie-Breaker Ranking

**`server/index.js` — new endpoint `GET /api/leaderboard/:orgSlug`**
- Auth: org admin or app admin only (same access check as employer endpoint).
- Reads latest `bhas_v2_scores` row per org member.
- Sorts by 5-level tie-breaker: 1) Higher total_score, 2) Higher VO2 Max %, 3) Lower WtHR, 4) Lower hs-CRP, 5) Fewer acute visits.
- PHI guarantee: returns username + public_id only — no name, email, or raw lab values.

**New file: `src/pages/LeaderboardPage.tsx`**
- Ranked table with medal badges (🥇🥈🥉), label color chips, team badges, tie-breaker columns (VO2 %, WtHR, hs-CRP), and score date.
- "← Employer View" back-link.
- Route: `#/leaderboard/:orgSlug`.

**`src/pages/EmployerPage.tsx`**
- Added "View Leaderboard" button in org header, navigates to `leaderboard/:orgSlug`.

**`src/App.tsx`**
- Imported `LeaderboardPage` and added route: `currentPage.startsWith('leaderboard/')`.

---

## 2026-03-17 — dev

### BHAS v2.3 Parallel Scoring Engine (F34–F42, F44)

**New file: `src/utils/bhasV2.ts`**
- `calculateBhasV2Score(results, profile)` runs in parallel with v1 engine — v1 (`evaluateRules.ts`) is unchanged.
- Scores 9 metrics using derived ratios: HOMA-IR, TG/HDL Ratio, Grip Ratio, Waist-to-Height Ratio, Vitamin D (binary), Vitamin B12 (binary), VO2 Max Percentile, Advanced Care Plan (binary), Insulin Units/kg (Type 1 only).
- Type 1 Diabetes branch: excludes HOMA-IR, substitutes Insulin Units/kg scoring.
- Score interpretation: ≥8.0 = Optimal, ≥6.0 = Healthy, ≥4.0 = Needs Improvement, <4.0 = High Risk.
- `hasEnoughData` flag: panel only shows when ≥4 of 9 metrics are scoreable.
- `missingInputs[]`: hints to user listing what's needed to complete the score.
- `tieBreaker` object exposes VO2 Max, WtHR, hs-CRP, Acute Visits for future leaderboard use.

**DB migration (run in Supabase SQL Editor):**
```sql
alter table profiles
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists is_type1_diabetes boolean default false,
  add column if not exists total_daily_insulin_units numeric,
  add column if not exists has_advanced_care_plan boolean default false,
  add column if not exists acute_visits integer;
```

**`src/pages/ProfilePage.tsx` — new Biometrics + Clinical Information fields:**
- Height: two inputs (feet + inches), converts to cm on save (`ft × 30.48 + in × 2.54`), displays in American units on load.
- Body Weight: lbs input, converts to kg on save (`lbs ÷ 2.205`), displays in lbs on load. DB stores `weight_kg`.
- Type 1 Diabetes checkbox: conditionally shows Total Daily Insulin Units input; clears insulin on uncheck.
- Advanced Care Plan checkbox.
- Acute Care Visits number input (tie-breaker only, not directly scored).
- `handleSave` wrapped in try/catch/finally to prevent button hang on network errors.

**`src/pages/Dashboard.tsx` — BHAS v2.3 panel:**
- Loads profile from Supabase, converts waist to cm if stored in inches, builds `BhasV2Profile`, calls `calculateBhasV2Score`.
- Panel renders below existing BHAS v1 banner only when `hasEnoughData`.
- Shows score/9.0, colored label badge, metric chips with derived value tooltips on hover.
- Missing inputs hint with links to Profile and Labs pages.

**Tested with real user data (Eddie Yakubovich):**
- 9/9 metrics covered after adding test lab rows (Triglycerides, hs-CRP, VO2 Max Percentile) and fixing B12 marker name.
- Confirmed score changes reactively when Advanced Care Plan toggled: 4.0 → 5.0.

## 2026-03-17 — scope review

### BHAS v2.3 Scope Added (from APP integration Point system and Metrics.pdf)

Reviewed official BHAS v2.3 specification. Identified 13 new scope items (F34–F46) added as Phase 8 in IMPLEMENTATION_TRACKER.html and DEVELOPER_REQUIREMENTS.md Section 6b.

Key changes vs. current implementation:
- **Scoring engine rewrite required:** current app scores raw markers directly; v2.3 requires derived ratios (HOMA-IR, TG/HDL, Grip Ratio, WtHR) computed before scoring
- **New markers needed:** Fasting Insulin, hs-CRP, VO2 Max Percentile
- **New profile fields needed:** Height, Type 1 Diabetes flag, Advanced Care Plan status, Acute Care Visits, Total Daily Insulin Units
- **Breaking changes:** Vitamin D and B12 change from tiered to binary scoring; Waist and Grip scoring replaced by WtHR and Grip Ratio
- **New outputs:** score interpretation labels (Optimal / Healthy / Needs Improvement / High Risk), leaderboard with tie-breaker, CSV de-identified export, stored derived values
- No code changed — scope documentation only

## 2026-03-17 — dev

### Feature 23: Lab Marker Charts (Phase 5 / Section 8b)

**Historical trend charts on Labs page**
- Installed `recharts` (ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer).
- Added `buildChartData(markerName)` helper in `LabsPage.tsx` — returns ascending-date sorted data points for a marker.
- Each marker card in "Your Markers" now shows a "Show Trend" toggle button **when the marker has ≥ 2 historical data points** (markers with only one result get no toggle).
- Clicking the toggle opens an inline `ComposedChart` panel below the marker grid showing:
  - Blue line with dots for each historical value (X-axis: date, Y-axis: result value).
  - Green shaded `ReferenceArea` band for the optimal range (sourced from `optimalRanges` map — same logic rules used for BHAS scoring).
  - Dashed green `ReferenceLine` at optimal min and max boundaries.
  - Tooltip showing value + unit on hover.
  - Y-axis domain auto-padded to include both data values and optimal range.
  - Optimal range label displayed in the panel header for quick reference.
- Only one marker chart can be open at a time (controlled by `chartOpenMarker: string | null` state).
- No new DB migration required — data already exists in `user_lab_results`.
- No new page route — charts render inline on `#/labs`.

## 2026-01-25 — dev
- Added Admin UI: tag-manager, criteria (logic_rules) CRUD, inline lab-marker creation, bulk-delete, CSV export. (`src/pages/Admin.tsx`)
- Server: admin endpoints for `tags`, `logic_rules`, `lab_markers`, `resources` bulk-delete and `delete-by-attrs` fallback; audit logging added. (`server/index.js`)
- Database: `tags` table + seed updates; optional migration to add `id` to `logic_rules` created. (`db/tags.sql`, `db/migrations/20260120_add_logic_rules_id_optional.sql`)
- Tests: expanded Playwright coverage for Admin flows; hardened selectors and added API-fallback cleanup. (`tests/admin.spec.ts`)
- CI: added schema validator and `ASSISTANT_PREFERENCES.md` enforcement workflow; Playwright runner adjustments to avoid remote browser-download failures.

## Pending
- Tenant RLS: enable & validate in staging; backfill tenant_id where required.
- Hosted uploads: presigned URL flow + preview UI + retention policy.
- CI: split E2E into dedicated job and stabilise remote runs.

## 2026-02-05 — dev
- Introduced many-to-many mapping between `tags` and `categories` via new join table `tag_categories`.
- Added migrations: `20260205_add_category_to_tags.sql`, `20260206_create_tag_categories_table.sql` and idempotent seed `20260207_seed_cardiometabolic.sql`.
- Backend: admin tag endpoints now accept/return `categories: string[]` and manage `tag_categories` where available (keeps legacy fallbacks).
- Frontend: Admin UI — tag edit now opens a modal, tags can be assigned categories, tag create/send flows updated; lab marker edits moved to modal for consistency.

## 2026-03-02 — dev

### Phase 2: BHAS Scoring + Biometrics

**BHAS Scoring (fully live)**
- Added `calculateBhasScore()` to `src/utils/evaluateRules.ts` — scores each marker: Optimal=1, Improvement=0.5, Out of Range=0; rolls up totalScore, maxPossible, percentage.
- Dashboard shows BHAS % banner with per-marker colour-coded chips (green/amber/red).
- Labs page shows BHAS Score column per result row with hover tooltip showing the fired tag.
- Fixed `db/insert_medical_criteria.sql`: corrected glucose marker lookup from `'blood glucose'` → `'fasting glucose'` to match actual DB marker name.
- Cleaned duplicate and triplicate logic rules from DB (space-style duplicates + B12 triplicates removed).
- Min Normal / Max Normal in lab entry form now derives from the optimal logic rule for the selected marker (not `lab_markers` table). Optimal ranges pre-loaded at mount — marker buttons always respond instantly.

**Vitamin B12**
- Migration `db/migrations/20260302_add_vitamin_b12.sql` adds Vitamin B12 lab marker (300–900 pg/mL), four tags, four logic rules, category mapping.

**Biometrics**
- Migration `db/migrations/20260302_add_biometrics_to_profiles.sql` adds `sex`, `waist_circumference`, `waist_unit`, `grip_strength`, `age` columns to `profiles` table.
- Migration `db/migrations/20260302_add_biometric_markers.sql` adds Waist Circumference (Male/Female) and Grip Strength lab markers with sex-specific logic rules and BHAS tags.
- Profile page: added Sex toggle (Male/Female/Other), Biometrics section (waist + grip), saves/loads from Supabase. Save Changes button now functional.
- BHAS scoring updated with biometric optimal/improvement tags in `evaluateRules.ts` and `LabsPage.tsx`.

**Biannual Lab Reminders (Phase 2 item 9)**
- Migration `db/migrations/20260302_create_user_lab_results.sql`: new `user_lab_results` table with RLS (per-user rows, references `auth.users`). Lab results are now fully persisted to Supabase — cross-device sync enabled.
- `ResultsContext.tsx` rewritten to load results from Supabase on mount, insert on `addResult`, delete on `removeResult`/`clearAllResults`. localStorage retained as a cache. Exposes `latestLabDate: string | null`.
- `src/utils/staleCheck.ts`: `STALE_DAYS = 180`, `isLabDataStale()`, `daysSinceLastLab()`.
- `src/components/StaleLabBanner.tsx`: amber warning banner shown when latest lab result is >180 days old.
- Banner wired into `Dashboard.tsx` (above stats grid) and `LabsPage.tsx` (above marker list).

**Public Profile / Opt-in Consent (Phase 2 item 10)**
- Migration `db/migrations/20260302_add_public_profile.sql`: adds `is_public boolean default false` to `profiles` table.
- `ProfilePage.tsx`: new Privacy section with toggle to enable/disable public profile; loads and saves `is_public`; "Learn more" link to consent page.
- `src/pages/ConsentPage.tsx` (`#/consent`): explains what is shared publicly (HIPAA-safe — name, BHAS %, tags only; no raw values, no email, no biometrics); toggle reads/writes `profiles.is_public` directly; developer action-required banner re: access-control decision.
- `src/pages/PublicProfilePage.tsx` (`#/public-profile`): self-preview of public profile showing name, BHAS score %, health tags (underscore-stripped), last updated month/year; developer decision-needed banner for access rules; private state shows lock message.
- **Phase 2 complete (6/6).**

**HIPAA-safe Public ID system (Phase 2 addendum)**
- Migration `db/migrations/20260303_add_public_id.sql`: adds `public_id text unique not null` to `profiles`; backfills existing rows with `BHI-XXXX-XXXX` tokens generated from `md5(random()||id)`.
- `src/utils/publicId.ts`: `generatePublicId()` — produces `BHI-XXXX-XXXX` tokens using a 32-char unambiguous alphabet (no O/0/I/1). Called at signup.
- `AuthContext.tsx`: on signup, updates the trigger-created profile row with a system-generated `public_id`.
- `ProfilePage.tsx`, `ConsentPage.tsx`, `PublicProfilePage.tsx`: all display the public token. Real name is never shown publicly. "Change ID" feature shows a "Coming soon — requires signed HIPAA authorization" placeholder.

## 2026-03-13 / 2026-03-14 — dev

### Phase 3: AI PDF Lab Upload & Extraction (Feature 11 — Complete)

**Core feature**
- `POST /api/extract-labs` endpoint added to `server/index.js`.
- `pdf-parse@1.1.1` extracts text from uploaded PDF server-side — no vision model required.
- AI provider cascade: Gemini key 1 → Gemini key 2 → OpenRouter (3 free models) → Groq. Auto-rotates on 429/quota errors.
- Supports up to 5 Gemini keys (`GEMINI_API_KEY` through `GEMINI_API_KEY_5`), `OPENROUTER_API_KEY`, and `GROQ_API_KEY` in `.env.server`.
- Frontend (`src/pages/LabsPage.tsx`): "Upload Lab PDF" button opens a hidden file input. Extracted rows shown in a review table with checkboxes, editable values, flag indicators, and ref ranges. User confirms before saving.
- Fuzzy marker name matching (case-insensitive substring): matched rows use app marker names and BHAS-aware ref ranges; unmatched rows save with freeform names (not BHAS-scored).
- Reference range priority: PDF-extracted range → app optimal logic rule → lab_markers table fallback.
- `test-lab-report.pdf` created in project root for end-to-end testing (9 markers: Fasting Glucose, Total Cholesterol, HDL, LDL, Triglycerides, Vitamin D, Vitamin B12, BP Systolic, BP Diastolic).
- Debug logs added at server startup to confirm env/key loading.

**Infrastructure fixes made during build**
- `.env.server` `dotenv` path changed to absolute (`path.resolve(__dirname, '..', '.env.server')`) — fixes key-not-found when server is started from any working directory.
- `.env.local` `VITE_BACKEND_URL` corrected to `http://localhost:4242` for local dev (was pointing to Render production URL).
- `.env.server` `SUPABASE_SERVICE_ROLE` corrected to the actual JWT (was accidentally set to `BACKEND_API_KEY` value).
- `pdf-parse` replaced with v1.1.1 (the initially installed version had an incompatible API).

**PDF Duplicate Detection (Feature 11a — Complete)**
- Migration `db/migrations/20260313_create_lab_pdf_uploads.sql`: new `lab_pdf_uploads` table (user_id, file_hash, accession_num, collection_date, filename, uploaded_at) with RLS and indexes on (user_id, file_hash) and (user_id, accession_num).
- Server computes SHA-256 hash of the PDF bytes on every upload. Hash-match duplicates (exact file re-upload) are detected before AI extraction and flagged in the response.
- AI prompt updated to extract `accession_num` and `collection_date` alongside lab values. Accession-number duplicates (same lab report, different file/scan) are detected after extraction.
- Both duplicate types return full extracted results so the user can still save if intentional.
- Frontend shows an amber warning banner above the review table: "Possible duplicate: [detail]. You can still save the results below if this is intentional."
- `x-user-id` header added to the upload request so the server can scope duplicate checks per user.

**New Marker Wizard (Feature 11b — Complete)**
- Admin: "+ New Marker Wizard" button on the Lab Markers tab opens a 3-step guided modal.
- Step 1: Enter marker name (duplicate-checked) and optional unit.
- Step 2: Define up to 3 scoring rules (Optimal / Improvement / Out of Range) — min value, max value, tag name. Tag names are auto-suggested from the marker name and fully editable. At least the Optimal row is required.
- Step 3: Review summary (marker, rules, tags) and single "Create All" button saves everything atomically.
- Server: new `POST /api/admin/new-marker-wizard` endpoint creates marker → tags → logic rules in one request with rollback on rule-insert failure. Returns `{ marker, rules, tags }`.
- On success the modal closes and the Lab Markers list refreshes automatically.
- Developer note displayed in Step 3: after wizard completion, add the Optimal tag to `OPTIMAL_TAGS` and Improvement tag to `IMPROVEMENT_TAGS` in `src/utils/evaluateRules.ts` for BHAS scoring (requires code change + redeploy).

**Provider Verification Workflow (Feature 12 — Complete)**
- Migration `db/migrations/20260313_add_provider_verification.sql`: adds `verification_type` (`self` | `provider` | `pdf`), `verifier_name`, `verifier_credential`, `verifier_npi`, `verifier_signature`, `verified_at` columns to `user_lab_results`.
- `ResultsContext.tsx`: extended `UserLabResult` with `verificationType` and `verification: ProviderVerification | null`. `addResult` persists verification fields to Supabase when type is `'provider'`. `rowToResult` hydrates them on load.
- `LabsPage.tsx`: "Add Provider Verification (optional)" toggle below the value fields — expands to a form collecting verifier name, credential, NPI (digits-only, max 10), date verified, and a typed-name signature with attestation text. Name and signature required if verification is enabled.
- Results table: new "Verified" column shows colour-coded badge — green "Provider" (hoverable tooltip with verifier name/credential/NPI/date), blue "PDF", grey "Self".

**Planned — Next**
- Feature 13: Direct lab API integrations (Labcorp, Quest, Mako, Rhythm) — skipped (blocked on lab partner agreements).

## 2026-03-14 — dev

### Phase 4: Corporate Org Structure (Feature 14 — Complete)

- Migration `db/migrations/20260314_create_org_structure.sql`: new `organizations` (id, name, slug, created_at) and `org_memberships` (id, org_id, user_id, role: member|admin, team: fire|water|wind|earth, joined_at) tables with full RLS. Org admins can read their org's memberships; members can read their own row; service role has unrestricted write access.
- Server (`server/index.js`): five new endpoints — `GET /api/admin/organizations`, `POST /api/admin/organizations`, `GET /api/admin/organizations/:id/members`, `POST /api/admin/organizations/:id/members`, `DELETE /api/admin/organizations/:id/members/:userId`, `DELETE /api/admin/organizations/:id`. All require `x-backend-api-key`.
- PHI rule enforced in `GET .../members`: returns only `username` and `public_id` (BHI-XXXX-XXXX token) — no real name, email, or raw lab values are exposed to employer-facing views.
- Admin UI (`src/pages/Admin.tsx`): new "Organizations" tab — list orgs with member counts, create org (name + slug), expand org to view de-identified member table, add member (user UUID, role, team), remove member, delete org.

### Phase 4: Username System (Feature 15 — Complete)

- Migration `db/migrations/20260314_add_username.sql`: adds `username text unique` to `profiles`. Backfills existing rows from email prefix (lowercase, non-alphanumeric → underscore, collision suffix). Comment enforces PHI rule.
- Server (`server/index.js`): four new endpoints — `GET /api/username/check?username=` (public availability check), `PATCH /api/username` (user sets own username, `x-user-id` header), `GET /api/admin/users` (admin-only full identity mapping: name, email, username, public_id, role), `PATCH /api/admin/users/:id/username` (admin override any user's username).
- `ProfilePage.tsx`: new Username field in Personal Information section — debounced availability check (400 ms), inline status indicator (available/taken/invalid/checking/saved), dedicated "Save Username" button that calls `PATCH /api/username`. Username auto-loaded from profile on mount.
- `Admin.tsx` (Organizations tab): new "User Identity Mapping" collapsible panel — shows all users with name, email, username, public_id, role. Admin can override any user's username inline. Labelled "admin-only" with a warning never to share with employers.

### Phase 4: De-identified Employer View (Feature 16 — Complete)

- Server (`server/index.js`): `GET /api/employer/:orgSlug` — auth-gated (org admin or app admin via `x-user-id` header). Returns `{ org, members }` with only `username`, `public_id`, `team`, `role`, `joined_at`, `bhas_pct`, `result_count` — no name, email, or raw lab values. BHAS % computed server-side by mirroring the `evaluateRules.ts` scoring logic (OPTIMAL_TAGS + IMPROVEMENT_TAGS sets, operator-aware rule evaluation). Null BHAS for users with no results.
- `src/pages/EmployerPage.tsx`: new page at `#/employer/:orgSlug`. Loads de-identified member data, shows: PHI notice banner, org name + member count + org-avg BHAS, per-team summary cards (colour-coded fire/water/wind/earth with avg BHAS), full member table sorted by BHAS score descending (username, public_id, team badge, BHAS badge colour-coded green/amber/red, result count, role, joined date).
- `src/App.tsx`: routes `#/employer/*` to EmployerPage, slug parsed from hash path.
- `src/pages/Admin.tsx` (Organizations tab): "Employer View" link button on each org card → navigates to `#/employer/:slug`.

### Phase 4: Auto Team Assignment (Feature 17 — Complete)

- Migration `db/migrations/20260314_dynamic_org_teams.sql`: new `org_teams` table (`id, org_id, name, created_at`, unique on `org_id+name`). Drops the hardcoded `fire|water|wind|earth` check constraint from `org_memberships.team`, making it free-form text.
- Server (`server/index.js`): `POST /api/admin/organizations/:id/assign-teams` — greedy-balanced assignment using the org's dynamic teams from `org_teams`. Returns `{ assigned, distribution }`. Returns `400 no_teams` if org has no teams defined. Existing assignments never overwritten.
- Server: four new CRUD endpoints for teams — `GET/POST /api/admin/organizations/:id/teams`, `PATCH/DELETE /api/admin/organizations/:id/teams/:teamId`. New `GET /api/admin/public-ids` returns all `BHI-XXXX-XXXX` tokens (no names/usernames) for the Add Member dropdown.
- Admin UI (`src/pages/Admin.tsx`): Teams management panel inside each org's expanded view — add, rename (inline), and delete teams. Add Member field changed from UUID text input to Public ID dropdown (`BHI-XXXX-XXXX` only). Member table username column removed — shows Public ID only. "Create Organization" form and "Delete" button hidden from `admin` role — visible to `super_admin` only. User Identity Mapping panel hidden by default behind a checkbox (persisted in localStorage) for PHI safety during demos. "Auto-assign Teams" button updated to use dynamic teams.

### PDF Extraction Accuracy Improvements (Feature 11 — ongoing fixes)

- **AI provider cascade stabilised**: Fixed Gemini key loop — non-quota errors no longer break out early; all keys are always tried. Updated OpenRouter model list (removed dead `llama-4-scout:free`, `qwen2.5-vl-72b`; added confirmed-working `llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`).
- **Groq JSON parse fix**: Groq prefixes responses with prose ("Here is the extracted data..."). `parseAIResponse()` now extracts the first `{...}` or `[...]` block from any surrounding text. Prompt updated with "Return ONLY raw JSON" instruction.
- **Value truncation fix**: Changed AI schema field from `value` (number) to `value_str` (string) — prevents LLM rounding/digit-dropping (`4.31→4.3`, `1.59→1.5`, `390→39`, `764→76`). Server normalises `value_str` → numeric `value` via `parseFloat`.
- **`<`/`>` qualifier handling**: `<8.4` and `<1.0` results no longer save as `0`. `parseAIResponse()` strips qualifier before parsing; `value_str` preserved in response. Frontend `ExtractedRow` interface now carries `value_str`; review table shows `<`/`>` prefix badge next to editable value.
- **Concatenated-column prompt fix**: pdf-parse produces columns with no whitespace separators (e.g. `82.056.108/18/2021`). Prompt now explains this layout with concrete examples from the actual Labcorp report format, showing how to split current result from previous result and from unit string.
- **Zero-value rows included**: Added explicit rule and examples (`Immature Granulocytes = 0`, `Immature Grans (Abs) = 0.0`) — AI was omitting rows with zero values.
- **Unit-boundary truncation fix**: Added rule and example (`0.34mg/L → value_str="0.34"`) — AI was reading `0.34` as `0.3` when the unit started with a letter that followed a digit with no space.
- **PHI**: Removed `docs/Damon DiLorenzo Labs.pdf` from git tracking; added to `.gitignore` — patient lab PDFs must never be committed.
- **Debug endpoint**: `POST /api/dev/extract-pdf-text` (dev-only, `ENABLE_DEV_ENDPOINT=true`) returns raw pdf-parse text for verifying OCR accuracy before AI processing.

### Phase 4: Team Scoring Display (Feature 18 — Complete)

- Server (`server/index.js`): `GET /api/employer/:orgSlug` now fetches the org's dynamic teams from `org_teams` and returns a `team_breakdown` array — each entry has `team`, `member_count`, `avg_bhas_pct`, and `optimal_pct` (% of members at 100% BHAS). Breakdown is sorted by avg BHAS descending. Handles teams from both `org_teams` table and any free-form values already in `org_memberships.team`.
- `src/pages/EmployerPage.tsx`: removed hardcoded `TEAM_COLORS` (fire/water/wind/earth). Per-team summary cards now sourced from `team_breakdown` in the API response. Team colours cycle through an 8-colour palette keyed by position — no reliance on team names. Cards show avg BHAS % and "% at optimal" sub-line. Member table team badges also use the cycling palette. Removed `textTransform: capitalize` from team name display (names are now arbitrary strings).
- `src/pages/Admin.tsx` (Organizations tab): "Team Score Summary" panel added inside each expanded org — read-only ranked table (Rank, Team, Members, Avg BHAS colour-coded green/amber/red, % at Optimal). Loaded from the employer endpoint on org expand and refreshed after Auto-assign Teams. No migration required.

## 2026-02-07 — dev

## 2026-02-06 — dev
- Frontend: Admin UI updates — added tag checklist when editing Categories; tag↔category mappings are persisted server-side and reflected in UI.
- Frontend: Applied case-insensitive alphabetical ordering across most Admin list and card views when no explicit `sortColumn` is active (Resources, Categories, Tags, Resource Types, Lab Markers, Health Goals, Criteria).
- Frontend: Tightened vertical spacing on Categories checkbox lists and category cards; category pickers now prepend newly-selected items to the selected list.
- Bugfix: Fixed Health Goals runtime crash related to tag rendering on goal cards.

- Frontend: Added a user-facing **Categories** page (`#/categories`) to browse health categories and jump to the Library filtered by category.
- Docs: Updated `README.md`, `docs/USER_GUIDE.md`, and `ui_copy_plain.md` to reflect the Library rename and new Categories page.
