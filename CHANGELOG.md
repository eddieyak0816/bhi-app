# CHANGELOG

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

## 2026-03-13 — dev

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

**Planned additions to Feature 11 (next)**
- PDF duplicate detection: SHA-256 hash + accession number + collection date extracted by AI. New `lab_pdf_uploads` table stores these per user. Warns on re-upload before the review table is shown.
- New Marker Wizard in Admin: guided 3-step flow to create a marker + logic rules + tags in one transaction (eliminates the current fragmented 3-tab workflow).

## 2026-02-07 — dev

## 2026-02-06 — dev
- Frontend: Admin UI updates — added tag checklist when editing Categories; tag↔category mappings are persisted server-side and reflected in UI.
- Frontend: Applied case-insensitive alphabetical ordering across most Admin list and card views when no explicit `sortColumn` is active (Resources, Categories, Tags, Resource Types, Lab Markers, Health Goals, Criteria).
- Frontend: Tightened vertical spacing on Categories checkbox lists and category cards; category pickers now prepend newly-selected items to the selected list.
- Bugfix: Fixed Health Goals runtime crash related to tag rendering on goal cards.

- Frontend: Added a user-facing **Categories** page (`#/categories`) to browse health categories and jump to the Library filtered by category.
- Docs: Updated `README.md`, `docs/USER_GUIDE.md`, and `ui_copy_plain.md` to reflect the Library rename and new Categories page.
