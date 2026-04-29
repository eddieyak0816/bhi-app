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

## Email Exchange 5 — Pivot to Free App + De-identified Org Join (2026-04-12)

**Damon's message (verbatim):**
> "I think I'm going to pivot and make the APP for free for everyone. Our health is a god given right that has been taken from us and I want it to be accessible to everyone.
>
> I would like to have a way for organizations or individuals to be able to join an organization unidentified so that if a corporation wants to consult with me and analyze data with their employees they would be able to add de-identified data through their employee email.
>
> However I think I want to focus on making it free and building my brand with the national health league then trying to bring in my symbol and motto for sales in addition to the supplements."

---

### What this means for the app

#### 1. Free for all users ✅ — No app changes required
The app does not currently have a paywall or payment gate. Users can already sign up and use it for free. This is a **business/pricing decision**, not a dev task. The payment features (Phase 6) that were planned can be **deprioritized or dropped entirely**.

Impact on backlog:
- Payment processing (Phase 6) — **drop / defer indefinitely**
- HSA bank integration (Phase 6) — **drop / defer indefinitely**
- Employer invoice/receipt PDF — **lower priority** (no paid subscriptions to invoice)
- Tax code compliance (§105/§125/§213) — **lower priority** (less relevant if app is free)

#### 2. De-identified org join — NEW FEATURE REQUEST

**What Damon wants:** An individual employee can join their employer's org without revealing their real identity. The employer/org admin sees only de-identified data (already how the employer view works), but the *join flow itself* should be anonymous — triggered by the employee's **work email domain** or an **org invite code**, not by the employee registering with personal details.

**What we already have:**
- Org structure (`organizations` + `org_memberships` tables) ✅
- De-identified employer view (username + public_id + BHAS % only) ✅
- Username system (user-chosen, not real name) ✅
- `is_public` consent flag ✅

**What's missing / needs clarification:**

**[Q]** How does an employee signal which org they belong to?
- Option A: Employee enters an **org invite code** at signup or in Profile — org admin generates codes
- Option B: Employee's **email domain** is matched automatically (e.g., `@acme.com` → Acme Corp org)
- Option C: Org admin **imports a list of work emails**; app detects match on registration

**[Q]** Does "unidentified" mean:
- The org admin never sees the employee's real name or personal email? (Already true — employer view shows username + public_id only)
- Or that the employee doesn't even reveal their work email to the app? (Would require a different join mechanism — invite code only)

**[Q]** Should the org admin be able to see *which* employees have joined (by work email), or only aggregate counts?

**Dev notes:**
- If Option A (invite code): add `invite_code` column to `organizations`, generate codes in Admin, let users enter code on Profile or at signup.
- If Option B (email domain): add `email_domain` column to `organizations`; auto-assign membership on user creation if email domain matches.
- Option B is simpler to build but requires the user's work email to be stored — which Damon may not want if truly "unidentified."
- HIPAA: whichever approach, org admins must never see individual lab values, real names, or emails. Current RLS + employer view already enforces this.

#### 3. Brand / merch / supplements as revenue ✅ — No app changes required
Building the NHL brand and selling supplements/merch is a **marketing decision**. The supplements dropdown is already built (F59). No additional dev work needed for this direction.

---

### Impact on existing backlog

| Item | Old status | New status after pivot |
|------|-----------|----------------------|
| Payment processing | Planned | **Drop / defer** |
| HSA bank integration | Planned | **Drop / defer** |
| Employer invoice PDF | Ready to build | **Deprioritize** |
| Tax code compliance | Research needed | **Deprioritize** |
| De-identified org join | Not planned | **New — needs design decision (Q above)** |
| Broker role | Ready to build | **Still relevant** — brokers manage multiple free orgs |
| League leaderboard | Ready to build | **More important now** — free app needs community engagement |

---

## Email Exchange 4 — Damon's Answers to Open Questions (2026-04-12)

**Eddie's questions → Damon's responses:**

---

### BHAS v2.3 Scoring — HOMA-IR Overlap ✅ RESOLVED

**Q:** Improvement is 2–3, Out of Range is ≥ 2.5 — these conflict. Should Out of Range start at ≥ 3.0?

**Damon:** Simplify it — 0–2.5 is normal, > 2.5 is abnormal.

**Decision:** Three tiers replaced with two effective thresholds:
- **Optimal (1.0):** HOMA-IR 0–2.5
- **Out of Range (0):** HOMA-IR > 2.5
- No Improvement tier for HOMA-IR

**Also:** Add a link to the HOMA-IR Wikipedia/research article as a reference for users interested in learning more.

> **Action required:** Update `bhasV2.ts` HOMA-IR thresholds + logic rules in DB (new migration). The current migration `20260407_bhas_v23_homa_ir_thresholds.sql` set Improvement 2.0–2.9 / Out of Range ≥ 3.0 — that needs to be updated to match the simplified two-tier model.

---

### Hormone Markers — ✅ MOSTLY RESOLVED

#### Male hormones
- Free Testosterone (Male): **track only, no thresholds/ranges** — leave open-ended
- Total Testosterone (Male): **track only, no thresholds/ranges** — leave open-ended
- Estrogen (Male): keep tracking (per our prior build)
- **Add PSA (Prostate-Specific Antigen)** for males: Normal 0–4 ng/mL, High > 4 ng/mL

> **Impact on F62 migration already written:** The `20260412_add_male_hormone_markers.sql` assigned ranges to Free T and Total T based on Email Exchange 2 — these need to be removed. Per Damon's new direction, leave those two markers range-free (no logic rules for them). PSA is a new marker to add.

#### Female hormones
- Free Testosterone (Female): **track only, no thresholds/ranges**
- Total Testosterone (Female): **track only, no thresholds/ranges**
- Estradiol (Female): **track only, no thresholds/ranges**
- (All female hormone markers are open-ended — for personal tracking + educational video links)

#### Hormone Panel — separate section ✅ RESOLVED
- Hormone markers appear in a **separate Hormone Panel section** (not alongside blood work in the main Labs section)
- Male vs. Female hormone panels are **separate views** (shown based on user's sex)
- Not used for insurance/employer risk assessment — personal tracking + educational content only
- Link/tag hormone markers to Men's Health and Women's Health educational videos

**HIPAA:** Hormone markers are PHI. Never exposed in employer views, broker views, or any export.

---

### League / Cross-Org Competition — ✅ RESOLVED

| Question | Answer |
|----------|--------|
| Ranking method | **% of members hitting healthy ranges** (not average BHAS score) |
| Who can see the leaderboard | **Everyone** — visible to all users to encourage competition |
| Challenge duration | **9 months** |
| Challenge opt-in | NHL admin creates it |
| Lab cadence for challenges | Labs at **0 months and 6 months** (out-of-range members) |
| Opt-in model | Not specified — assume NHL admin creates and assigns orgs |

---

### Broker Role — ✅ RESOLVED

| Capability | Broker | Org Admin |
|-----------|--------|-----------|
| Manage multiple orgs | ✅ Yes | ❌ No (single org) |
| Access reports/exports | ✅ Yes | ✅ Yes (own org only) |
| Edit reference material | ❌ No | ❌ No |
| Edit supplement/affiliate links | ❌ No | ❌ No |

Brokers **cannot** edit reference material or any supplement/affiliate marketing links.

---

### Virtual Provider Links — ✅ RESOLVED

| Question | Answer |
|----------|--------|
| Who adds links | Flexible — NHL admin OR org admins (when app is licensed, org admins get control) |
| Shown to | All members |
| Bio display | Brief bio visible on main screen; click to expand full bio + details |
| Location/filtering | Future: dropdown by state. For now: **org-specific** |

**Decision (Email Exchange 6):** Each organization has its own provider list. State dropdown is a future enhancement. Damon is working on contracts with a national telehealth provider to integrate later.

---

### Health Assessment — ✅ RESOLVED (cadence still TBD)

| Input | Question copy | Format |
|-------|--------------|--------|
| Sleep | "Do you get 7–9 hours of sleep most nights?" | Yes / No |
| Stress | "Is your stress generally manageable day to day?" | Yes / No |
| Exercise | "Do you exercise at least 150 minutes per week? Is your job sedentary?" | Yes / No |
| Alcohol | "Do you drink more than one alcoholic beverage daily?" | Yes / No |
| Smoking | "Do you currently smoke or use tobacco?" | Yes / No |
| Diet | "Do 80% or more of your meals come from whole or minimally processed foods? (e.g., vegetables, fruits, legumes, whole grains, lean proteins, nuts)" | Yes / No |
| Symptoms | Yes / No checklist (12 items — see Email Exchange 3) | Yes / No |

**BHAS impact:** Tracked separately — does NOT affect BHAS scoring.

**[Q still open]** Assessment cadence — signup only, quarterly, or with every lab entry? (Not yet answered by Damon.)

---

---

## Email Exchange 6 — CPT Codes, Lab Trigger Messages, Org Join, New Features (2026-04-29)

### CPT Codes per Lab Marker — NEW

Damon wants CPT codes tied to each scored marker and displayed in the app.

| Metric | CPT Code(s) |
|--------|------------|
| HOMA-IR | 83525 (Fasting Insulin) + 82947 (Fasting Glucose) |
| TG/HDL Ratio | 84478 (Triglycerides) + 83718 (HDL) |
| hs-CRP | 86141 |
| Vitamin D | 82652 |
| Vitamin B12 | 82607 |
| Advanced Care Planning | 99497 (provider-input only — 30-min discussion) |

**Status:** ❌ Not built — add CPT code field to `lab_markers` table and display in Labs UI.

---

### Lab Result Trigger Messages — NEW ⭐ HIGH PRIORITY

After a user enters metrics or uploads labs, show contextual messages based on values. Fully spec'd by Damon:

#### 1. Insulin Resistance (HOMA-IR)
- ⚠️ **2.0–2.5:** "Your insulin sensitivity is starting to decline..." + action steps (protein with meals, reduce processed carbs, walk after meals, 7–8 hrs sleep)
- 🔴 **>2.5:** "Your results suggest reduced insulin sensitivity..." + action steps (structured nutrition, resistance training 3x/week, time-restricted eating) + escalation: "We recommend reviewing these results with a healthcare provider."

#### 2. Inflammation (hs-CRP)
- ⚠️ **1–3:** "Your inflammation markers are slightly elevated..." + action steps (sleep, omega-3, reduce processed foods/alcohol)
- 🔴 **>3:** "Your inflammation level is elevated..." + action steps (whole-food nutrition, sleep/stress, daily movement) + escalation: "A follow-up with a healthcare provider is recommended."

#### 3. Vitamin D
- ⚠️ **20–50:** "Your Vitamin D level is below optimal..." + action steps (sun exposure, supplementation, Vit D foods)
- 🔴 **<20:** "Your Vitamin D level is low..." + action steps (supplementation with guidance, recheck) + escalation: "We recommend reviewing this with a provider."

#### 4. Vitamin B12
- ⚠️ **300–500:** "Your B12 level is in a lower range..." + action steps (B12-rich foods, supplementation)
- 🔴 **<300:** "Your B12 level is low..." + action steps (targeted supplementation, re-evaluate) + escalation: "A provider can help determine the best approach."

#### 5. Triglycerides
- ⚠️ **100–199:** "Your triglycerides are slightly elevated..." + action steps (reduce sugar/alcohol, increase activity, meal timing)
- 🔴 **≥200:** "Your triglyceride levels are elevated..." + action steps (whole-food nutrition, exercise, weight management) + escalation: "We recommend reviewing this with a healthcare provider."

#### 6. HDL (Good Cholesterol)
- ⚠️ **Low (Men <40, Women <50):** "Your HDL is lower than optimal..." + action steps (physical activity, healthy fats, sleep/stress)

#### 7. Combined Metabolic Alert
- 🔴 **Trigger: HOMA-IR >2 AND TG/HDL >3 AND hs-CRP >3 simultaneously**
- Message: "Multiple markers suggest your metabolic health may need attention..." + action steps (structured lifestyle plan, nutrition/sleep/movement, track improvements) + escalation: "We recommend a comprehensive review with a healthcare provider."

#### Positive Reinforcement (all markers optimal)
- ✅ "Great job. Your results are in an optimal range. Maintaining these levels supports long-term health, energy, and performance." + "Keep doing what you're doing" + "You're building long-term health resilience"

**HIPAA:** Messages shown only to the user themselves. Never logged, never in employer views.
**Status:** ❌ Not built.

---

### Org Join via Invite Code — NEW ⭐

**Decision (Email Exchange 6):** Option A — fully anonymous.
- Employee enters a private invite code → joins org as their username only
- Org admin never sees who joined by real name or email
- Future: if employer wants to reward employees for hitting metrics, this would go through a third-party payroll administrator (outside the app)

**Status:** ❌ Not built. Need to add `invite_code` to `organizations` table, generate codes in Admin, and let users enter code on Profile or signup.

---

### HSA Reimbursement Pre-filled Form — NEW

Damon wants a downloadable pre-filled form for gym memberships / exercise equipment reimbursement. Form should have checkboxes for qualifying conditions: insulin resistance, metabolic syndrome, family history of cardiac disease, anxiety/depression.

**Status:** ❌ Not built. Damon said he sent a pre-made form — need to locate it and build a download/display page.

**[Q]** Can you re-send the pre-made HSA form you mentioned? We'll use it as the template.

---

### Monthly Educational Email — NEW

10 topics (Damon to provide wording for each):
A) B vitamin deficiency  
B) Holistic approach to acute illness  
C) Metabolic health  
D) Diet and exercise  
E) Vitamin D deficiency (send in October, pre-winter)  
F) Hormone health — Male/Female (send to new accounts on signup)  
G) Sleep  
H) Stress control  
I) Detox  
J) Inflammation  
+ 2 more topics TBD

**Status:** ❌ Not built. Blocked on Damon providing email copy. Likely requires an email service integration (Resend, SendGrid, etc.).

**[Q]** Please send the wording for each email topic when ready. Also: what email service do you use or want to use for outbound emails?

---

### Employer Invoice PDF — REVISITED

Damon now says this may be important for lab reimbursement with his first company. Status changed from deprioritized → **needs confirmation**.

**[Q]** Do you need the employer invoice PDF now for your first company? If yes, what fields should it include?

---

## Summary — Pending Decisions

| Item | Status | Notes |
|------|--------|-------|
| Supplements tab | ✅ Done | Built 2026-04-07 |
| BHAS v2.3 scoring updates | ✅ Done | Built 2026-04-07 |
| HOMA-IR thresholds (0–2.5 / >2.5) | ✅ Done | Migration run 2026-04-07 |
| HOMA-IR reference link | ❌ Not built | Add educational link on Labs/Dashboard |
| Male hormone markers (PSA, Free T, Total T — track only) | ✅ Done | Migration run 2026-04-16 |
| Female hormone markers (track only, no ranges) | ✅ Done | Migration run 2026-04-16 |
| Hormone Panel UI (separate Male/Female section in Labs) | ❌ Not built | Separate section, not with blood work |
| EOB / acute visits field | ✅ Done | `acute_visits` on profile |
| League leaderboard | ✅ Done | Built 2026-04-16, browser-tested 2026-04-28 |
| Broker role | ✅ Done | Built 2026-04-16, browser-tested 2026-04-28 |
| Virtual providers (global list) | ✅ Done | Built 2026-04-16, browser-tested 2026-04-28 |
| Virtual providers — org-specific lists | ❌ Not built | Currently one global list; needs to be per-org |
| F66 Challenge UI | ❌ Not built | DB done; UI pending |
| **F67 Health Assessment** | ❌ Not built | All questions answered except cadence. Ready to build. |
| **Lab result trigger messages** | ❌ Not built | Fully spec'd (Email Exchange 6). High priority. |
| **CPT codes on lab markers** | ❌ Not built | 6 markers × CPT code. Add to DB + Labs UI. |
| **Org join via invite code** | ❌ Not built | Option A (anonymous). Add invite_code to organizations. |
| **HSA reimbursement pre-filled form** | ❌ Not built | Blocked — need Damon to re-send the form template. |
| Monthly educational email | ❌ Not built | Blocked — need Damon's email copy + email service decision. |
| Employer invoice PDF | ❓ Needs confirmation | Damon said "might need" for first company — confirm yes/no. |
| Tax code compliance (§105/§125/§213) | Deprioritized | Free app pivot — lower priority. |
| Payment processing | ❌ Dropped | Free app pivot. |
| HSA bank integration | ❌ Dropped | Free app pivot. |
| Domain migration | Not yet | Awaiting deployment decision. |
| Assessment cadence | **[Q] Still open** | Signup only, quarterly, or every lab entry? |
| Monthly email wording | **[Q] Still open** | Damon to provide copy for 10+ topics. |
| HSA form template | **[Q] Still open** | Damon to re-send the pre-made form. |
| Employer invoice PDF confirmation | **[Q] Still open** | Do you need this now for your first company? |
