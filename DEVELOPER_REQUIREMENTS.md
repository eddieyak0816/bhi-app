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
- Approved metrics stored

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
| **Phase 6 – Monetization & Advanced Automation** | | | |
| 23 | Payment / subscription system (HSA feature paywall) | ❌ Not built | Required before HSA feature is gated |
| 24 | HSA reimbursement automation (detect → document → form → submit) | ❌ Not built | Depends on verified labs + payment gate |
| 25 | HSA bank connection | ❌ Not built | Depends on HSA automation being built |
| **Phase 7 – Future / Nice to Have** | | | |
| 26 | CGM device integrations | ❌ Not built | Requires device partnerships |
| 27 | VO2 Max calculator | ❌ Not built | Biometric feature |
| 28 | Advanced care planning status | ❌ Not built | Requires clinical workflow definition |
| 29 | Insulin usage tracking (Type 1) | ❌ Not built | |
| 30 | Acute care visit tracking | ❌ Not built | |
