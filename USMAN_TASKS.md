# Usman — Developer Tasks

Tracking doc for Usman's work on the BHI / National Health League app. Client is **Damon DiLorenzo** (Balanced Health Institute / National Health League). Eddie was the previous developer.

Source material for this doc: emails from Damon (Aug 2026), files from the `DAMON NEW FILES FOR USMAN` folder (now summarized below — folder can be deleted), and existing project docs (`CLIENT_FEEDBACK.md`, `DEVELOPER_STATUS.md`, `PROJECT_SCOPE.md`).

Last updated: 2026-08-18

---

## ✅ Done

- **Trademark fix — "NHL" branding replaced with "National Health League"** in:
  - `src/pages/LoginPage.tsx` — heading (stacked "National / Health League", removed duplicate subtitle line)
  - `src/components/Layout.tsx` — header logo
  - `src/pages/SignupPage.tsx` — "Join National Health League to get started"
  - `src/components/AffiliateProductCards.tsx` — commission disclosure text
  - `src/components/HealthReportModal.tsx` — PDF report title
  - `src/components/InsuranceReportModal.tsx` — report title, CSV header, footer text (4 spots)
  - **Not yet changed (needs Damon's scope confirmation first):**
    - `src/utils/publicId.ts` — the `NHL-XXXX-XXXX` public ID format (data format, not just text — needs a decision on whether existing user IDs get migrated)
    - "NHLS" — the score name itself, used in 40+ places across the app (Dashboard, LabsPage, EmployerPage, LeaguePage, LeaderboardPage, ProfilePage, Admin, ConsentPage, etc.) — need to ask Damon if trademark concern extends to this too
- **Mobile header fix** — added responsive hamburger menu in `src/components/Layout.tsx` (breakpoint 860px). Desktop nav unchanged; mobile shows hamburger icon that opens a vertical dropdown with all nav items, My Directives, and Supplements sub-dropdown. Fixed a bug where tapping the close (✕) icon reopened the menu (outside-click handler was fighting the toggle button).
- **Fixed broken CI workflow** — `.github/workflows/assistant-preferences-check.yml` had zero YAML indentation (invalid file, failing on every PR). Corrected indentation. *(Committed — confirm before removing from this list if not yet pushed.)*

## ✅ Fixed (moved from High priority bugs)

- [x] **Admin tab completely unusable (Damon's top priority)** — FIXED 2026-08-18.
  - **Symptom:** Every Admin tab (Resources, Categories, Tags, etc.) failed to load/save. Browser console showed: `Failed to load categories: 500 {"error":"db_error","detail":{"message":"Unregistered API key","hint":"Double check the provided API key as it is not registered for this project."}}`
  - **Root cause:** The backend server (Render, `bhi-app-backend`) had the correct env var *names* set (`BACKEND_API_KEY`, `SUPABASE_SERVICE_ROLE`, `VITE_SUPABASE_URL`) — so it wasn't a missing-secret problem. The actual *value* in `SUPABASE_SERVICE_ROLE` was wrong: it was set to Supabase's **new-format** secret key (`sb_secret_...`), but the backend code makes direct/raw REST calls to Supabase that require the **old legacy JWT-format** `service_role` key (starts with `eyJhbGci...`). Supabase rejected every request because of this format mismatch — not a permissions issue, not a per-tab issue, one shared broken key affecting everything at once.
  - **Fix applied:** In Supabase dashboard → Project Settings → API Keys → **"Legacy anon, service_role API keys"** tab → revealed and copied the legacy `service_role` key → pasted it into Render dashboard → `bhi-app-backend` → Environment → `SUPABASE_SERVICE_ROLE` value (replacing the `sb_secret_...` one) → clicked **"Save, rebuild, and deploy."**
  - **Verified:** Console now shows `[Admin] Successfully loaded categories`; confirmed can add/edit/delete categories, tags, resources.
  - **Note for future:** If this breaks again (e.g. after rotating Supabase keys), always use the **legacy JWT `service_role` key**, not the newer `sb_secret_...` format, until the backend code (`server/index.js`) is updated to support the new key format.
  - **Not yet checked:** whether the same new-vs-legacy key mismatch also affects `VITE_SUPABASE_URL`/anon key usage on the frontend side (Netlify env vars) — frontend reads/writes appear to work fine so likely not an issue, but worth a quick sanity check if any other Supabase-related errors show up.

## 🔴 High priority — bugs (confirmed, still open)

- [ ] **Provider link 404** — Damon added his own website as a provider link ("Balanced Health Institute" entry), tapped "Book/Connect →", got a Netlify "Page not found" 404. Have his screenshot as proof. Needs investigation into how provider URLs are saved/rendered (likely in Admin.tsx provider management + wherever the link is rendered, e.g. Dashboard "Virtual Providers" section). **Possibly related to the same key issue just fixed — retest first before assuming it's a separate bug.**
- [ ] **Image upload broken** — Damon reports image uploads fail in Admin → Resources and Admin → Categories. **Also possibly related to the same key issue just fixed — retest first before assuming it's a separate bug.**

## 🟡 Medium priority — new features (spec provided)

- [ ] **Hormone Labs category** — add as a main dashboard category, separate content for men and women.
- [ ] **Sex-based profile content** — Profile page: user selects Male/Female, app auto-assigns relevant hormone metrics/categories/content based on that.
- [ ] **Hormone lab ranges to add** (displayed only — explicitly must NOT affect the overall health/NHLS score):
  - **Male:** Free Testosterone >150 pg/mL, Total Testosterone >500 ng/dL, Estradiol 25–35 pg/mL. Additional labs to track: Hemoglobin, Hematocrit, PSA, TSH, Free T3, Free T4, TPO Antibodies.
  - **Female:** Free Testosterone 10–15 pg/mL, Total Testosterone 90–150 ng/dL, FSH 3.5–22 mIU/mL. Additional labs to track: TSH, Ferritin, TPO Antibodies, Free T3, Free T4.
- [ ] **More affiliate links in top nav** — currently only "25% Off Supplements" (Fullscript + Biote); Damon wants to add more.
- [ ] **Newsletter editing feature** — ability to create/edit newsletters inside the app. Damon sent 2 mockup designs (see Design reference below) — "Week 1: Vitamin D" style, one-topic-per-week format with sections: Why It Matters, Discussion Range table, 3 Action Steps, Supplement Spotlight, Lab Info (CPT code), QR codes to video/store.
- [ ] **Verify Health Check-in** — Damon says it used to stall on loading, "appears to be functioning now" — needs a confirm-and-close pass, not necessarily a fix.

## 🟢 Larger scope — needs discussion before starting

- [ ] **Visual redesign** — Damon wants a more "modern and colorful" look, referenced [fuzati.com](https://fuzati.com) as inspiration. Suggested either gold/maroon or red-white-blue color scheme (matches his newsletter mockups). This is a meaningful design project, not a quick tweak — needs scoping/estimate before starting.

## ❓ Needs clarification from Damon

- [ ] **Does the NHL→trademark fix also apply to "NHLS" (the score name)?** — separate from the plain "NHL" branding already fixed. Big scope difference (40+ locations) if yes.
- [ ] **Public ID format `NHL-XXXX-XXXX`** — change prefix going forward only, or migrate existing users' IDs too?
- [ ] All previously logged open questions in `CLIENT_FEEDBACK.md` (leaderboard ranking method, org hierarchy depth, Broker role permissions/CSV access, who manages provider links per org, Challenge duration/opt-in) — still unanswered as of last check.

## 📋 Older pending items (Eddie's, pre-existing)

Not repeated here in full — see `DEVELOPER_STATUS.md` → "Pending / Blockers" section for the complete list. Highlights worth knowing about since they likely connect to items above:
- Missing `categories` + `health_goals` DB migrations never run in production — **possibly the real root cause of the Admin tab bug (top priority item above)**, worth checking before assuming it's a new bug.
- RLS not enabled in production, no rate limiting, no input validation middleware, default session timeout — general security hardening backlog.
- Signed-URL media upload flow never built — **likely the same root cause as the image upload bug above.**
- Playwright CI E2E instability, code splitting/performance items — lower priority, not blocking.

## 🔧 Infra / access items (mostly resolved)

- [x] GitHub repo access (collaborator)
- [x] Supabase dashboard access
- [x] Netlify dashboard access
- [x] Render dashboard access
- [x] App login (self-signup on live app)
- [ ] Admin role for Usman's app account — needed to actually test/use the Admin CMS (do via Supabase, once provider-link/image-upload bugs are being investigated anyway)
- [ ] `DATABASE_URL` GitHub secret — confirmed it *is* set, but the CI schema-check still fails because GitHub Actions runners can't reach Supabase's IPv6-only **direct connection** string. Fix: swap the secret to Supabase's **Connection Pooling** (session/transaction pooler) string instead, which supports IPv4. (Supabase dashboard → Project Settings → Database → Connection Pooling)
- [x] Vercel — confirmed not a concern; Netlify is the real/only deployment target in use. The `deploy-vercel.yml` workflow can be left alone or disabled later, low priority.
- [ ] **Netlify auto-deploy investigation** — pushing to `main` didn't auto-trigger a fresh build (stale `dist/index.html` was being re-served; had to manually click "Publish" in Netlify). `dist/index.html` is force-committed to git despite `dist/` being in `.gitignore` — worth cleaning up and confirming Netlify's Build command/Publish directory settings are correct (`npm run build` / `dist`) so future pushes auto-deploy properly.

## Design reference (from Damon's newsletter mockups)

Two color directions supplied as PNGs (now deleted along with the source folder — describing here so the reference isn't lost):
- **Gold/maroon version:** cream background, maroon header bar, gold accents, shield+anchor+cross logo, tagline "Own Your Health™...Before It Owns You."
- **Red/white/blue version:** same layout, patriotic navy/red/white palette, "NATIONAL" in a red ribbon banner above the shield.
- Both: weekly single-topic format (started with Vitamin D), sections for discussion range table, 3 action steps, supplement spotlight with QR code to Fullscript store, lab CPT code info, QR to a short YouTube video.
