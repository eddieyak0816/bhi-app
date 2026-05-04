# Balanced Health Institute APP – Developer Requirements & Process Specification

This document outlines the functional requirements, workflows, and data processes for the
Balanced Health Institute mobile/web application. The platform securely collects verified
health metrics, protects HIPAA/PHI data, enables gamified corporate wellness analytics,
and automates HSA reimbursement documentation.

---

## 0. HIPAA Compliance Requirement

**All features in this application must be HIPAA compliant.** The platform collects, stores, and processes Protected Health Information (PHI) including lab results, biometric data, and health scores. Every developer and every feature must adhere to the following rules at all times:

### PHI Definition
PHI includes any individually identifiable health information: lab values, diagnoses, biometric measurements, health scores tied to a real identity, and any combination of data that could identify an individual's health status.

### Core Rules — Non-Negotiable
1. **Minimum necessary access** — Only collect and display the data required for the specific function. Never expose more PHI than needed.
2. **No PHI in employer/third-party views** — Employer pages, reports, analytics, and exports must never contain real names, email addresses, or individual lab values. Only de-identified identifiers (username, public_id), team assignments, and aggregate scores are permitted.
3. **No PHI in logs or error messages** — Never log lab values, user names, or health data to the console, server logs, or error tracking systems.
4. **No PHI in URLs** — Lab values, health scores, and user identifiers must never appear in URL query strings or hash fragments.
5. **Encryption in transit** — All data transmission must use HTTPS/TLS. No plain HTTP endpoints for any PHI.
6. **Access control** — All Supabase tables containing PHI must have Row Level Security (RLS) enabled. Users may only read/write their own records. Admins have elevated access only via server-side endpoints with authenticated service keys.
7. **Data minimization in exports** — CSV and PDF exports must be reviewed for PHI before adding new fields. Exports going to employers or insurers must be aggregate-only.
8. **Consent before sharing** — Public profile features require explicit user opt-in (`is_public` flag). Default is private.
9. **Retention limits** — Lab results older than 1 year are automatically purged (pg_cron job — migration `20260331_lab_data_retention_1yr.sql`).
10. **No third-party PHI leakage** — Do not send PHI to third-party analytics, advertising, or tracking services. AI/ML features (e.g., PDF extraction) must not retain PHI beyond the processing session.

### De-identification Standard
The app uses the HIPAA Safe Harbor method: data is de-identified by replacing name/email with a system-generated public_id token (`NHL-XXXX-XXXX`) and a user-chosen username. Neither field reveals real identity. Employer and public views use only these tokens.

### Developer Checklist for Every New Feature
Before marking any feature complete, verify:
- [ ] No real name or email is exposed in any new UI surface
- [ ] No raw lab values are exposed to any party other than the patient themselves
- [ ] Any new export or report contains only aggregate or de-identified data
- [ ] Any new Supabase table or column has appropriate RLS policies
- [ ] Any new API endpoint requires authentication and validates the requesting user's identity

---

## 1. Core Platform Goals

- Secure collection of laboratory and biometric health data
- HIPAA compliant storage and transmission — required, not optional
- Verified health metric scoring using Balanced Health metrics
- Corporate wellness gamification with team analytics
- Automated HSA reimbursement documentation
- De-identified population health analytics

---

## 2. User Types

### Public Individual Users (Free)
- Upload or connect lab data
- Track personal health metrics
- Join anonymous national comparisons
- Optional public profile (opt-in consent)

### Corporate Wellness Users
- Assigned to corporate portal
- De-identified in employer view
- Auto-assigned to teams: Fire, Water, Wind, Earth
- Participate in team scoring and analytics

---

## 3. Health Data Sources

- Direct lab integrations: Labcorp, Quest, Mako, Rhythm
- Provider-verified entries (NPI/license)
- AI-verified lab PDF upload *(Is this possible?)*
- Biometric verification by clinician/nurse/fitness professional
- Future: CGM device integrations, VO2 Max calculator

---

## 4. Data Verification Methods

### Lab Integration
- Secure API pull from certified labs

### Provider Verification
- Metric value entered
- Verifier name, credential, NPI/license
- Signature + date

### AI Document Verification *(Preferred method)*
- User uploads lab PDF
- AI extracts values
- Flags anomalies
- Sends for approval
- **Marker matching:** Only values whose marker name matches (or fuzzy-matches) a known lab marker in the database are imported. Unmatched markers are displayed in the review table with a warning flag. Admin can create missing markers via the New Marker Wizard before re-importing. Unknown markers are never silently discarded — user sees them and can choose to skip.
- Approved metrics stored

### Data Source Labelling
- Every lab result row is tagged with its entry method: **Self** (manual input), **PDF** (AI extraction), or **Provider** (provider-verified).
- The source badge is shown in the results table on the Labs page so users always know how each data point was entered.

---

## 5. Metrics Collected

- Cardiometabolic labs
- Vitamin D and B12
- Waist circumference
- VO2 Max (verified)
- Grip strength
- Advanced care planning status
- Insulin usage (Type 1)
- Acute care visits
- Future CGM metrics

---

## 6. Balanced Health Scoring

Each metric scored:
- **Optimal** = 1
- **Improvement range** = 0.5
- **Out of range** = 0

Total BHAS score calculated per user.

---

## 6b. BHAS v2.3 Scoring Specification

Source: `docs/APP integration Point system and Metrics.pdf`

### Participant Type Logic
- **Type 1 Diabetes = Yes:** exclude HOMA-IR scoring, include Insulin Units/kg scoring
- **Type 1 Diabetes = No:** include HOMA-IR scoring, exclude Insulin Units/kg scoring

### Required Inputs
| Input | Unit |
|---|---|
| Fasting Glucose | mg/dL |
| Fasting Insulin | µIU/mL |
| hs-CRP | mg/L |
| Triglycerides | mg/dL |
| HDL | mg/dL |
| Vitamin D 25-OH | ng/mL |
| Vitamin B12 | pg/mL |
| VO2 Max Percentile | 0–100 (age/sex adjusted) |
| Grip Strength | kg |
| Body Weight | kg |
| Height | cm |
| Waist Circumference | cm |
| Total Daily Insulin Units | units/day (Type 1 only) |
| Acute Care Visits | count, past 12 months (tie-breaker only) |
| Advanced Care Plan Status | Yes/No |
| Sex | Male/Female (for grip scoring) |
| Type 1 Diabetes | Yes/No |

### Derived Calculations
| Value | Formula |
|---|---|
| HOMA-IR | (Fasting Insulin × Fasting Glucose) / 405 |
| TG/HDL Ratio | Triglycerides / HDL |
| Grip Ratio | Grip Strength (kg) / Body Weight (kg) |
| Waist-to-Height Ratio (WtHR) | Waist (cm) / Height (cm) |
| Insulin Units/kg | Total Daily Insulin Units / Body Weight (kg) |

### Metric Scoring Rules (1 / 0.5 / 0)
| Metric | 1 | 0.5 | 0 |
|---|---|---|---|
| HOMA-IR (non-Type 1) | < 1.5 | 1.5–2.5 | ≥ 2.5 |
| hs-CRP | < 1.0 | 1.0–3.0 | > 3.0 |
| TG/HDL Ratio | < 2.0 | 2.0–3.0 | > 3.0 |
| Insulin Units/kg (Type 1) | < 0.6 | 0.6–0.8 | > 0.8 |
| Vitamin D (binary) | > 50 ng/mL | — | ≤ 50 |
| Vitamin B12 (binary) | > 750 pg/mL | — | ≤ 750 |
| VO2 Max Percentile | ≥ 60 | 40–59 | < 40 |
| Grip Ratio — Men | ≥ 0.60 | 0.50–0.59 | < 0.50 |
| Grip Ratio — Women | ≥ 0.45 | 0.35–0.44 | < 0.35 |
| WtHR | ≤ 0.50 | 0.51–0.56 | > 0.56 |
| Advanced Care Planning (binary) | Documented | — | Not documented |

### Total Score
- 9 scored categories per participant (max = 9.0)
- Non-Type 1: HOMA-IR + hs-CRP + TG/HDL + Vit D + B12 + VO2 + Grip Ratio + WtHR + ACP
- Type 1: Insulin Units/kg replaces HOMA-IR, all others same

### Score Interpretation
| Range | Label |
|---|---|
| 8.0–9.0 | Optimal |
| 6.0–7.5 | Healthy |
| 4.0–5.5 | Needs Improvement |
| 0–3.5 | High Risk |

### Tie-Breaker Ranking (when scores are equal)
1. Higher VO2 Max Percentile
2. Lower Waist-to-Height Ratio
3. Lower hs-CRP
4. Fewer Acute Care Visits (past 12 months)

### App Output Requirements (Section 8 of spec)
- Store raw input values with units and timestamps
- Calculate and store derived values (HOMA-IR, TG/HDL, Grip Ratio, WtHR, Insulin Units/kg)
- Assign and store per-metric points (0 / 0.5 / 1; Vit D / B12 / ACP are binary)
- User dashboard: raw values + points + BHAS total + category label
- Population analytics: averages, distributions, % meeting optimal per metric
- Leaderboards with tie-breaker logic
- CSV export for employer reporting (de-identified)

---

## 7. Corporate Gamification

Users auto-assigned to one of four permanent teams: **Fire, Water, Wind, Earth**

Teams display:
- Average score
- % optimal per metric
- Team ranking
- Improvement trends

---

## 8. Identity & Privacy

- Corporate users de-identified
- Unique usernames
- Admin-only identity mapping
- Employer cannot view PHI
- HIPAA compliant storage *(if needed — can we circumvent with a consent form?)*

---

## 9. HSA Reimbursement Automation *(charge fee for public access)*

If user metrics show non-optimal health:

1. Detect deficiency
2. Generate medical necessity document
3. Attach verified labs
4. Populate HSA form
5. Connect to HSA bank
6. Submit reimbursement

---

## 10. Data Update Frequency

- **Labs:** biannual or user-uploaded
- **Biometrics:** ongoing
- **Verified metrics:** biannual

---

## 11. Corporate Analytics

- Population averages
- % optimal metrics
- Team comparisons
- Risk distribution
- Insurance negotiation reports

---

## 12. Required Outputs

- User dashboard
- Metric scores
- Total BHAS
- Team ranking
- Corporate analytics dashboard
- Exportable reports

---

## 13. Implementation Status Review

> Last updated: 2026-04-01. Total: 50 built · 4 partial · 8 not built out of 62 items.
> Legend: ✅ Built | 🔶 Partial | ❌ Not built

### Section 1 – Core Platform Goals

| Goal | Status | Notes |
|------|--------|-------|
| Secure collection of lab/biometric data | ✅ Built | Manual lab entry, AI PDF upload, provider verification, biometric fields on Profile |
| HIPAA/PHI compliant storage | 🔶 Partial | Supabase RLS policies in place; formal HIPAA BAA not confirmed |
| Verified health metric scoring (BHAS) | ✅ Built | BHAS v1 (per-marker %) and BHAS v2.3 (derived ratios, out of 9.0) both running on Dashboard |
| Corporate wellness gamification | ✅ Built | Org structure, teams, employer view, leaderboard, team scoring display |
| Automated HSA reimbursement documentation | ❌ Not built | Document generation and HSA bank integration not yet built |
| De-identified population health analytics | ✅ Built | Corporate analytics dashboard on Employer page (aggregates only, no PHI) |

---

### Section 2 – User Types

| Feature | Status | Notes |
|---------|--------|-------|
| Public individual user accounts | ✅ Built | Email/password auth, profile, lab input, dashboard |
| Lab upload / connect | ✅ Built | Manual entry + AI PDF upload built; direct lab API integrations skipped (blocked on agreements) |
| Track personal health metrics | ✅ Built | Lab values stored, evaluated against rules, historical trend charts |
| Anonymous national comparisons | ✅ Built | National Benchmarks section on Dashboard — CDC/NHANES seed data for 15 markers; comparison arrow + optimal badge. Built 2026-03-31. |
| Optional public profile (opt-in consent) | ✅ Built | Privacy toggle on Profile, Consent page, Public Profile preview |
| Corporate portal / employer assignment | ✅ Built | Organizations + org_memberships, Employer page |
| De-identified employer view | ✅ Built | Username, public_id, team, BHAS % only — no PHI |
| Auto team assignment | ✅ Built | Dynamic per-org teams (not hardcoded); admin assigns via Public ID |
| Team scoring and analytics | ✅ Built | Team score summary, per-team avg BHAS, % optimal, leaderboard |

---

### Section 3 – Health Data Sources

| Source | Status | Notes |
|--------|--------|-------|
| Labcorp / Quest / Mako / Rhythm API integrations | ⏸ Skipped | Blocked on lab partner agreements |
| Provider-verified entries (NPI/license) | ✅ Built | Verifier name, credential, NPI, typed attestation stored; badge shown in results table |
| AI-verified lab PDF upload | ✅ Built | Gemini → OpenRouter → Groq cascade; fuzzy marker matching; duplicate detection |
| Biometric verification by clinician | 🔶 Partial | Biometric fields exist on Profile; no formal clinician attestation workflow for biometrics specifically |
| CGM device integrations | ❌ Not built | Future — requires device partnerships |
| VO2 Max calculator | ✅ Built | Rockport walk test, resting HR method, and direct lab entry — all convert to ACSM age/sex-adjusted percentile. Saves to VO2 Max Percentile marker. Built 2026-04-01. |

---

### Section 4 – Data Verification Methods

| Method | Status | Notes |
|--------|--------|-------|
| Secure API pull from certified labs | ⏸ Skipped | Blocked on lab agreements |
| Provider verification (NPI, signature, date) | ✅ Built | Full verifier fields + attestation on lab entry; badge shown in results table |
| AI PDF upload → extract → flag → approve → store | ✅ Built | Full pipeline complete including duplicate detection |

---

### Section 5 – Metrics Collected

| Metric | Status | Notes |
|--------|--------|-------|
| Cardiometabolic labs (glucose, cholesterol, HDL, LDL, triglycerides, BP) | ✅ Built | Markers, logic rules (updated to current medical guidelines 2026-03-20), BHAS scoring |
| Vitamin D | ✅ Built | Updated to Endocrine Society thresholds |
| Vitamin B12 | ✅ Built | Markers and logic rules seeded; binary scoring in v2.3 |
| Fasting Insulin | ✅ Built | Logic rules seeded 2026-03-20 |
| hs-CRP | ✅ Built | Lab marker created and logic rules seeded 2026-03-20 (was missing from lab_markers; added via follow-up SQL) |
| VO2 Max Percentile | ✅ Built | Lab marker created and logic rules seeded 2026-03-20 (was missing from lab_markers; added via follow-up SQL) |
| Waist circumference (male + female) | ✅ Built | Sex-specific markers; biometric entry on Profile |
| Grip strength | ✅ Built | Marker seeded; biometric entry on Profile |
| Advanced care planning status | ✅ Built | Profile checkbox; 1 point in BHAS v2.3 |
| Insulin usage (Type 1) | ✅ Built | Type 1 flag + total daily insulin units on Profile; replaces HOMA-IR in v2.3 |
| Acute care visits | ✅ Built | Profile field; tie-breaker in leaderboard |
| CGM metrics | ❌ Not built | Future |

---

### Section 6 – Balanced Health Scoring (BHAS)

| Feature | Status | Notes |
|---------|--------|-------|
| Per-marker scoring (Optimal=1, Improvement=0.5, Out of range=0) | ✅ Built | BHAS v1 engine in evaluateRules.ts; colour-coded chips on Dashboard and Labs page |
| Total BHAS v1 score (% of entered markers) | ✅ Built | Displayed as percentage banner on Dashboard |
| BHAS v2.3 score (derived ratios, out of 9.0) | ✅ Built | bhasV2.ts; shows when ≥4 of 9 metrics available; score label (Optimal/Healthy/Needs Improvement/High Risk) |
| Score interpretation labels | ✅ Built | Optimal ≥8.0, Healthy ≥6.0, Needs Improvement ≥4.0, High Risk <4.0 |
| All marker scoring ranges updated to current medical guidelines | ✅ Built | Migration 20260320_complete_logic_rules.sql covers all 15 markers |

---

### Section 7 – Corporate Gamification

| Feature | Status | Notes |
|---------|--------|-------|
| Auto team assignment | ✅ Built | Dynamic teams per org; admin assigns via Public ID dropdown |
| Team average score display | ✅ Built | Per-team avg BHAS % on Employer page and Admin org panel |
| % optimal per metric per team | ✅ Built | Team score summary includes % at optimal |
| Team ranking | ✅ Built | Teams ranked by avg BHAS in Employer view and Admin panel |
| Individual leaderboard with tie-breaker | ✅ Built | LeaderboardPage with medal badges, 5-level tie-breaker sort |
| Improvement trends | ❌ Not built | 12-week trend on analytics tab shows org-level only; per-user trend not surfaced |

---

### Section 8 – Identity & Privacy

| Feature | Status | Notes |
|---------|--------|-------|
| Corporate user de-identification | ✅ Built | Employer view shows username + public_id only; no name, email, or raw lab values |
| Unique usernames | ✅ Built | Username column on profiles; user self-set or admin override; availability check |
| Admin-only identity mapping | ✅ Built | Identity Mapping panel in Admin → Organizations (hidden by default; localStorage toggle) |
| Employer cannot view PHI | ✅ Built | Server endpoint enforces this; only de-identified fields returned |
| HIPAA compliant storage | 🔶 Partial | Supabase RLS enforced; formal HIPAA BAA with Supabase not confirmed |

---

### Section 8b – Lab Marker Charts (Feature 23)

| Feature | Status | Notes |
|---------|--------|-------|
| Historical trend chart per marker | ✅ Built | Inline Recharts chart on Labs page; shows when ≥2 results exist; optimal range band displayed |
| Admin-defined multi-marker charts | ❌ Not built | The built version is auto-generated per marker; admin-configured named charts (e.g. "Cardiometabolic Panel") not yet built |

---

### Section 8c – Affiliate Product Catalog (Features 24–25)

| Feature | Status | Notes |
|---------|--------|-------|
| Admin product catalog (add/edit/delete) | ✅ Built | AffiliateProductsTab.tsx — full CRUD, tag picker, active toggle. Built 2026-04-07. |
| Tag-based product matching | ✅ Built | product_tags join table; matching via applicableTags set in EvaluationContext |
| User-facing product recommendations | ✅ Built | AffiliateProductCards.tsx — tag-matched cards on Dashboard. Built 2026-04-07. |

**Spec:**
- DB: `affiliate_products` table (`id, name, description, image_url, affiliate_url, created_at`) + `product_tags` join table (`product_id, tag`)
- Admin UI: new "Products" tab — create/edit/delete products, assign health tags
- User UI: products whose tags match the user's fired result tags shown as cards with name, description, and "Learn More" link (opens affiliate URL in new tab)
- PHI rule: product recommendations are based on tags only, never on raw lab values

---

### Section 9 – HSA Reimbursement Automation

| Feature | Status | Notes |
|---------|--------|-------|
| Detect deficiency from metrics | ✅ Built | Rules engine fires non-optimal tags; BHAS score surfaces this to user |
| Generate medical necessity document | ❌ Not built | |
| Attach verified labs to document | ❌ Not built | |
| Populate HSA form | ❌ Not built | |
| Connect to HSA bank | ❌ Not built | |
| Submit reimbursement | ❌ Not built | |
| Payment/paywall for HSA feature | ❌ Not built | No payment/subscription system yet |

---

### Section 10 – Data Update Frequency

| Feature | Status | Notes |
|---------|--------|-------|
| Biannual lab update tracking | ✅ Built | Stale-data banner (>180 days) on Dashboard and Labs page |
| Lab upload workflow | ✅ Built | Manual entry + AI PDF upload |
| Biometric updates | ✅ Built | Biometric fields on Profile page (waist, grip, height) |

---

### Section 11 – Corporate Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| Population averages | ✅ Built | Analytics tab on Employer page: avg BHAS %, members with data |
| % optimal per metric | ✅ Built | Per-metric % optimal horizontal bar chart on Analytics tab |
| Team comparisons | ✅ Built | Team score summary on Employer page and Admin panel |
| Score distribution / risk distribution | ✅ Built | BHAS distribution bar chart + health label count cards |
| 12-week trend | ✅ Built | Org-average BHAS % line chart (last 12 weeks) |
| Insurance negotiation reports | ✅ Built | 4-variant modal on Analytics tab: Org Summary, Risk Profile, CSV Export, Print/PDF. Aggregate-only, no PHI. Built 2026-04-01. |

---

### Section 12 – Required Outputs

| Output | Status | Notes |
|--------|--------|-------|
| User dashboard | ✅ Built | BHAS v1 + v2.3 panels, stale-data banner, personalized recommendations |
| Metric scores (per marker) | ✅ Built | Colour-coded chips on Dashboard; BHAS Score column on Labs page |
| Total BHAS score | ✅ Built | Both v1 (%) and v2.3 (out of 9.0) displayed |
| Team ranking | ✅ Built | Leaderboard page + team summary on Employer page |
| Corporate analytics dashboard | ✅ Built | Analytics tab on Employer page |
| Exportable reports | ✅ Built | De-identified CSV export (employer/leaderboard) + individual user PDF health report (HealthReportModal.tsx). |

---

### Summary & Recommended Build Order

Items are ordered by logical dependency. Last updated: 2026-04-01.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| **Phase 1 – Foundation** | | ✅ 4/4 complete | |
| 1 | Core infrastructure (auth, DB, routing) | ✅ Built | |
| 2 | Admin CMS (resources, tags, categories, rules) | ✅ Built | |
| 3 | Resource library & recommendations | ✅ Built | |
| 4 | Individual user lab input & evaluation | ✅ Built | |
| **Phase 2 – Individual User Experience** | | ✅ 6/6 complete | |
| 5 | BHAS v1 scoring rollup | ✅ Built | |
| 6 | Metric scores in UI | ✅ Built | |
| 7 | Vitamin B12 marker + rules | ✅ Built | |
| 8 | Biometric data collection (waist, grip) | ✅ Built | |
| 9 | Data update frequency tracking (stale-data banner) | ✅ Built | |
| 10 | Optional public profile / consent page | ✅ Built | |
| **Phase 3 – Data Verification** | | ✅ 4/5 complete · 1 skipped | |
| 11 | AI PDF lab upload & extraction | ✅ Built | |
| 11a | PDF duplicate detection | ✅ Built | |
| 11b | New Marker Wizard (Admin) | ✅ Built | |
| 12 | Provider verification workflow | ✅ Built | |
| 13 | Direct lab API integrations | ⏸ Skipped | Blocked on lab agreements |
| **Phase 4 – Corporate Portal** | | ✅ 6/6 complete | |
| 14 | Corporate org structure | ✅ Built | |
| 15 | Unique username system + admin identity mapping | ✅ Built | |
| 16 | De-identified employer view | ✅ Built | |
| 17 | Auto team assignment (dynamic per-org teams) | ✅ Built | |
| 18 | Team scoring display | ✅ Built | |
| 18a | Admin org filters + sortable columns | ✅ Built | |
| **Phase 5 – Analytics & Reporting** | | ✅ 5/5 complete · 1 partial | |
| 19 | Anonymous national comparison benchmarks | ✅ Built | Dashboard National Benchmarks section — CDC/NHANES seed data for 15 markers. Built 2026-03-31. |
| 20 | Corporate analytics dashboard | ✅ Built | Analytics tab on Employer page |
| 21 | Insurance negotiation reports | ✅ Built | 4-variant modal (Org Summary, Risk Profile, CSV, Print/PDF). Built 2026-04-01. |
| 22 | Exportable reports (user + corporate) | ✅ Built | CSV export built 2026-03-23; individual user PDF health report built 2026-04-07 (HealthReportModal.tsx) |
| 23 | Lab marker trend charts | ✅ Built | Per-marker on Labs page; admin-configured named charts not yet built |
| **Phase 6 – Monetization & HSA** | | 🔶 1/5 partial | |
| 24 | Affiliate product catalog (Admin) | ✅ Built | AffiliateProductsTab.tsx — CRUD, tag picker, RLS. Migration: 20260407_create_affiliate_products.sql. Built 2026-04-07. |
| 25 | Affiliate product display (User) | ✅ Built | AffiliateProductCards.tsx — tag-matched cards on Dashboard. Built 2026-04-07. |
| 26 | Payment / subscription system | ❌ Not built | |
| 27 | HSA reimbursement automation | 🔶 Partial | Detection done; document generation not built |
| 28 | HSA bank connection | ❌ Not built | |
| **Phase 7 – Future / Nice to Have** | | 🔶 4/5 complete | |
| 29 | CGM device integrations | ❌ Not built | Requires device partnerships |
| 30 | VO2 Max calculator | ✅ Built | Rockport walk, resting HR, direct entry → ACSM percentile. Built 2026-04-01. |
| 31 | Advanced care planning status | ✅ Built | Done as part of Phase 8 |
| 32 | Insulin usage tracking (Type 1) | ✅ Built | Done as part of Phase 8 |
| 33 | Acute care visit tracking | ✅ Built | Done as part of Phase 8 |
| **Phase 8 – BHAS v2.3 Scoring Engine** | | ✅ 13/13 complete | |
| 34 | New markers: Fasting Insulin, hs-CRP, VO2 Max % | ✅ Built | |
| 35 | Height field on profiles | ✅ Built | |
| 36 | Type 1 Diabetes flag on profiles | ✅ Built | |
| 37 | Advanced Care Plan status on profiles | ✅ Built | |
| 38 | Acute Care Visits field on profiles | ✅ Built | |
| 39 | Total Daily Insulin Units field | ✅ Built | |
| 40 | BHAS v2.3 derived-ratio scoring engine | ✅ Built | bhasV2.ts — runs parallel with v1 |
| 41 | Vitamin D binary scoring (v2.3) | ✅ Built | >50 ng/mL = 1 |
| 42 | Vitamin B12 binary scoring (v2.3) | ✅ Built | >750 pg/mL = 1 |
| 43 | Store derived values (bhas_v2_scores table) | ✅ Built | |
| 44 | Score interpretation label on Dashboard | ✅ Built | |
| 45 | Leaderboard with tie-breaker ranking | ✅ Built | |
| 46 | CSV export for employer reporting | ✅ Built | De-identified member + leaderboard CSV exports. Built 2026-03-23. |
| **Phase 9 – Scoring Engine Improvements** | | ✅ 2/2 complete | |
| 47 | Remove hardcoded OPTIMAL_TAGS / IMPROVEMENT_TAGS | ✅ Built | scoring_tier column on tags table; EvaluationContext + evaluateRules.ts + server/index.js all read from DB. Migration: 20260323_add_scoring_tier_to_tags.sql. New Marker Wizard now fully self-contained. |
| 48 | Multiple scoring ranges per tier in Wizard | ✅ Built | Step 2 renders per-tier sections with + Add Range / × Remove buttons. Validation requires ≥1 valid Optimal row. No backend changes needed. |
| **Phase 10 – Pending / Backlog** | | 🔶 7/10 complete | |
| 49 | Resource Library — thumbnail/image per resource | ✅ Built | Supabase Storage bucket `resource-thumbnails` (public). `thumbnail_url` on `resources` table. Admin upload widget in edit modal. Grid/list/detail views all show thumbnail. Migration: `20260323_add_thumbnail_to_resources.sql`. |
| 50 | Rebrand: BHI → NHL (National Health League) | ✅ Built | All UI text, public ID prefix (NHL-XXXX-XXXX), localStorage keys (nhl-*), DB migration run. Built 2026-03-31. |
| 51 | Lab data retention policy (1-year limit) | ✅ Built | pg_cron migration created (20260331_lab_data_retention_1yr.sql). ⚠️ Must be run in Supabase Dashboard. |
| 52 | Research: direct lab API integrations (Labcorp, Quest, Mako, Rhythm) | ❌ Not built | Investigate patient-facing API availability, SMART on FHIR / OAuth flows, cost, and feasibility before committing to F13 |
| 53 | Review: "Add Provider Verification" section on Labs page | ✅ Reviewed | Confirmed complete and correct — no issues found. 2026-03-31. |
| 54 | Test: "Add Category" pill in Admin → Resources tab | ✅ Tested | Confirmed working. 2026-03-31. |
| 55 | Profile sex selector: remove "Other" | ✅ Built | Only Male and Female shown (2026-03-20). |
| 56 | Sort all dropdown filter options alphabetically | ✅ Built | Type, Tag, Category dropdowns sorted alphabetically in ResourcesPage and Admin. Built 2026-03-31. |
| 57 | Resources page — show results in alphabetical order by title | ✅ Built | Built 2026-03-31. |
| 58 | Admin Add Category modal — full list with alphabetical sort | ✅ Built | Built 2026-03-31. |
| 59 | Supplements tab | ✅ Built | Supplement links on Dashboard. Built 2026-04-07. |
| 60 | Lab marker active/inactive toggle | ✅ Built | is_active column on lab_markers; Admin slider toggle; PDF/manual entry filter; migration 20260501_add_is_active_to_lab_markers.sql. Built 2026-05-01. |
| 61 | PDF extraction overhaul (Groq primary) | ✅ Built | Groq promoted to primary AI provider; active-marker filter removed from prompt; unknown markers auto-registered as inactive. Built 2026-05-03. |
| 62 | Profile load deadlock fix | ✅ Built | ProfilePage and AuthContext login() both use plain fetch + JWT instead of supabase.from(). Built 2026-05-03. |
| 63 | League leaderboard | ✅ Built | leagues + league_orgs tables; LeaguesListPage + LeaguePage; Admin Leagues tab. Built 2026-04-16. |
| 64 | Broker role | ✅ Built | broker_orgs table; profiles.role extended; Admin Brokers tab. Built 2026-04-16. |
| 65 | Virtual providers | ✅ Built | virtual_providers table; VirtualProviderCards on Dashboard; Admin Providers tab. Built 2026-04-16. |
| 66 | Challenge UI | ❌ Not built | DB schema done (challenges + challenge_orgs). UI blocked pending Damon's health assessment answers. |
| 67 | Health Assessment | ✅ Built | health_assessments table; HealthAssessmentModal; Dashboard "Health Check-In" button. Built 2026-04-29. |
| 68 | Lab result trigger messages | ✅ Built | Contextual messages shown after manual entry or PDF save, based on value/tier. 8 markers + combined metabolic alert + positive reinforcement. HIPAA: shown only to the user. Built 2026-05-03. |
