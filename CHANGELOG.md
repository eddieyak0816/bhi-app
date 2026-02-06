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

## 2026-02-07 — dev
- Frontend: Renamed "Resources" to **Library** in top nav and page header; search placeholder updated to "Search library...".
- Frontend: Added a user-facing **Categories** page (`#/categories`) to browse health categories and jump to the Library filtered by category.
- Docs: Updated `README.md`, `docs/USER_GUIDE.md`, and `ui_copy_plain.md` to reflect the Library rename and new Categories page.
