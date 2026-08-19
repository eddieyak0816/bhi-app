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

## ❌ NOT DONE — needs building

16. **Hormone Labs category** — display hormone lab markers (Testosterone, Estradiol, FSH, etc.) split by Male/Female. *(Data for this may already exist — check before starting.)*
17. **Sex-based content** — auto-show the right hormone content based on Profile's Male/Female selection
18. **Newsletter editor** — build ability to create/edit newsletters in-app (2 mockups provided)
19. **Visual redesign** — modern/colorful look, references given (fuzati.com, gold/maroon or red-white-blue)
20. **Profile save error (`42501` database permission error)** — reported by Damon, could not reproduce yet, needs more specific steps from him
21. **Multi-org providers** — let one provider be linked to several organizations, not just one (currently one-or-global only)
22. **"Customize lab draw for organizations"** — unclear what this means exactly, needs a question to Damon

## ⚠️ NOT DONE — needs Damon to take action (not us)

23. **Signup/login broken for new users** — found the cause: Supabase's "Site URL" setting still points to `localhost:3000` instead of the real live app address. Confirmed by reproducing it. **Cannot fix ourselves — Usman's Supabase role is "Developer," which can't edit this setting.** Needs Damon (or an Admin/Owner) to either make the change himself, or upgrade Usman's role.

## ❓ QUESTIONS — waiting on Damon's answer, not started

24. Does the "NHL" trademark issue also apply to "NHLS" (the score name)? Big job if yes (40+ locations)
25. Should existing users' ID codes (`NHL-XXXX-XXXX`) be changed too, or just new signups going forward?
26. Are the NHLS score's 8 metrics allowed to become admin-editable (add/remove things like Ferritin, Insulin)? Currently hardcoded — real feature if he wants it
27. All older open questions already logged in `CLIENT_FEEDBACK.md` (leaderboard ranking, org hierarchy depth, Broker role permissions, Challenge rules)

## 📣 MESSAGES TO SEND DAMON — not code, just tell him

28. His provider's "Headshot" field has his website link pasted in, not an actual photo — needs a real image link
29. Remind him to re-save that same provider entry once fixed, so all the URL fixes apply to it
30. Send him the Site URL fix instructions (item #23 above) so he can act on it

---

## Infra / access — status

- [x] GitHub, Supabase, Netlify, Render dashboard access — all working
- [x] Admin role inside the app — confirmed working
- [ ] Supabase **organization** role is "Developer" — can't change critical settings like Auth URLs (see #23). Ask Damon to upgrade if this comes up again.
- [ ] `DATABASE_URL` GitHub secret needs switching to Supabase's Connection Pooler format (CI check still fails)
- [ ] Netlify doesn't always auto-deploy on push — sometimes needs a manual "Publish" click

## Design reference (Damon's newsletter mockups — files were deleted, described here so it's not lost)

- **Gold/maroon version:** cream background, maroon header, gold accents, shield+anchor+cross logo
- **Red/white/blue version:** same layout, patriotic colors
- Both: weekly single-topic format (started with Vitamin D), sections for range table, action steps, supplement spotlight, lab info, QR codes
