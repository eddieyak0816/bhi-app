# Usman — Developer Tasks

Client: **Damon DiLorenzo** (Balanced Health Institute / National Health League). Eddie was the previous developer.

Detailed technical notes for everything below (root causes, exact code changes) are kept in `DEVELOPER_REQUIREMENTS.md`, `CHANGELOG.md`, and `IMPLEMENTATION_TRACKER.html` — this doc is the simple day-to-day tracker.

Last updated: 2026-09-15

---

## ✅ DONE

1. Fixed "NHL" text → "National Health League" (login, header, signup, reports)
2. Fixed mobile header — was broken/squeezed, now has a working hamburger menu
3. Fixed broken CI check file (bad YAML)
4. Fixed Admin panel completely broken (wrong database key)
5. Fixed Admin panel unusable on mobile (fields cut off / overflowing)
6. Fixed provider "Book/Connect" link going to a broken page (also fixed the general "provider URL not saving" complaint — same bug)
7. Fixed image upload stuck loading forever in Resources
8. Fixed uploaded image disappearing when re-editing a resource
9. Built self-service nav menu links — Damon can now add/edit/remove nav dropdown links and even whole new menus himself, no developer needed
10. Fixed Health Check-In stuck on "Loading..." forever
11. Fixed Health Check-In feeling slow to save
12. Renamed "Advanced Care Planning" → "Advance Care Plan" (3 spots)
13. Fixed resources loading slowly after entering lab values
14. Confirmed: Categories page image upload was never built (not a bug — flag to Damon, don't build without his OK)
15. Confirmed: Virtual Providers not showing was correct behavior (org-scoped), not a bug
16. Fixed signup getting stuck on "Creating account..." forever when signing up with an org invite code
17. Fixed new org members not actually joining the organization when signing up with a code (was silently failing before)
18. Signup email confirmation link fixed — Damon updated the Supabase Site URL setting himself (was pointing to localhost)
19. Signup email rate limit fixed — Damon connected a real email provider in Supabase (was using the default testing-only sender)
20. Fixed blank white screen when a signup/login email link fails (expired/invalid) — now shows a real "Link expired" message instead
21. Fixed "Recently Viewed" and "Bookmarked Resources" on Home — were both fake/hardcoded (same 3 resources and "2" for every single user, regardless of what they'd actually done). Now tracks real personal activity.
22. Added a real "Your Bookmarked Resources" list on Home showing actual bookmarked titles (didn't exist before — the bookmark count had nothing to click through to)
23. Added Male/Female as real tags — available in Admin → Tags, can be applied to any resource
24. Built "Log Your Hormones" section under "Log Your NHLS Metrics" — auto-pulls whichever hormone markers exist in Admin, shows only the ones matching the user's sex, confirmed tested on both a Male and Female account showing genuinely different fields, confirmed does NOT affect the NHLS score
25. Built multi-org providers — one provider can now be linked to several organizations at once (checklist in Admin), not just one-or-global like before. Confirmed tested: checked 2+ orgs, saved, reopened, both stayed checked.
26. Marking a marker "NHLS Score" in Admin now actually shows it in "Log Your NHLS Metrics" on Home — previously that dropdown had no effect there (the 8 fields were hardcoded). Extra markers appear under "Additional NHLS Markers" and save to lab history. The v2.3 score formula itself is unchanged, so a note makes clear those extras are tracked, not scored. Confirmed tested with Ferritin.
27. Confirmed NOT a bug: provider photo not showing. The URL had been saved as `https://=https://img1.wsimg.com/...` — `https://` typed manually on top of a pasted URL that already had it, plus a stray `=`. Code behaved correctly; Damon just needs to paste the link on its own.

## ⚠️ BUILT THEN REVERTED — 2026-09-15

27b. **Admin score thresholds** — built and deployed, then reverted the same day (620e2c7). The NHLS v2.3 cutoffs in `bhasV2.ts` are hardcoded, so a new table + Admin tab were added to make them editable. Wrong fix: Admin -> Markers -> Edit -> Scoring Rules already stores Optimal/Improvement/Out of Range per marker in `logic_rules` (Criteria tab is a second view onto the same table), and `tagToScore()` already reads it DB-first. Damon's tier data is already entered and complete.
  - **Real bug, still open:** `bhasV2.ts` reads none of it — it's a standalone engine with its own hardcoded numbers. That's why B12 600 shows an X while the rest of the app treats it as fine.
  - **Blocked on Eddie:** HOMA-IR, TG/HDL and Waist-to-Height are derived ratios with no marker row, so `logic_rules` can't express them. Synthetic marker rows, or leave those three in code?
  - The unused `score_thresholds` table is still in Supabase — drop it once the replacement is agreed.

## ❌ NOT DONE — needs building

28. **Hormone Labs category on dashboard/home page** — Damon's original ask was for this to live as its own main category, not just inside the metrics panel. The categories themselves already exist in Admin; unclear whether he wants a dedicated section on Home too.
29. **Sex-based content filtering** — the Male/Female tags now exist (#23), but nothing in the app uses them yet to filter what a user sees. Damon did ask for this ("automatically assign ... content"), so it's buildable without further questions.
30. **Newsletter editor** — build ability to create/edit newsletters in-app (2 mockups provided)
31. **Visual redesign** — modern/colorful look, references given (fuzati.com, gold/maroon or red-white-blue)
32. **"Customize lab draw for organizations"** — likely means per-org lab sets (Initial / 3 Month / 6 Month are currently one shared global list with no org column), but ~80% confidence. Only remaining item that genuinely needs Damon to clarify.

## ❓ QUESTIONS — waiting on Damon's answer, not started

33. What exactly does "customize lab draw for organizations" mean? (see #32)
34. Does the "NHL" trademark issue also apply to "NHLS" (the score name)? Big job if yes (40+ locations)
35. Should existing users' ID codes (`NHL-XXXX-XXXX`) be changed too, or just new signups going forward?
36. Does he want the NHLS v2.3 score formula itself to become editable (add/remove scored metrics, change the 8-point total)? Separate from #26 — that only made markers *appear*; changing what's actually scored is a scoring-engine rebuild.
37. All older open questions already logged in `CLIENT_FEEDBACK.md` (leaderboard ranking, org hierarchy depth, Broker role permissions, Challenge rules)

## 📣 MESSAGES TO SEND DAMON — not code, just tell him

38. Provider photo: paste the image link on its own — don't type `https://` in front of it, the pasted URL already has it. Right-click image → "Copy image address" is the safest way.
39. Signup email confirmation is being turned off at his request — needs him to do it (Supabase → Authentication → Sign In / Providers → "Confirm email" → off), since Usman's Supabase role is only "Developer".

---

## Infra / access — status

- [x] GitHub, Supabase, Netlify, Render dashboard access — all working
- [x] Admin role inside the app — confirmed working
- [x] Supabase Site URL — fixed by Damon
- [x] Supabase email provider / rate limit — fixed by Damon
- [ ] Supabase **organization** role is still "Developer" — can't change critical settings if something like this comes up again. Worth asking Damon to upgrade at some point.
- [ ] `DATABASE_URL` GitHub secret needs switching to Supabase's Connection Pooler format (CI check still fails)
- [ ] Netlify doesn't always auto-deploy on push — sometimes needs a manual "Publish" click

## Design reference (Damon's newsletter mockups — files were deleted, described here so it's not lost)

- **Gold/maroon version:** cream background, maroon header, gold accents, shield+anchor+cross logo
- **Red/white/blue version:** same layout, patriotic colors
- Both: weekly single-topic format (started with Vitamin D), sections for range table, action steps, supplement spotlight, lab info, QR codes
