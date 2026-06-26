# CHANGELOG

## 2026-06-25 — feat: F89 Quick Metrics Panel, F90 Lab Sets, F91 Coverage Audit (session 26)

### F89 — Core metric quick-entry panel on Dashboard
- New `src/components/QuickMetricsPanel.tsx` — collapsible panel (starts collapsed) on Dashboard below NHLS score panel. Inputs for all 8 NHLS scored metrics + waist/height with unit toggles + ACP checkbox. Lab Set dropdown. Saves via `addResult()` → clears score cache → fires trigger messages popup. Profile fields (waist, height, ACP) saved to Supabase REST on save.
- `src/pages/Dashboard.tsx` — imports and renders `QuickMetricsPanel`.

### F90 — Lab Sets (initial + follow-up timeframes)
- **Migration:** `db/migrations/20260625_create_lab_sets.sql` — new `lab_sets` table (label, sort_order, is_initial), RLS, seeds Initial/3Mo/6Mo defaults. Adds `lab_set_id UUID` FK to `user_lab_results`. **Run in Supabase.**
- **Server:** 5 new endpoints — `GET /api/lab-sets`, `GET/POST/PATCH/DELETE /api/admin/lab-sets/:id`.
- **Admin UI:** "Lab Sets" tab in Admin (📋). Inline edit, sort arrows, "Set initial" radio, delete with guard.
- **User-facing:** Lab Set dropdown in QuickMetricsPanel and LabsPage manual entry form. `addResult()` now accepts and persists `lab_set_id`.
- **Comparison view:** `src/components/LabSetsComparison.tsx` — collapsible side-by-side table on Dashboard and Labs page. Hidden until user has data in ≥2 sets. Delta column vs. Initial set.
- `src/context/ResultsContext.tsx` — `UserLabResult` interface extended with `lab_set_id?: string | null`.

### F91 — Video coverage audit (investigation only, no UI)
- Queried all 8 NHLS markers against logic_rules + tags + resources.
- **Gaps found:** Fasting Glucose = 0 resources (tags: Prediabetic_Glucose, Low_Glucose). Hemoglobin A1c = 0 resources (no non-optimal tags in DB at all — rules missing). HDL = 1 resource only.
- Full findings reported to Eddie for Damon review.

## 2026-05-20 — known bug: hs-CRP duplicate marker rows break NHLS v2.3 scoring (fix queued)

### Problem
Three separate rows exist in `lab_markers` for the same marker:
- `hs-CRP` (id: `72644039-e3df-4edb-96e4-961bdc35dfe6`) — the canonical name
- `Hs CRP` (id: `cc758098-d765-4f4e-aa65-621d95b41ca6`) — duplicate
- `HS CRP` (id: `8739971d-1178-4116-8250-9e2e282bf3d4`) — duplicate

`bhasV2.ts` looks up `'hs-CRP'` by exact case-insensitive name match. Results saved under `Hs CRP` or `HS CRP` (common PDF extraction variants) never contribute to the NHLS v2.3 score — users get a lower score than they should.

### Fix needed (two parts)
1. **DB migration** — migrate all `user_lab_results` rows pointing to the duplicate marker IDs to the canonical `hs-CRP` id, then delete the duplicate `lab_markers` rows.
2. **Code** — normalize marker name lookup in `bhasV2.ts` `latest()` to strip hyphens/spaces so `'hs crp'` / `'hs-crp'` / `'hscrp'` all match, preventing recurrence for any marker.

### Files
- `db/migrations/` — new migration to merge duplicates
- `src/utils/bhasV2.ts` — harden `latest()` lookup

## 2026-05-24 — feat: Lab marker aliases (F87, session 24)

### `db/migrations/20260524_create_lab_marker_aliases.sql` (new — run in Supabase)
- New `lab_marker_aliases` table: `(id, alias TEXT UNIQUE, marker_id UUID → lab_markers, created_at)`.
- ON DELETE CASCADE — deleting a marker also deletes its aliases.
- Index on `marker_id` for fast per-marker lookups.

### `server/index.js` — 4 new endpoints
- `GET  /api/admin/lab-markers/aliases-all` — returns all aliases; used by LabsPage to build client-side alias map on load.
- `GET  /api/admin/lab-markers/:id/aliases` — returns aliases for one marker; used by Admin edit modal.
- `POST /api/admin/lab-markers/:id/aliases` — adds an alias (idempotent via `ON CONFLICT DO NOTHING`).
- `DELETE /api/admin/lab-markers/aliases/:aliasId` — removes one alias by UUID.

### `src/pages/LabsPage.tsx`
- Fetches all aliases in `fetchMarkers()` alongside markers; builds `aliasMapRef` (alias.toLowerCase() → marker_id).
- PDF auto-match (`findBestMatch`) now falls back to alias map if fuzzy match misses — result lands under canonical name.
- `ExtractedRow` gains `autoMatchedMarkerId` and `saveAlias` fields.
- "Remember — save as alias" checkbox appears below the Matched Marker dropdown when user manually overrides the auto-match. On save, writes the alias to DB and updates `aliasMapRef` in memory.

### `src/pages/Admin.tsx`
- Marker edit modal loads aliases async when opened (non-blocking).
- New "Aliases" section (between Category and Scoring Rules): shows alias pills with × delete buttons; inline input + Add button (also supports Enter key). Writes/deletes immediately via API — no need to click the main Save button.

## 2026-05-24 — feat: Deduplicate lab_markers table (session 24)

### `db/migrations/20260524_merge_duplicate_markers.sql` (new — run in Supabase)
- Merges 9 duplicate marker groups: Triglycerides, Vitamin B12, Vitamin D, Fasting Glucose,
  Fasting Insulin, HDL, Hemoglobin A1c, LDL, Total Cholesterol.
- For each group: re-points `user_lab_results.marker_name` to the canonical name, deletes
  `logic_rules` and `lab_markers` rows for duplicates.
- Idempotent — safe to re-run.

### `db/migrations/20260524_add_marker_category_to_lab_markers.sql` (F86 — bug fix)
- Fixed backfill: was `'HbA1c'` (wrong), now `'Hemoglobin A1c'` (canonical). The F86 migration
  ran before F84 renamed the DB row to `Hemoglobin A1c`, so the `nhls_score` category was
  never applied to the surviving canonical row. Fixed in both the migration source and in
  Step D of the new dedup migration.

### `src/utils/bhasV2.ts` — verified correct (no code change needed)
- `latest()` already uses `normalizeName()` (strips hyphens/spaces, lowercases) since session 23.
- All 8 canonical scoring marker names resolve correctly via normalization after DB cleanup.

## 2026-05-24 — feat: NHLS v2.3 panel is now sole score on Dashboard (session 23)

### `src/pages/Dashboard.tsx`
- Removed Hormone Health v1 banner (tag-based % score) from Dashboard entirely.
- NHLS v2.3 derived-ratio panel is now the only score shown on the home page.
- Hormone health prompt ("If you want to track your hormone health...") retained with link to Labs page.
- Decided via Damon email 2026-05-20 — Option A: clean single score, hormone metrics accessible via Labs.

## 2026-05-20 — planned: Dashboard & scoring redesign per Damon feedback (session 23 — pending)

### Pending implementation — items confirmed by Damon via email 2026-05-20

**1. Dashboard order change**
- NHLS v2.3 score panel (the 7-metric derived-ratio score) to appear **first** after stat cards.
- "Hormone Health" v1 banner (NHLS % of tagged markers) to appear **second**.
- Change: swap JSX block order in `src/pages/Dashboard.tsx`.

**2. NHLS v2.3 score: add HbA1c as 8th scored metric**
- Add HbA1c (Hemoglobin A1c, `HbA1c`) as a new scored metric in `src/utils/bhasV2.ts`.
- Thresholds: Optimal < 5.7%, Improvement 5.7–6.4%, Out of Range ≥ 6.5%.
- Max score increases from 7.0 → 8.0. `interpretTotal` thresholds update accordingly.
- Update Dashboard subtitle from "7 metrics" → "8 metrics". Update `/` denominator display.

**3. NHLS v2.3: Advanced Care Plan — add mydirectives.com link**
- When ACP metric chip is shown on Dashboard, or in "missing inputs" hint, link to `www.mydirectives.com`.

**4. Marker category classification system**
- New DB migration: add `marker_category TEXT CHECK IN('nhls_score','hormone','additional') DEFAULT 'nhls_score'` to `lab_markers`.
- Admin Markers UI: category dropdown in edit modal so Damon can classify each marker.
- LabsPage "Your Markers": render three sections — **NHS Score Markers**, **Hormone Panel** (male/female), **Additional Markers** — driven by `marker_category` column instead of `applicable_sex` alone.

## 2026-05-18 — feat: Virtual Providers per-org — Admin org filter (session 22)

### `src/components/AdminProvidersTab.tsx`
- Added org filter dropdown ("All providers / Global only / [Org name]") above the provider list.
- Provider list filters in real-time by selected org without a server round-trip.
- Empty-state message distinguishes "no providers exist" from "no providers match filter".

## 2026-05-17 — feat: HOMA-IR reference link (session 21)

### `src/pages/Dashboard.tsx`
- "HOMA-IR" in the NHLS v2.3 score panel subtitle is now a dotted-underline link to the Wikipedia HOMA article, opening in a new tab.

## 2026-05-17 — feat: Hormone Panel separate section in Labs (session 21)

### `src/pages/LabsPage.tsx`
- "Your Markers" overview split into two sections: **Blood Work** (markers with `applicable_sex = 'both'` or null) and **Hormone Panel** (markers with `applicable_sex = 'male'` or `'female'`).
- Hormone Panel shows subtitle "Personal tracking only — not included in NHLS score".
- Hormone Panel section hidden until user has at least one logged hormone marker.
- Trend charts scoped to their section — blood work chart only opens in blood work section, hormone chart only in hormone section.

## 2026-05-17 — fix: Admin nav, spacing, stale score cache, sex banner flash (session 20)

### `src/pages/Admin.tsx`
- Tab nav replaced wrapping tile grid with horizontal scrolling tab bar. Single row, no wrap, active tab solid blue with white text, scrolls on narrow windows.

### `src/components/VirtualProviderCards.tsx`
- Added `marginBottom: 32` to create space between Virtual Providers and My Team card.

### `src/context/ResultsContext.tsx`
- `addResult()` now clears `nhl-bhas-v23-result` from sessionStorage so Dashboard recalculates NHLS score immediately after saving lab results, without needing a page refresh.

### `src/pages/LabsPage.tsx`
- Added `sexLoaded` flag to sex fetch — banner now waits for profile fetch to resolve before rendering, eliminating the red flash on page load for users who have sex set.

## 2026-05-17 — feat: YouTube Shorts / full video toggle (F82, session 20)

### `db/migrations/20260517_add_duration_type_to_resources.sql`
- Added `duration_type TEXT CHECK IN('short','long','both') DEFAULT 'both'` to `resources` table. Backfills all existing rows to `'both'`. **Run in Supabase Dashboard before deploying.**

### `server/index.js`
- `PATCH /api/admin/resources/:id` — now accepts and persists `duration_type` field.

### `src/utils/evaluateRules.ts`
- Added `duration_type?: 'short' | 'long' | 'both'` to `Resource` interface.

### `src/pages/Admin.tsx`
- Resource type definition extended with `duration_type`.
- Edit form state includes `duration_type` (defaults to `'both'` when opening).
- Duration Type dropdown added to left column of resource edit modal (options: Both / Short / Long).
- PATCH save body includes `duration_type`.

### `src/pages/Dashboard.tsx`
- Added `durationFilter` state (`'all' | 'short' | 'long'`, default `'all'`).
- All / Short / Long pill toggle added to the right of the "Personalized for You" heading.
- Filtering logic chains: category preferences → duration filter → fallback to full list.

> **Rebrand note:** This app was rebranded from BHI (Balanced Health Institute) to NHL (National Health League) on 2026-03-31. References to "BHI" in entries dated before this are historical and intentional.

## 2026-05-14 — fix: PDF matching, Labs OOR display, postJSON timeout (session 19)

### `server/index.js`
- `postJSON()` — added 30-second timeout (`req.setTimeout`) so Groq/OpenRouter hangs fail fast and fall through to the next provider instead of stalling indefinitely.

### `src/pages/LabsPage.tsx`
- **Fuzzy marker matching overhaul** — replaced bidirectional substring match with a phrase-based matcher (`containsAsPhrase`). Normalises names to lowercase words, requires the DB marker name to appear as a contiguous word sequence in the PDF name (or vice versa). When multiple DB markers match, picks the most specific (longest name). Fixes "HDL Cholesterol" incorrectly matching "Cholesterol" instead of "HDL", and similar collisions.
- **Matched Marker dropdown** — the "Matched Marker" column in the PDF review table is now a `<select>` dropdown listing all DB markers alphabetically, plus "— New marker —" at the top. Changing the selection auto-checks the row's Save checkbox. Allows users to override the automatic match without leaving the page.
- **OOR display fix** — `optimalRanges` map now built using `tags.scoring_tier = 'optimal'` from the DB (fetched alongside markers and rules) instead of the hardcoded `OPTIMAL_TAGS` set. Fixes markers like Fasting Glucose showing "Out of Range" when they were actually normal, caused by tags added/updated in the DB after the hardcoded set was last touched.

## 2026-05-14 — feat: Embed National Benchmarks inside NHLS score panel (session 19)

### `src/pages/Dashboard.tsx`
- Added `showBenchmarks` state (default `false`).
- Inside the NHLS v2.3 panel, added a collapsible "National Benchmarks" section after the metric chips and missing-inputs hint. Toggle button shows ▶/▼ indicator. When expanded, renders the same benchmark table (marker, your value, US average, vs. avg %, optimal range) scoped to markers the user has entered that have CDC/NHANES data.
- Removed the standalone "National Benchmarks" section (F19) that previously appeared as a separate block below Personalized Recommendations. All benchmark data is now accessible within the NHLS panel.

## 2026-05-13 — feat: Edit marker ranges via wizard UI (session 17)

### `server/index.js`
- `GET /api/admin/tags` — now includes `scoring_tier` in each tag object (was missing; needed to pre-populate tier labels when opening edit modal).
- New `PUT /api/admin/lab-markers/:id/rules` — replaces all `logic_rules` for a marker atomically: deletes existing rules, upserts tags with correct `scoring_tier`, inserts new rules. Body: `{ rules: [{ label, min_value, max_value, tag_name }] }`. Rows with empty min/max/tag are skipped.

### `src/pages/Admin.tsx`
- `tagsMeta` type updated to include `scoring_tier?: string | null`; `loadTags()` now stores it.
- New state: `markerEditRules` (same shape as `wizardRules`), `markerEditSaving`, `markerEditError`.
- Removed `min_normal`/`max_normal` from `markerEditForm` — ranges now live in `markerEditRules`.
- New helpers: `addMarkerEditRow(label)`, `removeMarkerEditRow(index)`, `updateMarkerEditRule(index, field, value)` — exact mirror of wizard equivalents.
- Both edit-button handlers (table view + card view) now initialize `markerEditRules` from existing `logicRules` for the marker, using `tagsMeta[tag].scoring_tier` to assign the correct tier label. Each tier defaults to one empty row if no rules exist for it.
- Marker edit modal replaced with 3-tier multi-range UI (Optimal / Improvement / Out of Range), each with "+ Add Range" / × buttons — identical to New Marker Wizard Step 2. Save PATCHes marker fields then PUTs the rules.

## 2026-05-11 — feat: Challenge UI (F66, session 15)

### `src/components/AdminChallengesTab.tsx` *(new)*
- Admin → Challenges tab: create, edit, delete, activate/deactivate challenges.
- Fields: name, slug (auto-filled from name), start/end dates, baseline date (month 0), midpoint date (month 6), active toggle.
- Org assignment panel per challenge: add org from dropdown, remove org with × button.
- Uses `x-backend-api-key` auth (matches all other admin tabs).

### `src/components/ChallengesSection.tsx` *(new)*
- User-facing section on Dashboard below MyTeamCard.
- Fetches `GET /api/challenges` (scoped to user's org via `x-user-id`).
- Hidden if user has no active challenges.
- Shows challenge name, date range, progress bar (elapsed vs total duration), baseline/midpoint key dates.

### `server/index.js`
- `GET /api/admin/challenges` — all challenges with enrolled `org_ids` array.
- `POST /api/admin/challenges` — create (requires name, slug, dates).
- `PATCH /api/admin/challenges/:id` — partial update.
- `DELETE /api/admin/challenges/:id` — delete (cascade removes challenge_orgs).
- `POST /api/admin/challenges/:id/orgs` — assign org to challenge.
- `DELETE /api/admin/challenges/:id/orgs/:orgId` — remove org from challenge.
- `GET /api/challenges` — user-facing; returns active challenges for user's org (via `x-user-id`).

### `src/pages/Admin.tsx`
- Added `'challenges'` to `VALID_TABS`.
- "Challenges" nav tile (⚡) added between Users and Lab Data.
- Renders `AdminChallengesTab` when active.

### `src/pages/Dashboard.tsx`
- Imports and renders `ChallengesSection` below `MyTeamCard`.

## 2026-05-11 — feat: Super Admin lab results viewer (F72, session 14)

### `src/components/AdminLabResultsTab.tsx` *(new)*
- Super admin only. Table showing latest lab result per user/marker across all users.
- Filters: org, marker name, date range, user ID.
- Values colour-coded green/amber/red vs normal range.
- Expand button (▶) on rows with multiple entries reveals full chronological history inline.
- HIPAA: only `username` + `public_id` exposed — no real names or emails.

### `server/index.js`
- `GET /api/admin/lab-results` — returns all `user_lab_results` joined with `profiles` (username + public_id only). Supports `org_id`, `marker_name`, `date_from`, `date_to`, `user_id`, `limit` query params. Also returns org list + active marker list for filter dropdowns.

### `src/pages/Admin.tsx`
- Added `'lab-results'` to `VALID_TABS`.
- "Lab Data" nav tile visible only to `super_admin`.
- Renders `AdminLabResultsTab` when active, gated behind `isSuperAdmin`.

---

## 2026-05-11 — feat: My Team Dashboard card (F71, session 13)

### `src/components/MyTeamCard.tsx` *(new)*
- User-facing team card shown on Dashboard when user has a team assignment.
- Shows: org name, team name, user's rank within their team (e.g. "#3 of 8"), and a full team leaderboard with medal icons, member counts, and colour-coded BHAS % bars.
- Hidden automatically if user is not in an org or has no team assigned.
- HIPAA: team leaderboard shows team names + aggregate averages only — no individual usernames, scores, or PHI.

### `server/index.js`
- `GET /api/my-team` — returns user's org, team, rank within team, and team leaderboard. All aggregate — no individual data returned.

### `src/pages/Dashboard.tsx`
- `MyTeamCard` rendered just below `StaleLabBanner`.

---

## 2026-05-11 — feat: Org invite code join (F70, session 13)

### `db/migrations/20260511_add_invite_code_to_organizations.sql` *(new)*
- Adds `invite_code TEXT UNIQUE` to `organizations` table; backfills codes for existing orgs via `md5(random() || id)`.

### `server/index.js`
- `POST /api/org/join` — user submits an invite code; if valid, creates `org_memberships` row using only `user_id` (no name/email). Returns `already_member: true` if already joined.
- `POST /api/admin/organizations/:id/regenerate-code` — generates a new 8-char alphanumeric invite code for the org.
- `GET /api/admin/organizations` — now includes `invite_code` in response.
- `POST /api/admin/organizations` — now auto-generates an `invite_code` on org creation.

### `src/pages/ProfilePage.tsx`
- New "Join an Organization" section: invite code input + Join button. Shows success, already-member, invalid, or error feedback. Fully anonymous — no name or email is sent.

### `src/pages/Admin.tsx`
- Admin → Organizations: each org card now shows its invite code in a monospace badge with a Regenerate button.

---

## 2026-05-11 — fix: PDF upload unknown markers registered as active when accepted; stale marker state on PDF upload (session 13)

### `src/pages/LabsPage.tsx`
- **Unknown marker registration:** When a user accepts (checks) an unrecognized marker during PDF review, it is now registered in `lab_markers` with `is_active: true` (was always `is_active: false`). Accepted markers will auto-match on future PDF uploads without admin action. Rejected markers remain `is_active: false`.
- **Stale marker state fix:** `handlePdfUpload` now re-fetches all markers from Supabase before running the PDF match pass. Previously, markers added in Admin after the Labs page loaded were invisible to the PDF matcher — they never matched and always appeared as "New — not in system". Re-fetch happens at the start of the upload handler; state is updated in place so the rest of the page reflects the fresh list.

---

## 2026-05-04 — feat: CPT codes on lab markers (F69, session 12)

### `db/migrations/20260504_add_cpt_code_to_lab_markers.sql` *(new)*
- Adds `cpt_code TEXT` column to `lab_markers` table.
- Pre-populates 8 known codes: Fasting Insulin (83525), Fasting Glucose (82947), Triglycerides (84478), HDL (83718), hs-CRP (86141), Vitamin D (82652), Vitamin B12 (82607), Advanced Care Planning (99497).
- **Action required:** Run in Supabase Dashboard → SQL Editor.

### `server/index.js`
- PATCH `/api/admin/lab-markers/:id` now accepts and persists `cpt_code` field.

### `src/pages/LabsPage.tsx`
- `LabMarker` interface extended with `cpt_code?: string`.
- `fetchMarkers` Supabase query now selects `cpt_code` column.
- Marker cards in "Your Markers" section show `CPT: XXXXX` label (muted, 10px) when a code is set.

### `src/pages/Admin.tsx`
- Admin → Markers **table view**: new "CPT Code" column.
- Admin → Markers **card view**: CPT code shown below Max value.
- Admin → Markers **edit modal**: CPT Code input field; included in PATCH body on save.

---

## 2026-05-03 — feat: Lab result trigger messages (F68, session 11)

### `src/utils/labTriggerMessages.ts` *(new)*
- Pure logic module — maps marker name + value (+ optional sex) to a `TriggerMessage` object with `level`, `headline`, `body`, `actions[]`, and optional `escalate` string.
- Covers 8 markers: Fasting Glucose, Fasting Insulin, hs-CRP, Vitamin D, Vitamin B12, Triglycerides, HDL (sex-specific threshold), and combined metabolic alert (HOMA-IR >2 + TG/HDL >3 + hs-CRP >3 simultaneously).
- Positive reinforcement message shown when all entered values are in optimal range.
- `getTriggerMessages(results, sex)` evaluates a batch of saved results and returns all applicable messages.

### `src/components/LabTriggerMessagesModal.tsx` *(new)*
- Modal component displaying trigger messages after save. Color-coded by tier (green/amber/red). Each card shows: tier badge (Optimal / Needs Attention / Out of Range), headline, body, action steps list, and provider escalation notice for danger-level markers.
- HIPAA footer: "These insights are shown only to you and are never shared with employers or third parties."
- Dismisses on "Got it" or overlay click.

### `src/pages/LabsPage.tsx`
- Imports `LabTriggerMessagesModal` and `getTriggerMessages`.
- Fetches user `sex` from profiles on mount (plain fetch + JWT) for sex-specific HDL threshold.
- `handleAddResult` — calls `getTriggerMessages` after saving; shows modal if any messages apply.
- `handleSaveExtracted` — same after PDF save; evaluates all saved rows as a batch (enables combined metabolic alert detection across multiple markers).

---

## 2026-05-03 — fix: Admin tab missing after logout/login as different user (session 10b)

### `src/context/AuthContext.tsx`
- **`login()` profile fetch rewritten to use plain `fetch`** — was using `supabase.from('profiles')` immediately after `signInWithPassword`, which deadlocked against the in-flight `SIGNED_IN` auth event. Profile returned `null`, role defaulted to `'user'`, Admin tab never appeared. Fixed by using `data.session.access_token` with a direct REST fetch to profiles — same pattern as `initializeAuth`. Repro: login as non-admin → logout → login as admin → Admin tab now appears without a page refresh.

---

## 2026-05-03 — fix: PDF extraction overhaul + profile load fix + Admin card toggle (session 10)

### `server/index.js`
- **Groq promoted to primary AI provider** — extraction order is now: Groq (llama-3.3-70b-versatile) → Gemini → OpenRouter. Previously Groq was last resort.
- **Active-marker filter removed from AI prompt** — prompt no longer restricts extraction to known active markers. AI now extracts ALL markers found in the PDF. Removed the DB fetch for active markers that was injected into the prompt.
- **`POST /api/admin/lab-markers`** — now accepts and persists `is_active` flag. Previously ignored it; defaults to `true` when not supplied.

### `src/pages/LabsPage.tsx`
- **Lab marker fetch now loads all markers** (active + inactive) with `is_active` column included — needed so PDF review can match against inactive markers and flag unknown ones.
- **PDF review table — smart default checkboxes:** Active matched markers → checked. Inactive matched markers → unchecked with "(inactive)" label. Unknown markers (not in system) → unchecked with amber "New — not in system" label.
- **Unchecked unknown markers auto-registered as inactive** — on Save, any unchecked row with no DB match is POST'd to `/api/admin/lab-markers` with `is_active: false`. It won't appear in Labs or affect scoring but will auto-match on future uploads.
- **Manual entry form** still filters to active-only markers (unchanged behavior).
- **Review panel subtitle** updated — no longer says "Gemini extracted".
- **`LabMarker` interface** — added `is_active?: boolean`.

### `src/pages/ProfilePage.tsx`
- **Profile load rewritten to use plain `fetch` + user JWT** — was using `supabase.from('profiles')` which can deadlock after window focus/session refresh events (known auth issue). Replaced with direct REST fetch using `getStoredJwt()`. This fixes the intermittent disappearing of profile fields (sex, age, etc.) without requiring a page reload.

### `src/pages/Admin.tsx` (Markers tab — card view)
- **Card view toggle fixed** — was calling `await load()` after toggling, causing a full data reload and visible screen flash. Now does the same optimistic local state update the table view already used: animates instantly, syncs server in background, reverts on failure.

---

## 2026-05-01 — feat: Lab marker active/inactive toggle + bug fixes (session 9)

### `db/migrations/20260501_add_is_active_to_lab_markers.sql` *(run in Supabase)*
- Added `is_active BOOLEAN NOT NULL DEFAULT true` column to `lab_markers` table
- All existing markers default to active — no data loss

### `server/index.js`
- `PATCH /api/admin/lab-markers/:id` — now accepts `is_active` in the request body
- `POST /api/extract-labs` — fetches active markers before AI extraction; injects list into AI prompt so only active markers are extracted from uploaded PDFs

### `src/pages/Admin.tsx` (Markers tab)
- Added animated green/grey slider toggle on every marker row (table view) and card (card view)
- Inactive markers dim to 45% opacity so they're visually distinct
- Added "Status" filter dropdown (All / Active only / Inactive only) to the filter bar
- Toggle updates local state immediately (no full page reload) and syncs to server in background; reverts on failure

### `src/pages/LabsPage.tsx`
- Manual lab entry now only fetches and displays active markers (`is_active = true`) — inactive markers are hidden from the quick-select grid

### `src/components/HealthReportModal.tsx`
- Fixed stale `/ 9.00` label — now correctly shows `/ 7.00` (BHAS v2.3 max score)

### `src/pages/ProfilePage.tsx`
- Fixed profile save failing for non-super-admin users — was using anon key as Bearer token; now uses `getStoredJwt()` (the logged-in user's JWT)
- Switched from PATCH to upsert (`POST` with `Prefer: resolution=merge-duplicates`) — creates profile row if it doesn't exist yet
- Includes all NOT NULL fields (`email`, `name`, `role`, `public_id`) in upsert so new users without a profile row can save successfully
- Imported `generatePublicId()` to generate a public ID when creating a new profile row
- **Verified working** — confirmed by Eddie 2026-05-01. Any user created outside the normal signup trigger (e.g. via Admin → Users tab or SQL) will not have a profile row until they visit Profile and hit Save once.

### `db/migrations/20260501_create_demo_users.sql` *(run in Supabase)*
- Creates 4 demo test accounts (one per role): `test.user@nhl-demo.com`, `test.admin@nhl-demo.com`, `test.superadmin@nhl-demo.com`, `test.broker@nhl-demo.com`
- All password: `Demo123` — email pre-confirmed, idempotent (safe to run multiple times)

---

## 2026-04-30 — fix: Live site bug fixes (logout, lab markers, saves, OpenRouter)

### `src/context/AuthContext.tsx`
- Logout now calls `localStorage.clear()` before `signOut` and uses `scope: 'global'` — prevents session restoration on refresh

### `src/pages/LabsPage.tsx`
- `fetchMarkers` effect now depends on `user?.id` — waits for auth before querying, eliminates "Loading markers..." race condition on first load
- `handleSaveExtracted` made async with `Promise.all()` — PDF results now save in parallel instead of hanging on sequential awaits

### `src/context/ResultsContext.tsx`
- Replaced all Supabase JS client writes (insert/delete) with direct REST `fetch` using `getStoredJwt()` — eliminates silent hangs caused by JS client session deadlock after `SIGNED_IN` event

### `server/index.js`
- Updated OpenRouter free model list — removed stale models (all 404/400). New list: `openai/gpt-oss-120b:free` (confirmed working, moved to top), Gemma 4, Llama 3.3, GLM 4.5 Air. Nemotron removed (returns empty response).

---

## 2026-04-29 — feat: F67 Health Assessment (lifestyle check-in + symptom tracker)

### `db/migrations/20260429_create_health_assessments.sql` *(run in Supabase)*
- New `health_assessments` table — 6 lifestyle Yes/No columns + 12 symptom boolean columns + metadata
- RLS: users read/write own rows only. Service role can read all (for future de-identified aggregate employer stats).
- HIPAA: individual rows never exposed to employers, brokers, or leagues.

### `src/components/HealthAssessmentModal.tsx` *(new)*
- Modal with two sections: Lifestyle (6 Yes/No questions) and Symptoms (12-item checklist)
- Loads most recent assessment on open; upserts on save (insert first time, update thereafter)
- Uses `supabase` client with RLS — no backend API needed
- Lifestyle question copy matches Damon's spec exactly
- Saves and closes automatically with "Saved!" confirmation

### `src/pages/Dashboard.tsx`
- Added "🩺 Health Check-In" button alongside existing "📄 Health Report" button
- Renders `HealthAssessmentModal` when clicked

---

## 2026-04-29 — docs: Capture Email Exchange 6 — new features spec'd, CLIENT_FEEDBACK updated, test checklist expanded

### Planning / Docs only — no code changes
- **CLIENT_FEEDBACK.md** — added Email Exchange 6 (CPT codes, lab trigger messages, org invite code, HSA form, monthly email). Resolved health assessment question wording. Resolved virtual provider org-specific decision. Updated Summary table.
- **docs/browser-test-checklist.html** — added Session 3 items 29–37 covering health assessment, trigger messages, CPT codes, and invite code join flow. Items marked pending until features are built.
- **IMPLEMENTATION_TRACKER.html** — updated last-updated line.

### Next features to build (priority order)
1. F67 Health Assessment — all questions resolved except cadence
2. Lab result trigger messages — fully spec'd
3. CPT codes on lab markers
4. Org join via invite code
5. F66 Challenge UI
6. Virtual providers — per-org lists

---

## 2026-04-29 — fix: User management bugs — role normalization, delete fallback, clipboard export

### `src/components/AdminUsersTab.tsx`
- **Role normalization** — `normalizeRole()` maps legacy `'user'` DB value → `'member'` in badge, dropdown, and selected value. Users created before the broker migration no longer show "user" pill.
- **Delete reloads from server** — replaced optimistic filter with `load()` after successful delete; confirms actual DB removal.
- **Error detail** — role change and delete errors now include the server `detail` field for easier diagnosis.

### `server/index.js`
- **GET /api/admin/users** — normalizes `role = 'user'` → `'member'` in response so frontend always sees consistent values.
- **DELETE /api/admin/users/:id** — falls back to direct `profiles` delete when `auth.admin.deleteUser` fails (handles seed/test users with no auth record). Logs error to server console before fallback.

### `docs/browser-test-checklist.html`
- **Export button** — replaced "Export Results as Text" (file download) with "Copy Results to Clipboard" (`navigator.clipboard.writeText`). Button shows "Copied!" for 2s on success.

---

## 2026-04-28 — feat: Admin UX overhaul, slug auto-fill, User management, back button, delete user

### `src/pages/Admin.tsx`
- **Option D icon+label nav** — replaced flat horizontal tab bar with icon+label tile grid that wraps naturally. 13 tabs, each with emoji icon. Eliminates overflow issue.
- **Slug auto-fill** — Org create form: typing the name now auto-populates the slug (lowercase, spaces→dashes). Slug field remains editable for override.
- **Users tab wired** — added `AdminUsersTab` import, `'users'` to tab type union, icon tile in nav, and render block.
- **initialTab prop** — Admin now accepts `initialTab?: string` and opens to that tab on mount. Used by "← Back to Organizations" deep-link from Employer View.
- **VALID_TABS const** — tab type union replaced with a runtime array + derived type to support `initialTab` validation.

### `src/components/AdminLeaguesTab.tsx`
- **Slug auto-fill** — League name input now drives slug field automatically. Slug label updated to "Slug (URL-safe, auto-filled)". Manual override still works.

### `src/components/AdminUsersTab.tsx` *(new file)*
- **Create user** — `POST /api/admin/users` form: email, password, role (Member/Broker/Admin), optional username.
- **Role change** — inline dropdown per row; PATCH fires immediately, badge updates in place.
- **Delete user** — Super Admin only: red "Delete" column with browser confirm dialog. Calls `DELETE /api/admin/users/:id`.
- **Search** — filters by email, username, or role.

### `src/pages/EmployerPage.tsx`
- **Back button** — "← Back to Organizations" button at top of page. Navigates to `admin/organizations` which deep-links to Admin → Organizations tab.

### `src/App.tsx`
- **Admin deep-link** — `currentPage.startsWith('admin/')` now renders Admin with `initialTab` extracted from path, e.g. `admin/organizations` → Organizations tab open.

### `server/index.js`
- **`POST /api/admin/users`** — creates user via `supabase.auth.admin.createUser()`, sets role and optional username on profile. Returns `{ id, email, role }`.
- **`PATCH /api/admin/users/:id/role`** — updates `profiles.role`. Valid values: `member`, `broker`, `admin`.
- **`DELETE /api/admin/users/:id`** — permanently deletes user from `auth.users` (cascades to profiles). Requires `{ confirm: "DELETE" }` in body. Both endpoints require `x-backend-api-key`.

### `src/styles.css`
- `.tabs` — added `flex-wrap: wrap` (retained as fallback; Admin no longer uses this class).
- `.tab` — reduced `padding: 24px → 14px`, `font-size: 15px → 13px`.

### `docs/`
- **`admin-nav-options.html`** — 4 interactive nav layout options (A–D). Option D chosen and implemented.
- **`browser-test-checklist.html`** — living test checklist; results persist in localStorage; Export to .txt; 21 items covering F62–F66 + admin improvements. All 21 passed 2026-04-28.

---

## 2026-04-26 — fix: Admin tabs auth, duplicate route handler, orgs response shape, leagues admin bypass

**What changed:**

### `server/index.js`
- **Duplicate `GET /api/admin/users` handler removed** — the role-filtered version (added for broker tab) was a dead second registration that Express never reached. Merged `?role=broker` filter logic into the original handler: when `?role` query param is present it returns `{ users: [...] }` with emails; without it returns the legacy plain array. Dead handler deleted.
- **`GET /api/leagues` admin bypass** — endpoint previously required `x-user-id` with no exception, blocking the Admin → Leagues tab from loading. Added: if a valid `x-backend-api-key` is present, bypass the user-id check. Admins also see inactive leagues; regular users still see active-only.

### `src/components/AdminBrokersTab.tsx`
- **Wrong auth header fixed** — was sending `Authorization: Bearer <jwt>` but the server's `requireAdmin()` checks for `x-backend-api-key`. Replaced with `VITE_BACKEND_API_KEY` via `x-backend-api-key` header.
- **Orgs response shape fixed** — `/api/admin/organizations` returns a plain array, not `{ organizations: [] }`. Added `Array.isArray()` guard.

### `src/components/AdminProvidersTab.tsx`
- Same auth header fix (`Authorization` → `x-backend-api-key`).
- Same orgs response shape fix.

### `src/components/AdminLeaguesTab.tsx`
- Same auth header fix (`Authorization` → `x-backend-api-key`).
- Same orgs response shape fix.
- Removed stale `import { getStoredJwt }` (no longer needed).
- Removed `'x-user-id': ''` from leagues fetch (now uses admin-key bypass).

---

## 2026-04-16 — feat: Hormone marker fixes, league leaderboard, broker role, virtual providers, challenges

**What changed:**

### Hormone marker corrections (`db/migrations/20260416_fix_hormone_markers.sql`)
- **Removed** incorrect logic rules for Free Testosterone (Male) and Total Testosterone (Male) — per Damon Email Exchange 4, these are track-only with no thresholds
- Cleared `min_normal`/`max_normal` on those two markers
- **Added PSA (Prostate-Specific Antigen)**: Normal 0–4 ng/mL, High > 4 ng/mL (tracked only, not scored)
- **Added female hormone markers** (all track-only, no thresholds): Free Testosterone (Female), Total Testosterone (Female), Estradiol (Female)
- **Action required:** Run `20260416_fix_hormone_markers.sql` in Supabase Dashboard → SQL Editor

### League / cross-org leaderboard
- New DB migration: `db/migrations/20260416_create_leagues.sql` — `leagues` + `league_orgs` tables with RLS
- New server endpoints: `GET /api/leagues`, `GET /api/league/:slug`, `POST /api/admin/leagues`, `POST/DELETE /api/admin/leagues/:id/orgs`
- New frontend pages: `src/pages/LeaguesListPage.tsx` (all active leagues), `src/pages/LeaguePage.tsx` (org-level aggregate standings)
- "Leagues" added to top nav in `Layout.tsx`
- PHI-safe: league leaderboard shows org names + avg BHAS score only — no individual data
- Admin can create leagues and assign orgs via new Admin → Leagues tab

### Broker role
- New DB migration: `db/migrations/20260416_add_broker_role.sql` — `broker_orgs` table + `profiles.role` extended to include `'broker'`
- New server endpoints: `GET /api/broker/orgs`, `POST/DELETE /api/admin/brokers/:id/orgs`, `GET /api/admin/brokers/:id/orgs`
- New Admin → Brokers tab: assign/remove orgs per broker user
- Brokers get multi-org aggregate access; cannot edit resources or affiliate links

### Virtual provider links
- New DB migration: `db/migrations/20260416_create_virtual_providers.sql` — `virtual_providers` table with RLS
- New server endpoints: `GET /api/providers`, `POST/PATCH/DELETE /api/admin/providers`, `GET /api/admin/providers`
- New member-facing component: `src/components/VirtualProviderCards.tsx` — expandable provider cards on Dashboard
- New Admin → Providers tab: create, edit, deactivate, delete providers; global or org-scoped
- **Action required:** Run `20260416_create_virtual_providers.sql` in Supabase Dashboard

### Challenges (DB only — UI pending health assessment answers)
- New DB migration: `db/migrations/20260416_create_challenges.sql` — `challenges` + `challenge_orgs` tables with RLS
- 9-month duration, 0 + 6-month lab cadence design in schema; UI deferred until health assessment Qs answered
- **Action required:** Run `20260416_create_challenges.sql` in Supabase Dashboard

---

## 2026-04-12 — feat: Male hormone markers (tracked only, not scored)

**What changed:**

### Male hormone markers (`db/migrations/20260412_add_male_hormone_markers.sql`)
- Added 3 new lab markers: **Free Testosterone (Male)** (pg/mL), **Total Testosterone (Male)** (ng/dL), **Estrogen (Male)** (pg/mL)
- Per Damon's spec (CLIENT_FEEDBACK.md Email Exchange 2):
  - Free T: optimal ≥ 100 pg/mL; normal range 100–300; low < 100
  - Total T: low if < 500 ng/dL (clinical reflex to Free T); normal 500–1000
  - Estrogen (male): optimal 25–35 pg/mL; low < 25; high > 35
- Tags created per marker (Low/Normal/High). Display-only: Low/High tags set to `scoring_tier = 'out_of_range'`; Normal tags set to `NULL` (no scoring tier)
- Tags mapped to **Hormone Health** category
- **Not scored** — these markers must NOT appear in BHAS v2.3 scoring. No optimal/improvement tiers assigned
- HIPAA: must never appear in employer views, broker views, or any export
- Female hormone thresholds still awaiting Damon's answer — not built yet
- **Action required:** Run `20260412_add_male_hormone_markers.sql` in Supabase Dashboard → SQL Editor

---

## 2026-04-07 — feat: BHAS v2.3 spec update + Supplements tab + auth deadlock fix + Lab filter UX

**What changed:**

### BHAS v2.3 scoring update (`src/utils/bhasV2.ts`, `src/utils/evaluateRules.ts`)
- Max score 9.0 → **7.0** (per Damon spec)
- **VO2 Max Percentile** and **Grip Ratio** removed from scored metrics — now tracked as biometrics only (`biometrics` field on result)
- HOMA-IR thresholds updated: Optimal <2.0, Improvement 2.0–3.0, Out of Range ≥3.0 (was 1.5/2.5)
- Score interpretation bands updated: Optimal ≥6.0, Healthy ≥5.0, Needs Improvement ≥4.0, High Risk <4.0
- Tie-breaker #2 changed from Grip Ratio → Grip Strength; #3 = acute visits; #4 = hs-CRP
- `Optimal_Grip`, `Excellent_VO2`, `Low_Normal_Grip`, `Average_VO2` removed from hardcoded scoring sets in `evaluateRules.ts`
- Dashboard UI updated: `/ 9.0` → `/ 7.0`, `of 9` → `of 7`, description updated, sessionStorage cache key bumped to `nhl-bhas-v23-result`
- DB migration: `20260407_bhas_v23_homa_ir_thresholds.sql` — updates Fasting Insulin logic rules in Supabase

### Supplements nav dropdown (`src/components/Layout.tsx`)
- "25% Off Supplements" dropdown added to top nav, right of existing nav items
- Two external links: Fullscript + Biote (both open in new tab)
- Closes on outside click; theme-aware hover states

### Auth deadlock fix (`src/context/AuthContext.tsx`, `src/lib/supabase.ts`)
- Removed `supabase.auth.getSession()` from `AuthContext` mount `useEffect` — was deadlocking the Supabase JS auth client when called concurrently with a `SIGNED_IN` event
- Replaced with: read JWT from localStorage via `getStoredJwt()`, decode user id/email from JWT payload, call `supabase.auth.setSession()` to hydrate the client's internal session, fetch profile via plain `fetch` with `Authorization: Bearer`
- Added `getStoredSession()` helper to `supabase.ts` (returns both `access_token` + `refresh_token`)
- Fixes: "Log New Result" not appearing on first click, Save Result silently failing (RLS was rejecting unauthenticated inserts), any auth-gated UI requiring a refresh to work

### Lab Results filter UX (`src/pages/LabsPage.tsx`)
- "Show all" button appears inline next to "History: X" heading when a marker filter is active
- Clicking clears the filter; original click-to-toggle on marker chips unchanged

---

## 2026-04-07 — fix: Affiliate product display — auth deadlock on navigation

**What changed:**
- `src/lib/supabase.ts` — added `getStoredJwt()` — reads JWT directly from localStorage without calling `supabase.auth.getSession()`. Removed `getSession()` call from `visibilitychange` handler (was deadlocking the Supabase JS auth client when tabs regained focus).
- `src/components/AffiliateProductsTab.tsx` — replaced Supabase JS client reads with plain `fetch` + `getStoredJwt()`. Fixes products disappearing after navigating away and back to Admin → Products tab.
- `src/components/AffiliateProductCards.tsx` — same fix. Fixes Recommended Products disappearing on Dashboard after clicking an affiliate link and returning.
- `db/migrations/20260407_fix_affiliate_rls.sql` — fixed RLS policies: split `affiliate_products_read` into `affiliate_products_read_active` (users see active only) and `affiliate_products_read_admin` (admins see all). Postgres `FOR ALL` policies do not override `FOR SELECT` — separate policies required.

**Root cause:** Supabase JS v2 auth client deadlocks when `getSession()` is called concurrently with an ongoing auth state change (e.g. `SIGNED_IN` event on remount). Plain `fetch` with a stored JWT bypasses this entirely.

---

## 2026-04-07 — feat: F24 + F25 — Affiliate Product Catalog + User Display

**What changed:**
- New DB migration `db/migrations/20260407_create_affiliate_products.sql` — creates `affiliate_products` table (id, name, description, image_url, affiliate_url, is_active) and `product_tags` join table (product_id, tag). RLS enabled: authenticated users read active products; admins have full CRUD.
- New `src/components/AffiliateProductsTab.tsx` — Admin Products tab:
  - Full CRUD: create, edit, deactivate/activate, delete
  - Tag picker with searchable dropdown using existing health tags (from `allowedTags`)
  - Products with no tags show to all users; tagged products match on user result tags
  - Inline form with name, description, image URL, affiliate URL, active toggle
- New `src/components/AffiliateProductCards.tsx` — User-facing product recommendation cards:
  - Fetches active products + their tags from Supabase
  - Matches products whose tags overlap with `applicableTags` from EvaluationContext (tag-based only — no raw lab values)
  - Products with no tags show to all users with lab results
  - Card layout: image (if set), name, description, "Learn More" affiliate link (opens new tab)
  - Hidden entirely when user has no applicable tags
- `src/pages/Admin.tsx` — added "Products" tab button; renders `AffiliateProductsTab`
- `src/pages/Dashboard.tsx` — renders `AffiliateProductCards` above Quick Actions when user has applicable tags

**PHI compliance:** Product matching uses only tag names (e.g. `Normal_Glucose`) — never raw lab values, marker names, or user identity. Tags are de-identified health signals.

**Action required:** Run `db/migrations/20260407_create_affiliate_products.sql` in Supabase Dashboard → SQL Editor before testing.

---

## 2026-04-07 — feat: F22 — Individual User PDF Health Report

**What changed:**
- New `src/components/HealthReportModal.tsx` — modal + print-ready HTML health report generated via `window.open()`. No PDF library required; user saves via browser "Save as PDF".
  - **BHAS Score Summary** — BHAS v1 percentage + raw score/max; BHAS v2.3 total score + label (color-coded by tier)
  - **Per-Marker Breakdown (BHAS v1)** — table of each scored marker: value, status label (Optimal/Improvement/Out of Range), and numeric score (1.0/0.5/0.0)
  - **BHAS v2.3 Metric Breakdown** — derived ratio metrics (HOMA-IR, TG/HDL, Grip Ratio, WtHR, Insulin Units/kg, Vitamin D, B12, ACP, Insulin Penalty); shows derived value, status, and score per metric
  - **National Benchmarks** — all markers with CDC/NHANES data: user value vs. US average, directional arrow + %, optimal range badge
  - Modal is disabled/shows hint when user has no lab data
  - Print button inside the opened report window; disclaimer footer on every report
- `src/pages/Dashboard.tsx` — added "📄 Health Report" button to Quick Actions (shown only when user has results); fetches `public_id` from profiles for the report header; `showHealthReport` state controls modal

**PHI compliance:** Report is self-generated by the user for their own records. Not shared with employers or third parties. No PHI leaves the user's session.

**No DB migration required.**

**Files changed:** `src/components/HealthReportModal.tsx` (new), `src/pages/Dashboard.tsx`

---

## 2026-04-01 — feat: F30 — VO2 Max Calculator

**What changed:**
- New `src/utils/vo2calc.ts` — three estimation formulas + ACSM percentile lookup:
  - **Rockport 1-Mile Walk Test** (Kline et al. 1987) — most accurate without lab equipment; inputs: walk time, end HR, age, sex, weight
  - **Resting Heart Rate method** (Uth et al. 2004) — no-equipment quick estimate; inputs: age, resting HR
  - **Direct entry** — user enters a lab-measured VO2 Max ml/kg/min value
  - All three → `vo2ToPercentile()` converts ml/kg/min to age/sex-adjusted percentile using ACSM norms (11th ed.) with linear interpolation across 6 age bands
  - `vo2PercentileLabel()` / `vo2PercentileColor()` — fitness category and color for UI
- New `src/components/Vo2CalcModal.tsx` — 3-tab modal with:
  - Loads user's profile (age, sex, weight_kg) from Supabase automatically
  - Per-method input forms with inline guidance
  - Results panel showing ml/kg/min + percentile tile + visual percentile bar + BHAS scoring tier interpretation
  - "Save to Lab Results" button — saves percentile as `VO2 Max Percentile` marker via `addResult()`
- `src/pages/LabsPage.tsx` — added "VO2 Max Calculator" button alongside existing "Log New Result" and "Upload Lab PDF" buttons

**No DB migration required** — saves to existing `VO2 Max Percentile` lab marker.

---

## 2026-04-01 — feat: F21 — Insurance Negotiation Reports (4 variants)

**What changed:**
- New `src/components/InsuranceReportModal.tsx` — full-featured modal with 4 report format tabs:
  - **Org Summary** — KPI tiles (total members, avg BHAS %, % at optimal), score distribution table, per-metric % at optimal table (sorted best to worst, color-coded)
  - **Risk Profile** — risk tier breakdown (Optimal → High Risk mapped to insurance risk language: Low Risk → High Risk), elevated/at-risk callout box, 12-week trend narrative (auto-generated plain-English summary), top 3 / bottom 3 metric highlights
  - **CSV Export** — downloads a structured aggregate CSV: KPIs, score distribution, risk tier breakdown, per-metric %; no individual member data or PHI
  - **Print / PDF** — opens a clean print-ready page in a new tab (metric bars rendered as HTML elements, all data in tables); user can use browser "Save as PDF"
- `src/pages/EmployerPage.tsx` — added "Generate Insurance Report" button to the Analytics tab header; `InsuranceReportModal` imported and wired to button state

**PHI compliance:** All report variants contain only aggregate, de-identified org statistics. No individual names, public IDs, or lab values are included.

**No DB migration required.**

---

## 2026-04-01 — chore: Dev tooling — context-mode MCP + nhl-app MCP server

**context-mode** installed globally (`npm install -g context-mode`) and registered with Claude Code via `claude mcp add --scope user`. Sandboxes tool output to reduce context bloat across all projects.

**nhl-app MCP server** built at `server/mcp/index.js` with 5 tools that give Claude live access to project state without reading large files each session:
- `get_implementation_status` — reads IMPLEMENTATION_TRACKER.html
- `get_migration_history` — lists db/migrations/
- `get_db_schema` — live Supabase table/column query
- `get_marker_list` — live lab_markers table query
- `get_bhas_scoring_rules` — live logic_rules + tags query

**Note:** `server/mcp/` is dev tooling only — delete before client handoff.

**MCP install method documented** in `~/.claude/CLAUDE.md` for all future projects.

---

## 2026-03-31 — feat: F19 — National Benchmarks (CDC/NHANES seed data)

**What changed:**
- New `src/utils/nationalBenchmarks.ts` — seed benchmark data for 15 markers (Fasting Glucose, Total/HDL/LDL Cholesterol, Triglycerides, BP Systolic/Diastolic, Vitamin D, B12, Fasting Insulin, hs-CRP, VO2 Max Percentile, Waist Circumference M/F, Grip Strength). Each entry has national mean, unit, optimal range, lowerIsBetter flag, and source citation.
- `src/pages/Dashboard.tsx` — new "National Benchmarks" section rendered below the BHAS v2.3 panel when the user has any matching markers. Table shows: marker name, user's latest value, US national average, % above/below with directional arrow (green = at or better than average, red = below), optimal range badge (green = optimal, red = below optimal). Source footnote in table footer; per-row source on tooltip.
- Section is hidden entirely when zero of the user's markers have benchmark data (graceful fallback).

**No DB migration required** — benchmarks are seeded in code, not the database.

**Files changed:** `src/utils/nationalBenchmarks.ts` (new), `src/pages/Dashboard.tsx`

---

## 2026-03-31 — feat: F51 — 1-year lab data retention policy (pg_cron)

**What changed:**
- New migration `db/migrations/20260331_lab_data_retention_1yr.sql` — enables `pg_cron` extension and schedules a nightly job (`nhl-lab-retention-1yr`) at 02:00 UTC that deletes `user_lab_results` rows where `date < CURRENT_DATE - INTERVAL '1 year'`. Script is idempotent (unschedules existing job before re-creating).

**⚠️ Action required:**
1. Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable
2. Run `20260331_lab_data_retention_1yr.sql` in Supabase Dashboard → SQL Editor
3. Verify output shows the job row in `cron.job`

**Files changed:** `db/migrations/20260331_lab_data_retention_1yr.sql` (new)

---

## 2026-03-31 — chore: F53 — Provider verification review (confirmed complete)

**Reviewed:** The "▸ Add Provider Verification (optional)" section on LabsPage is complete and working end-to-end. All fields (name, credential, NPI, date, typed attestation) collect and persist correctly. Results table shows Provider/PDF/Self badges with tooltip. No code changes required.

---

## 2026-03-31 — feat: F50 — Rebrand BHI → NHL (National Health League)

**What changed:**
- Nav logo, Login page, Onboarding, PublicProfilePage: "BHI" / "Balanced Health Institute" → "NHL" / "National Health League"
- `src/utils/publicId.ts`: `generatePublicId()` now returns `NHL-XXXX-XXXX`
- `localStorage`/`sessionStorage` keys: `bhi-*` → `nhl-*` across all files; backwards-compat shims added for existing users
- CSV export filenames: `bhi-members-*` / `bhi-leaderboard-*` → `nhl-*`
- `server/index.js`: OpenRouter HTTP-Referer updated to `national-health-league.com`
- `src/lib/supabase.ts`: `x-client-info` header updated to `nhl-app`
- `Admin.tsx`: Public ID search placeholder updated to `NHL-…`
- DB migration created: `db/migrations/20260331_rebrand_public_ids_bhi_to_nhl.sql` — updates existing `profiles.public_id` from `BHI-` to `NHL-` prefix
- BHAS score name intentionally unchanged (product name, confirmed by client)
- Historical docs left intact; rebrand note added to top of CHANGELOG and IMPLEMENTATION_TRACKER

**⚠️ Action required:** Run `20260331_rebrand_public_ids_bhi_to_nhl.sql` in Supabase Dashboard → SQL Editor

**Files changed:** `src/components/Layout.tsx`, `src/pages/LoginPage.tsx`, `src/pages/Onboarding.tsx`, `src/pages/PublicProfilePage.tsx`, `src/utils/publicId.ts`, `src/context/ThemeContext.tsx`, `src/context/ResultsContext.tsx`, `src/context/AuthContext.tsx`, `src/App.tsx`, `src/pages/ResourcesPage.tsx`, `src/pages/CategoriesPage.tsx`, `src/pages/Dashboard.tsx`, `src/pages/EmployerPage.tsx`, `src/pages/LeaderboardPage.tsx`, `src/pages/Admin.tsx`, `src/lib/supabase.ts`, `server/index.js`

---

## 2026-03-31 — test: F54 — Add Category verified end-to-end

**Verified:** New category creates successfully, appears immediately in the list, and shows as a filter on the Library page. Required fix F58 (categories not loading on Resources tab) before this could pass.

---

## 2026-03-31 — feat: F57/F58 — resources alphabetical order + Admin Add Category list

**F57 — Resources sorted A–Z by title**
- `src/pages/ResourcesPage.tsx`: secondary sort by `title` added to `prioritized` — resources matching user tags still appear first, then A–Z within each tier.

**F58 — Admin Add Category modal shows full list**
- `src/pages/Admin.tsx`: root cause was `loadCategories()` only firing on the Categories tab switch, leaving the list empty on the Resources tab. Fixed by calling `loadCategories()` inside `load()` so it runs whenever the Resources tab loads. Also added `.sort()` to the modal list so categories appear A–Z.

**Files changed:** `src/pages/ResourcesPage.tsx`, `src/pages/Admin.tsx`

---

## 2026-03-31 — feat: F56 — sort all dropdown filter options alphabetically

**What changed:** All dropdown filter options now appear in alphabetical order (case-insensitive).
- `src/pages/ResourcesPage.tsx`: `.sort()` added to `uniqueTypes`, `uniqueTags`, and `uniqueCategories` derivations (lines 207–209).
- `src/pages/Admin.tsx`: resource type selector in the resource edit form now sorts before rendering. All other Admin dynamic dropdowns were already sorted.

**Files changed:** `src/pages/ResourcesPage.tsx`, `src/pages/Admin.tsx`

---

## 2026-03-31 — chore: Claude Code dev tooling setup

**What changed:** No app code changed. Developer tooling configured for better token efficiency and cross-machine consistency.

- `C:\Users\eddie\.claude\CLAUDE.md` (global) — created with jCodemunch policy, communication prefs, and new-project checklist (applies to all projects on this machine)
- `CLAUDE.md` (project) — stripped down to enforcement-only (removed install instructions now covered globally)
- `.claude/skills/new-feature/SKILL.md` — end-to-end feature workflow skill
- `.claude/skills/db-migration/SKILL.md` — Supabase migration workflow + key DB facts
- `.claude/skills/supabase-rls/SKILL.md` — RLS policy patterns and PHI rules
- jCodemunch index confirmed: 267 symbols / 44 files, BHI App indexed 2026-03-24

---

## 2026-03-24 — feat: F49 — resource thumbnails (Supabase Storage)

**What changed:** Resource cards in the Library now display a thumbnail image. Admins can upload a thumbnail per resource from the Admin edit modal.

**Implementation:**
- **DB migration** `20260323_add_thumbnail_to_resources.sql` — adds `thumbnail_url TEXT` column to `resources` table (run in Supabase SQL Editor)
- **Supabase Storage** — `resource-thumbnails` public bucket with SELECT (public) + INSERT (authenticated) RLS policies
- **`server/index.js`** — `PATCH /api/admin/resources/:id` now accepts and persists `thumbnail_url`
- **`src/pages/Admin.tsx`** — resource edit modal shows upload widget (file picker → uploads to `resource-thumbnails` bucket via Supabase JS client → stores public URL); view panel shows thumbnail; supports remove
- **`src/pages/ResourcesPage.tsx`** — grid cards show full-width thumbnail above content; list cards show thumbnail as left-side image; detail modal shows thumbnail at top; graceful fallback when no thumbnail

**Constraints:** JPG/PNG/WebP/GIF, 5 MB max per image.

---

## 2026-03-23 — feat: F48 — multiple scoring ranges per tier in New Marker Wizard

**What changed:** Step 2 of the New Marker Wizard now renders each tier (Optimal / Improvement / Out of Range) as its own section. Each section has an **+ Add Range** button to add additional min/max/tag rows for that tier. A × button removes extra rows (disabled when only one row remains for that tier).

**Why:** Some lab markers are optimal in two separate ranges (e.g. 1–5 OR 10–15). The `logic_rules` table already supported multiple rows per tier — the Wizard UI was the only limitation.

**Files changed:**
- `src/pages/Admin.tsx` — added `addWizardRow()` / `removeWizardRow()` helpers; rewrote Step 2 to render per-tier sections; fixed Step 3 label color to use `r.label` instead of positional index; removed stale OPTIMAL_TAGS developer note from Step 3 (obsoleted by F47)

**No backend changes needed** — the server endpoint already accepts any number of rules.

---

## 2026-03-23 — fix: sex selector not persisting on ProfilePage remount

**Problem:** Navigating away from Profile and back caused the Male/Female button to appear unselected, even though the value was saved in the DB. The `useEffect` that loads profile data had `[user?.id]` as its dependency, so it didn't re-run on remount (user ID doesn't change on navigation).

**Fix:** Changed dependency array to `[]` so the profile fetch runs on every mount.

**File:** `src/pages/ProfilePage.tsx` — profile load `useEffect` dependency array

---

## 2026-03-23 — fix: Supabase API key rotation + Render env vars

- Rotated from legacy JWT-based anon/service role keys to new Supabase `sb_publishable_` / `sb_secret_` format
- Updated `VITE_SUPABASE_ANON_KEY` in `.env` and Netlify to new publishable key
- Updated `SUPABASE_SERVICE_ROLE` in `.env.server` and Render to new secret key
- Added all AI provider keys to Render env vars: `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`
- Cleaned up leaked secrets from `.env.example` and `.env` (were accidentally committed in ffddd94)

---

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
