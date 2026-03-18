# Balanced Health Institute APP – Developer Requirements & Process Specification

This document outlines the functional requirements, workflows, and data processes for the
Balanced Health Institute mobile/web application. The platform securely collects verified
health metrics, protects HIPAA/PHI data, enables gamified corporate wellness analytics,
and automates HSA reimbursement documentation.

---

## 1. Core Platform Goals

- Secure collection of laboratory and biometric health data
- HIPAA/PHI compliant storage and transmission *(if necessary)*
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

> Assessed against current codebase as of 2026-03-02.
> Legend: ✅ Built | 🔶 Partial | ❌ Not built

### Section 1 – Core Platform Goals

| Goal | Status | Notes |
|------|--------|-------|
| Secure collection of lab/biometric data | 🔶 Partial | Lab input form exists; biometric collection not yet built |
| HIPAA/PHI compliant storage | 🔶 Partial | Supabase RLS policies in place; formal HIPAA BAA and audit trails not confirmed |
| Verified health metric scoring (BHAS) | 🔶 Partial | Logic rules engine scores tags (0/0.5/1 scoring defined) but no total BHAS score rolled up to user yet |
| Corporate wellness gamification | ❌ Not built | No team system, no corporate portal |
| Automated HSA reimbursement documentation | ❌ Not built | No document generation or HSA bank integration |
| De-identified population health analytics | ❌ Not built | No aggregate/population analytics module |

---

### Section 2 – User Types

| Feature | Status | Notes |
|---------|--------|-------|
| Public individual user accounts | ✅ Built | Email/password auth, profile, lab input, dashboard |
| Lab upload / connect | 🔶 Partial | Manual input built; direct lab API integrations not built |
| Track personal health metrics | ✅ Built | Lab values stored, evaluated against rules |
| Anonymous national comparisons | ❌ Not built | No aggregate benchmark data or comparison feature |
| Optional public profile (opt-in consent) | 🔶 Partial | Consent noted in codebase; public profile page not built |
| Corporate portal / employer assignment | ❌ Not built | No corporate org structure, no employer portal |
| De-identified employer view | ❌ Not built | |
| Auto team assignment (Fire/Water/Wind/Earth) | ❌ Not built | |
| Team scoring and analytics | ❌ Not built | |

---

### Section 3 – Health Data Sources

| Source | Status | Notes |
|--------|--------|-------|
| Labcorp / Quest / Mako / Rhythm API integrations | ❌ Not built | No lab API connections exist |
| Provider-verified entries (NPI/license) | ❌ Not built | No verifier workflow in system |
| AI-verified lab PDF upload | 🔶 In Progress | Google Gemini API selected; server endpoint + upload UI in progress |
| Biometric verification by clinician | ❌ Not built | No biometric entry or verification workflow |
| CGM device integrations | ❌ Not built | Noted as future |
| VO2 Max calculator | ❌ Not built | Noted as future |

---

### Section 4 – Data Verification Methods

| Method | Status | Notes |
|--------|--------|-------|
| Secure API pull from certified labs | ❌ Not built | |
| Provider verification (NPI, signature, date) | ❌ Not built | No verifier fields in schema |
| AI PDF upload → extract → flag → approve → store | 🔶 In Progress | Google Gemini API; server endpoint + upload UI in progress |

---

### Section 5 – Metrics Collected

| Metric | Status | Notes |
|--------|--------|-------|
| Cardiometabolic labs (glucose, cholesterol, HDL, LDL, triglycerides, BP) | ✅ Built | Lab markers and logic rules seeded |
| Vitamin D | ✅ Built | Lab marker and rules seeded |
| Vitamin B12 | ❌ Not built | Not in current lab markers |
| Waist circumference | ❌ Not built | No biometric input for this |
| VO2 Max | ❌ Not built | Future item |
| Grip strength | ❌ Not built | No biometric input for this |
| Advanced care planning status | ❌ Not built | |
| Insulin usage (Type 1) | ❌ Not built | |
| Acute care visits | ❌ Not built | |
| CGM metrics | ❌ Not built | Future item |

---

### Section 6 – Balanced Health Scoring (BHAS)

| Feature | Status | Notes |
|---------|--------|-------|
| Per-metric scoring (Optimal=1, Improvement=0.5, Out of range=0) | 🔶 Partial | Tags indicate optimal/non-optimal but numeric scores not yet surfaced to users |
| Total BHAS score calculated and displayed per user | ❌ Not built | Score rollup and display not implemented |

---

### Section 7 – Corporate Gamification

| Feature | Status | Notes |
|---------|--------|-------|
| Auto team assignment (Fire/Water/Wind/Earth) | ❌ Not built | |
| Team average score display | ❌ Not built | |
| % optimal per metric per team | ❌ Not built | |
| Team ranking | ❌ Not built | |
| Improvement trends | ❌ Not built | |

---

### Section 8 – Identity & Privacy

| Feature | Status | Notes |
|---------|--------|-------|
| Corporate user de-identification | ❌ Not built | No corporate user model yet |
| Unique usernames | 🔶 Partial | Users have email-based identity; username system not distinct |
| Admin-only identity mapping | 🔶 Partial | Admin role exists; explicit identity mapping UI not built |
| Employer cannot view PHI | ❌ Not built | No employer portal to restrict |
| HIPAA compliant storage | 🔶 Partial | Supabase RLS in place; formal HIPAA posture not confirmed |

---

### Section 8b – Lab Marker Charts (Feature 23)

| Feature | Status | Notes |
|---------|--------|-------|
| Admin can create named charts | ❌ Not built | Chart has a name and an ordered list of lab markers |
| Admin can add/remove markers from a chart | ❌ Not built | Each marker plotted as a line or bar series |
| Charts visible to users on their dashboard or Labs page | ❌ Not built | Shows user's own values over time for selected markers |
| Multiple charts supported | ❌ Not built | e.g. "Cardiometabolic Panel", "Vitamin Status" |

**Spec:**
- DB: `charts` table (`id, name, created_at`) + `chart_markers` join table (`chart_id, marker_id, display_order`)
- Admin UI: new "Charts" tab — create/delete charts, add/remove markers per chart
- User UI: charts rendered as line graphs (time on x-axis, value on y-axis) using a charting library (e.g. Recharts)
- Only markers for which the user has at least one result are rendered

---

### Section 8c – Affiliate Product Catalog (Features 24–25)

| Feature | Status | Notes |
|---------|--------|-------|
| Admin product catalog (add/edit/delete) | ❌ Not built | Admin manages products with name, description, image URL, affiliate URL, associated tags |
| Tag-based product matching | ❌ Not built | Products are associated with health tags; shown to users whose results fired those tags |
| User-facing product recommendations | ❌ Not built | Shown on Dashboard or a dedicated "Recommendations" page; links open affiliate URL |
| Commission tracking | ❌ Not built | Out-of-scope for v1 — affiliate URLs are external; commission tracked by affiliate network |

**Spec:**
- DB: `affiliate_products` table (`id, name, description, image_url, affiliate_url, created_at`) + `product_tags` join table (`product_id, tag`)
- Admin UI: new "Products" tab — create/edit/delete products, assign health tags
- User UI: products whose tags match the user's fired result tags shown as cards with name, description, and "Learn More" link (opens affiliate URL in new tab)
- PHI rule: product recommendations are based on tags only, never on raw lab values

---

### Section 9 – HSA Reimbursement Automation

| Feature | Status | Notes |
|---------|--------|-------|
| Detect deficiency from metrics | 🔶 Partial | Evaluation rules engine detects non-optimal tags |
| Generate medical necessity document | ❌ Not built | |
| Attach verified labs to document | ❌ Not built | |
| Populate HSA form | ❌ Not built | |
| Connect to HSA bank | ❌ Not built | |
| Submit reimbursement | ❌ Not built | |
| Fee/paywall for public access to this feature | ❌ Not built | No payment/subscription system |

---

### Section 10 – Data Update Frequency

| Feature | Status | Notes |
|---------|--------|-------|
| Biannual lab update tracking | ❌ Not built | No date-based update enforcement or reminders |
| User-uploaded lab update | 🔶 Partial | Manual entry exists; no structured upload workflow |
| Ongoing biometric updates | ❌ Not built | No biometric input module |

---

### Section 11 – Corporate Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| Population averages | ❌ Not built | |
| % optimal metrics | ❌ Not built | |
| Team comparisons | ❌ Not built | |
| Risk distribution | ❌ Not built | |
| Insurance negotiation reports | ❌ Not built | |

---

### Section 12 – Required Outputs

| Output | Status | Notes |
|--------|--------|-------|
| User dashboard | ✅ Built | Dashboard page with stats, recommendations |
| Metric scores (per marker) | 🔶 Partial | Tags indicate range; numeric scores not displayed |
| Total BHAS score | ❌ Not built | |
| Team ranking | ❌ Not built | |
| Corporate analytics dashboard | ❌ Not built | |
| Exportable reports | ❌ Not built | |

---

### Summary & Recommended Build Order

Items are ordered by logical dependency — each phase builds on the one before it.

| Priority | Category | Status | Rationale |
|----------|----------|--------|-----------|
| **Phase 1 – Already Done** | | | |
| 1 | Core infrastructure (auth, DB, routing) | ✅ Built | Foundation for everything |
| 2 | Admin CMS (resources, tags, categories, rules) | ✅ Built | Needed to manage content |
| 3 | Resource library & recommendations | ✅ Built | Core user value |
| 4 | Individual user lab input & evaluation | 🔶 Partial | Core user value |
| **Phase 2 – Complete the Individual User Experience** | | | |
| 5 | BHAS scoring rollup (total score per user) | 🔶 Partial | Required before showing users meaningful results |
| 6 | Metric scores surfaced in UI (0 / 0.5 / 1 per marker) | 🔶 Partial | Depends on BHAS logic being complete |
| 7 | Vitamin B12 lab marker + rules | ❌ Not built | Simple addition to existing pattern |
| 8 | Biometric data collection (waist, grip strength) | ❌ Not built | Needed for full BHAS score |
| 9 | Data update frequency tracking (biannual reminders) | ❌ Not built | Ensures data stays current |
| 10 | Optional public profile / opt-in consent page | 🔶 Partial | Required for any public-facing features |
| **Phase 3 – Data Verification & Integrity** | | | |
| 11 | AI PDF lab upload & extraction *(preferred method)* | ❌ Not built | Highest-impact data input improvement |
| 12 | Provider verification workflow (NPI, credential, signature, date) | ❌ Not built | Required for HSA and corporate trust |
| 13 | Lab API integrations (Labcorp, Quest, Mako, Rhythm) | ❌ Not built | Automates data entry; depends on lab partner agreements |
| **Phase 4 – Corporate Portal** | | | |
| 14 | Corporate org structure (employers, assigned users) | ❌ Not built | Foundation for all corporate features |
| 15 | Unique username system + admin identity mapping | 🔶 Partial | Required for de-identification |
| 16 | De-identified employer view (no PHI visible) | ❌ Not built | Depends on org structure + username system |
| 17 | Auto team assignment (Fire / Water / Wind / Earth) | ❌ Not built | Depends on corporate user model |
| 18 | Team scoring display (avg score, % optimal, ranking, trends) | ❌ Not built | Depends on team assignment + BHAS rollup |
| **Phase 5 – Analytics & Reporting** | | | |
| 19 | Anonymous national comparison benchmarks | ❌ Not built | Requires sufficient user data volume |
| 20 | Corporate analytics dashboard (population averages, risk distribution, team comparisons) | ❌ Not built | Depends on corporate portal being complete |
| 21 | Insurance negotiation reports | ❌ Not built | Depends on corporate analytics |
| 22 | Exportable reports (user + corporate) | ❌ Not built | Depends on analytics being complete |
| **Phase 5 – Analytics & Reporting (continued)** | | | |
| 23 | Lab marker charts — admin-defined, user-facing data visualization | ❌ Not built | Admin creates named charts, selects which markers to include; users see their values plotted over time |
| **Phase 6 – Monetization & HSA Automation** | | | |
| 24 | Affiliate product catalog — admin manages products + affiliate links | ❌ Not built | Admin adds product name, description, image, affiliate URL; products shown to users based on their health tags |
| 25 | Affiliate product display — user-facing recommendations with commission links | ❌ Not built | Depends on product catalog being built |
| 26 | Payment / subscription system (HSA feature paywall) | ❌ Not built | Required before HSA feature is gated |
| 27 | HSA reimbursement automation (detect → document → form → submit) | ❌ Not built | Depends on verified labs + payment gate |
| 28 | HSA bank connection | ❌ Not built | Depends on HSA automation being built |
| **Phase 7 – Future / Nice to Have** | | | |
| 29 | CGM device integrations | ❌ Not built | Requires device partnerships |
| 30 | VO2 Max calculator | ❌ Not built | Biometric feature |
| 31 | Advanced care planning status | ❌ Not built | Requires clinical workflow definition |
| 32 | Insulin usage tracking (Type 1) | ❌ Not built | |
| 33 | Acute care visit tracking | ❌ Not built | |
| **Phase 8 – BHAS v2.3 Scoring Engine Upgrade** | | | |
| 34 | New lab markers: Fasting Insulin, hs-CRP, VO2 Max Percentile | ❌ Not built | DB migration + seed; existing lab entry form handles automatically |
| 35 | Add Height field to profiles | ❌ Not built | Required for WtHR calculation |
| 36 | Add Type 1 Diabetes flag to profiles | ❌ Not built | Controls HOMA-IR vs. Insulin Units/kg scoring branch |
| 37 | Add Advanced Care Plan status to profiles | ❌ Not built | Binary scored metric (1/0) |
| 38 | Add Acute Care Visits count to profiles | ❌ Not built | Tie-breaker only, not scored |
| 39 | Add Total Daily Insulin Units field (Type 1 only) | ❌ Not built | Needed to compute Insulin Units/kg |
| 40 | Rewrite BHAS scoring engine for derived ratio scoring | ❌ Not built | Breaking change to evaluateRules.ts + server/index.js |
| 41 | Update Vitamin D scoring to binary (>50=1, ≤50=0) | ❌ Not built | Replaces current 4-tier tag system |
| 42 | Update Vitamin B12 scoring to binary (>750=1, ≤750=0) | ❌ Not built | Replaces current tiered tag system |
| 43 | Store derived values (HOMA-IR, TG/HDL, etc.) alongside raw inputs | ❌ Not built | Required for leaderboard + analytics |
| 44 | Score interpretation label on Dashboard | ❌ Not built | Optimal / Healthy / Needs Improvement / High Risk |
| 45 | Leaderboard with tie-breaker ranking logic | ❌ Not built | Depends on derived values being stored |
| 46 | CSV export for employer reporting (de-identified) | ❌ Not built | Username, public_id, team, BHAS, per-metric points |
