# Client Feedback — Damon DiLorenzo (Balanced Health Institute / NHL)

> Collected from email exchanges. Review all before deciding on next build priorities.
> Questions marked **[Q]** need answers from Damon before we can build.
> All features must be HIPAA compliant. HIPAA rules are noted inline per feature.

---

## Email Exchange 1 — March 24, 2026

**Eddie's questions → Damon's responses:**

### 1. Supplements Tab ⭐ HIGH PRIORITY
- Damon wants a "25% off supplements" dropdown at the top of the app
- Two links:
  - **Fullscript:** https://us.fullscript.com/welcome/ddilorenzo1773884970
  - **Biote:** https://patients.shopbiote.com/customer/account/create/?cid=7886&utm_campaign=0001PL&utm_source=Practitioner%20Link&utm_medium=referral
- Should appear as a tab/dropdown in the top nav

### 2. Multiple Orgs Competing (League View)
- Confirmed: wants organizations ranked side by side on a leaderboard
- Likes the idea of big brands competing (Nike vs Adidas, NBA vs MLB, etc.)
- Cross-org "Challenge" feature is desired for large organizations

> **HIPAA rule:** Leaderboard must show org-level aggregates only (org name + average BHAS score or % Optimal). Individual member scores, usernames, or public IDs must never appear on a cross-org leaderboard. Individual members may see their own rank within their own org only.

**Questions for Damon:**
- **[Q]** How should the leaderboard be ranked — by average BHAS score per org, or % of members at Optimal/Healthy?
- **[Q]** Should the leaderboard be visible to all app users, only org admins, or only you (Damon)?
- **[Q]** For a "Challenge," do two orgs opt in, or does an NHL admin create it? What is the duration (e.g., 90-day challenge)?
- **[Q]** Should individual members be able to see which org they are competing against?

### 3. Location / Sub-Org Structure
- Does NOT want to break down to very small sub-groups
- Locations should fall under a parent organization
- Each parent org should have a broker + an NHL member overseeing it
- One person manages all locations in the app, can delegate to branches
- All branches can see scoring

**Questions for Damon:**
- **[Q]** How many levels deep should the hierarchy go? (e.g., League → Org → Location — or just Org → Location?)
- **[Q]** Can a branch admin see scoring for their branch only, or all branches under the parent?

### 4. Broker Role (New User Role)
- League/competition should be co-managed by:
  - An insurance/healthcare broker
  - The organization admin
  - An NHL employee (Damon or his staff)
- This is a new role not currently in the system

> **HIPAA rule:** Brokers receive the same de-identified employer view as org admins — username, public ID, team, and aggregate BHAS % only. No real names, emails, or individual lab values. Any reports or CSV exports accessible to brokers must be aggregate only.

**Questions for Damon:**
- **[Q]** What can a broker see/do that an org admin cannot? (e.g., can they see all orgs they manage, run reports, invite members?)
- **[Q]** Can a broker manage multiple orgs at once?
- **[Q]** Should brokers have access to the insurance report / CSV export?

### 5. Virtual Provider Links Per Org
- Each org should be able to link to virtual care providers
- Specialties: cardiology, endocrinology, primary care, urgent care, family medicine
- Could be strategic local providers that Damon has contracts with
- Similar to affiliate links but org-specific

> **HIPAA rule:** Provider links themselves are not PHI. However, if the app surfaces providers based on a user's health tags or conditions, that matching logic must never expose which tags triggered the recommendation to any third party. The link display is safe; the targeting logic must stay server-side and user-scoped.

**Questions for Damon:**
- **[Q]** Who sets these links — you (Damon/NHL admin), or can org admins add their own providers?
- **[Q]** Should these display to all members of that org, or only members with specific health tags/conditions?
- **[Q]** Is this just a list of links with provider names, or do you also want descriptions/bios/specialties?

### 6. Public Sign-Up
- Damon wants people to be able to join publicly (download the app and sign up)
- Should coexist with org-assigned accounts
- Note: public sign-up already works — may just need a clearer entry point

### 7. Domain Migration
- App should move to national-health-league.com
- Domain is on GoDaddy, username: damon@balancedhealthinstitute.com
- Call Damon for password when ready to deploy
- Not actionable yet

### 8. Metrics Updates
- Damon is working on updating the metrics
- No details yet — follow up needed

---

## Email Exchange 2 — BHAS v2.3 Updated Specification + Hormone Metrics

**Damon's note:**
> "I made some changes to the scaling and numbers. Only for scoring purposes: HOMA-IR, HsCRP, B12, Height waist ratio, Advanced care planning, Triglycerides/HDL ratio, Vitamin D level. Biometrics and hormone levels — keep tracked but separate, do NOT go into the scoring algorithm."

---

### BHAS v2.3 Scoring Changes (vs. what is currently built)

#### HOMA-IR thresholds — CHANGED
| | Currently built | New spec |
|--|--|--|
| Optimal (1) | < 1.5 | < 2 |
| Improvement (0.5) | 1.5–2.5 | 2–3 |
| Out of Range (0) | ≥ 2.5 | ≥ 2.5 (overlaps — needs clarification) |

**[Q] HOMA-IR overlap clarification needed:** The spec shows Improvement as 2–3 but Out of Range as ≥ 2.5. These overlap between 2.5 and 3. Should Out of Range be ≥ 3.0 (not 2.5)?

#### Max score — CHANGED
- Currently built: 9.0 (9 metrics)
- New spec: **7.0** (7 scored metrics — VO2 Max, Grip Ratio, WtHR, ACP moved OUT of scoring)

#### Scored metrics (new spec — 7 total):
1. HOMA-IR (non-Type 1) OR Insulin Units/kg (Type 1)
2. hs-CRP
3. TG/HDL Ratio
4. Vitamin D (binary)
5. Vitamin B12 (binary)
6. Waist-to-Height Ratio (WtHR)
7. Advanced Care Planning (binary)

#### Removed from scoring (tracked separately for analysis only):
- VO2 Max Percentile ← was scored, now biometric/analysis only
- Grip Ratio ← was scored, now biometric/analysis only

#### Tie-breaker ranking — CHANGED
1. Higher VO2 Max Percentile (unchanged)
2. Higher Grip Strength ← changed from "Grip Ratio"
3. Fewer acute care visits + medical claims ← new: add "Explanation of Benefits" field
4. Lower hs-CRP ← moved from #3 to #4

#### Score interpretation — CHANGED
| | Currently built | New spec |
|--|--|--|
| Optimal | 8.0–9.0 | 6–7 |
| Healthy | 6.0–7.5 | 5–6 |
| Needs Improvement | 4.0–5.5 | 4–5 |
| High Risk | 0–3.5 | 0–3.5 |

---

### New: Hormone Metrics (tracked, NOT scored)

> **HIPAA rule:** Hormone markers are PHI. Stored with RLS, user-scoped only. Never exposed in employer views, broker views, or any export. Displayed to the user only on their own dashboard/labs page.

**Male:**
- Free Testosterone: optimal ≥ 100
- Total Testosterone: if < 500, reflex to calculated free testosterone
- Estrogen (male): optimal 25–35

**Female:**
- Free and total testosterone levels (thresholds TBD)

**Questions for Damon:**
- **[Q]** What are the optimal thresholds for female Free Testosterone and Total Testosterone? (Male thresholds provided; female not yet specified.)
- **[Q]** Should estrogen be tracked for females as well? If so, what is the optimal range?
- **[Q]** Are there any other markers where male and female thresholds should differ (beyond Grip Ratio, which is already sex-specific)?
- **[Q]** Should hormone markers appear in the same Labs section as blood work, or in a separate "Hormone Panel" section?

**Biometrics (tracked separately, not scored):**
- VO2 Max
- Grip Strength
- Waist-to-Height Ratio < 0.5

---

### Impact Assessment

| Change | Effort | Notes |
|--------|--------|-------|
| HOMA-IR threshold update | Small | Update logic rules in DB |
| Max score 9.0 → 7.0 | Medium | Update `bhasV2.ts` scoring engine, score labels, dashboard display |
| Remove VO2 + Grip from scoring | Medium | Mark as biometric/analysis only in scoring engine |
| Score interpretation bands | Small | Update `bhasV2.ts` label thresholds |
| Tie-breaker #2 Grip Ratio → Grip Strength | Small | Update `bhasV2.ts` tie-breaker logic |
| Tie-breaker #3 add EOB field | Medium | New profile field + UI |
| New hormone markers (Male) | Medium | New lab markers + tracking UI (no scoring) |
| New hormone markers (Female) | Small | Thresholds TBD from Damon |
| Separate biometric tracking section | Medium | UI change to separate scored vs. tracked |

---

## Email Exchange 3 — Tax Code Compliance + Health Assessment

**Damon's message:**

### 1. Tax Code Compliance (IRC §105, §125, §213)

> **HIPAA rule:** Any invoice or receipt generated by the app must be aggregate only (e.g., "50 employees × $X/month"). Never itemize by individual employee name, health status, or usage data that could reveal PHI. Employer-facing billing documents must be de-identified.
- Damon believes employers can use these tax codes to pay for app services + his services via payroll
- IRC §105: Employer-sponsored health reimbursement arrangements (HRAs)
- IRC §125: Cafeteria plans (pre-tax payroll deductions for health benefits)
- IRC §213: Medical expense deductions
- Requires HIPAA compliance and possibly additional compliance steps
- Goal: employers could pay for app utilization straight through payroll deductions
- **Dev note:** The app itself does not need to "implement" tax codes — this is primarily a legal/plan document matter. App may need to support invoicing, receipts, or eligible expense documentation.

#### Physician-Recommended App Strategy ⭐ REVIEW BEFORE FINAL DELIVERY

**Key advantage:** Damon is a physician. This allows the NHL App to be positioned as a physician-prescribed medical monitoring tool rather than a general wellness app — a critical distinction for IRS qualification under §105/§213.

**Steps Damon needs to take (outside the app):**
1. **Create a Letter of Medical Necessity template** — a one-page document a physician signs per patient recommending the NHL App as part of their treatment or preventive care plan. Should reference specific diagnosable conditions being monitored (metabolic syndrome, pre-diabetes, cardiovascular risk, insulin resistance).
2. **Position the app clinically** — document in his employer service agreements that the NHL App is a cardiometabolic monitoring tool, not a general wellness program. The BHAS metrics (HOMA-IR, hs-CRP, TG/HDL) support this framing directly.
3. **Work with a benefits attorney** to draft the HRA plan document with language covering physician-prescribed health monitoring services.
4. **Keep records** — each employee submitting the app for HRA reimbursement should have a signed Letter of Medical Necessity on file with the employer.
5. **Optional:** Document the app order in the patient's clinical chart during an office visit — strongest possible paper trail for IRS and insurance purposes.

**What the app needs to build to support this:**
- A simple **employer invoice / subscription receipt** PDF: org name, number of enrolled employees, cost per employee, billing period. No individual PHI.
- This is the only app-side requirement. The clinical documentation process lives outside the app.

**Why this matters:**
- Most wellness apps cannot qualify under §105/§213. The app's cardiometabolic focus + Damon's physician status puts it in a different category than gym memberships or step trackers.
- This is a significant product differentiator and a strong selling point for employer clients.
- Attorney review is essential before Damon begins offering this to employers.

**Questions for Damon:**
- **[Q]** Have you confirmed with a benefits attorney or CPA that the app qualifies as a reimbursable expense under §105/§125/§213? This will determine exactly what documentation the app needs to generate.
- **[Q]** Do you need the app to generate invoices or payment receipts for employers (e.g., a PDF receipt showing "NHL App subscription — $X/employee/month")?
- **[Q]** Do you need a way for employers to pay for the app directly through the app (payment processing), or is this just about proper documentation for their payroll/benefits department?
- **[Q]** Should individual employees be able to see their own subscription cost for tax/FSA purposes?

### 2. Brief Health Assessment (New Feature)

> **HIPAA rule:** Lifestyle inputs and symptom responses are PHI. Stored with RLS, user-scoped only. Employers and brokers may only see aggregate, de-identified data (e.g., "42% of your workforce reports poor sleep") — never individual responses. Assessment data must never appear in any employer report or CSV export at the individual level.

**Lifestyle inputs:**
- Alcohol use
- Smoking use
- Sleep
- Stress
- Exercise (steps per day)
- Diet

**Symptom checklist:**
- Shortness of breath
- Chest pain or palpitations
- Fatigue
- Headache
- Nausea
- Diarrhea
- Difficulty swallowing
- Joint pain
- Back pain
- Depressed
- Anxious
- Heartburn or GERD

**Questions for Damon:**
- **[Q]** How should lifestyle inputs be captured? (e.g., frequency scale like "Never / Sometimes / Daily", or free-text, or numeric like "drinks per week"?)
- **[Q]** How should sleep and stress be measured? (e.g., hours of sleep per night, stress on a 1–10 scale?)
- **[Q]** How should diet be captured? (e.g., select a diet type like "Mediterranean / Keto / Standard American", or a quality rating like "Poor / Fair / Good / Excellent"?)
- **[Q]** For symptoms — is this a yes/no checklist ("Do you currently experience..."), or frequency-based ("How often do you experience...")?
- **[Q]** Should the health assessment feed into the BHAS score, influence resource recommendations, or be tracked/displayed separately with no impact on scoring?
- **[Q]** How often should users complete this assessment? (e.g., once at signup, quarterly, with every lab entry?)
- **[Q]** Should employers/admins be able to see aggregate symptom data (e.g., "40% of org reports fatigue") — de-identified of course?

---

---

## Summary — Pending Decisions

| Item | Status | Notes |
|------|--------|-------|
| Supplements tab | Ready to build | Two links provided |
| BHAS v2.3 scoring updates | Ready to build | Max score 7.0, HOMA-IR thresholds, remove VO2/Grip from scoring |
| New hormone markers (tracked only) | Ready to build | Free/Total Testosterone (M), Estrogen (M), Female TBD |
| EOB field (tie-breaker #3) | Ready to build | New profile field: acute care visits + medical claims |
| Brief health assessment | Needs design | Lifestyle inputs + symptom checklist |
| Tax code compliance (§105/§125/§213) | Needs research | What app changes (if any) are required |
| Employer invoice / receipt PDF | Ready to build (pending Damon confirmation) | Aggregate only — org name, employee count, cost, billing period. No PHI. |
| Physician-recommended app strategy | Review before delivery | Damon needs Letter of Medical Necessity template + attorney to draft HRA plan doc. App only needs invoice/receipt PDF. |
| League / cross-org leaderboard | Needs design | New layer above orgs |
| Broker role | Needs design | New user role in org system |
| Virtual provider links per org | Needs design | Org-specific affiliate links |
| Challenge feature (head-to-head) | Needs design | Links 2+ orgs together |
| Public sign-up clarity | Minor | Already works, may need UX polish |
| Domain migration | Not yet | Awaiting deployment decision |
