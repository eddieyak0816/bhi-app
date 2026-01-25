DEVELOPER STATUS — Balanced Health Institute (short)

Date: 2026-01-25

Current state (high level)
- Local dev: frontend + backend run locally; admin UI (tags, criteria, markers, resources) is feature-complete for dev flows and manually tested.
- E2E: Playwright admin tests are passing locally after selector hardening and API fallbacks.
- CI: schema validator + assistant-preferences PR check added. Playwright E2E runs are still unstable on remote runners.

Green ✅
- Admin CRUD (dev-only): `src/pages/Admin.tsx` — tag-manager, criteria, inline marker creation.
- Server admin APIs: `server/index.js` — tags, logic_rules CRUD, delete-by-attrs fallback, audit logging.
- Playwright: `tests/admin.spec.ts` — extended coverage; local reliability fixed.

Pending / Blockers ⚠️
- Tenant RLS: scaffolded but not enabled in staging/production. Needs backfill and policy validation.
- Uploads: signed‑URL / hosted-media flow not implemented (backend + storage + preview UI).
- CI E2E reliability: split Playwright into a dedicated job and stabilise remote runs.

Next immediate actions (recommended)
1. Enable tenant RLS in a staging DB and run isolation tests (I can prepare migration + test script).
2. Implement a minimal signed‑URL upload endpoint + Admin upload UI + E2E test.
3. Split Playwright E2E into a separate CI job and add retry/backoff for flaky selectors.

If you want one quick command run now, tell me which single step: (a) reproduce the failing rule-save API call, or (b) prepare the RLS migration for staging.
