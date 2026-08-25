# Usman — Developer Tasks

Client: **Damon DiLorenzo** (Balanced Health Institute / National Health League). Eddie was the previous developer.

Detailed technical notes for everything below (root causes, exact code changes) are kept in `DEVELOPER_REQUIREMENTS.md`, `CHANGELOG.md`, and `IMPLEMENTATION_TRACKER.html` — this doc is the simple day-to-day tracker.

Last updated: 2026-08-19

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

## ❌ NOT DONE — needs building

25. **Hormone Labs category on dashboard/home page** — Damon's original ask was for this to live as its own main category, not just inside the metrics panel — worth confirming with him whether #24 above satisfies this or if he still wants a separate dashboard category too
26. **Sex-based content filtering** — the Male/Female tags now exist (#23), but nothing in the app actually uses them yet to filter what a user sees. Still an open question whether Damon wants this built now or was satisfied with just having the tags available.
27. **Newsletter editor** — build ability to create/edit newsletters in-app (2 mockups provided)
28. **Visual redesign** — modern/colorful look, references given (fuzati.com, gold/maroon or red-white-blue)
29. **Profile save error (`42501` database permission error)** — reported by Damon, could not reproduce yet, needs more specific steps from him
30. **Multi-org providers** — let one provider be linked to several organizations, not just one (currently one-or-global only)
31. **"Customize lab draw for organizations"** — unclear what this means exactly, needs a question to Damon

## ❓ QUESTIONS — waiting on Damon's answer, not started

32. Does the "NHL" trademark issue also apply to "NHLS" (the score name)? Big job if yes (40+ locations)
33. Should existing users' ID codes (`NHL-XXXX-XXXX`) be changed too, or just new signups going forward?
34. Are the NHLS score's 8 metrics allowed to become admin-editable (add/remove things like Ferritin, Insulin)? Currently hardcoded — real feature if he wants it
35. All older open questions already logged in `CLIENT_FEEDBACK.md` (leaderboard ranking, org hierarchy depth, Broker role permissions, Challenge rules)

## 📣 MESSAGES TO SEND DAMON — not code, just tell him

36. His provider's "Headshot" field has his website link pasted in, not an actual photo — needs a real image link
37. Remind him to re-save that same provider entry once fixed, so all the URL fixes apply to it

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
