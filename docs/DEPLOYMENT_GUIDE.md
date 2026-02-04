# BHI App - Deployment Guide

**How to Access and Run the App Online**

---

## Quick Start - Access Live App

The app is already deployed and live online. **No setup required!**

### Frontend (User-Facing App)
Visit: **https://gleaming-praline-ba5b42.netlify.app/**

### Backend API
Endpoint: **https://bhi-app-backend.onrender.com**

### Database
Supabase PostgreSQL (hosted)

---

## Current Deployment Status

| Component | Status | Provider | URL |
|-----------|--------|----------|-----|
| **Frontend** | ✅ Live | Netlify | https://gleaming-praline-ba5b42.netlify.app/ |
| **Backend** | ✅ Live | Render | https://bhi-app-backend.onrender.com |
| **Database** | ✅ Live | Supabase | PostgreSQL (authenticated) |
| **Auto-Deploy** | ✅ Enabled | GitHub | Pushes to `main` branch auto-deploy |

---

## How the App Works Online

### Architecture Overview

```
User Browser
    ↓
Frontend (Netlify) — https://gleaming-praline-ba5b42.netlify.app/
    ↓
Backend API (Render) — https://bhi-app-backend.onrender.com
    ↓
Database (Supabase) — PostgreSQL
```

### User Flow

1. **Visit the site** → https://gleaming-praline-ba5b42.netlify.app/
2. **Create account or login** → Supabase authentication
3. **Browse resources** → Fetched from Supabase database
4. **Enter lab results** → Saved in Supabase (optional)
5. **Use admin features** → Backend API handles resource management

---

## CRITICAL: Database Setup Required

⚠️ **IMPORTANT:** Before users can fully use the app, you must run the database migrations.

### Missing Tables

The following tables are missing from Supabase and need to be created:
- `categories` (for resource categorization)
- `health_goals` (for user health goal preferences)

**Impact:** These pages will show "Loading..." until tables are created:
- Resources tab (entire page)
- Profile → Health Goals section
- Profile → Preferred Resource Types section
- Admin → Categories tab
- Admin → Health Goals tab

### How to Fix (5 Minutes)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com
   - Log in to your project
   - Select your BHI App project

2. **Open SQL Editor**
   - Click **"SQL Editor"** in left sidebar
   - Click **"New Query"**

3. **Run First Migration: Categories Table**
   - Copy content from: `db/migrations/20260128_create_categories_table.sql`
   - Paste into SQL editor
   - Click **"Run"**
   - Wait for success message

4. **Run Second Migration: Health Goals Table**
   - Copy content from: `db/migrations/20260128_create_health_goals_table_v2.sql`
   - Paste into SQL editor
   - Click **"Run"**
   - Wait for success message

5. **Verify**
   - Refresh the app in your browser
   - Resources page should now load
   - Profile sections should show options
   - Admin tabs should display data

---

## Making Updates to the App

When you make code changes, they auto-deploy to the live site within minutes.

### Deployment Workflow

1. **Make code changes locally**
   ```bash
   npm run dev  # Test locally first
   ```

2. **Commit and push to GitHub**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

3. **Netlify auto-deploys**
   - GitHub webhook triggers Netlify build
   - `npm run build` runs automatically
   - New version deploys to https://gleaming-praline-ba5b42.netlify.app/
   - Takes ~2-3 minutes

4. **Render auto-deploys backend**
   - Render watches your GitHub repo
   - Rebuilds when `main` branch changes
   - New version available at https://bhi-app-backend.onrender.com

### Check Deployment Status

**Netlify:**
- Visit: https://app.netlify.com
- Click your site to see build history

**Render:**
- Visit: https://dashboard.render.com
- Click your backend service to see deployment logs

---

## Environment Variables

### Frontend Environment (.env)
Located in repo root:
```
VITE_SUPABASE_URL=https://fgduvnmsvkhrhcxykkyc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_BACKEND_URL=https://bhi-app-backend.onrender.com
VITE_BACKEND_API_KEY=sb_secret_...
```

### Backend Environment (Render)
Set in Render dashboard:
```
VITE_SUPABASE_URL=https://fgduvnmsvkhrhcxykkyc.supabase.co
VITE_SUPABASE_KEY=eyJhbGci...
BACKEND_API_KEY=sb_secret_...
SUPABASE_SERVICE_ROLE=eyJhbGci...
NODE_ENV=production
```

---

## Troubleshooting

### "Blank White Page"
**Cause:** Assets loading from wrong path (vite.config.ts base path)
**Solution:** Ensure `vite.config.ts` has `base: '/'` (not `/bhi-app/`)

### "Loading..." on Resources/Profile/Admin Pages
**Cause:** Database tables missing
**Solution:** Run migrations (see "Database Setup Required" section above)

### "Backend not responding"
**Cause:** Render server may be sleeping
**Solution:**
- Visit https://bhi-app-backend.onrender.com to wake it up
- Check Render dashboard for errors
- Verify environment variables are set correctly

### "Can't create account"
**Cause:** Supabase auth not configured
**Solution:**
- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
- Verify these are set in Netlify environment variables
- Check Supabase dashboard for service health

---

## Local Development vs. Live Deployment

| Task | Local (localhost:3000) | Live (Netlify) |
|------|-----------|------|
| **Development** | `npm run dev` | Push to GitHub main branch |
| **Testing** | http://localhost:3000 | https://gleaming-praline-ba5b42.netlify.app/ |
| **Database** | Supabase (same as live) | Supabase (same as local) |
| **Backend** | localhost:4242 OR Render | https://bhi-app-backend.onrender.com |
| **Hot reload** | ✅ Yes | ❌ No, need to push to redeploy |

---

## Common Tasks

### Deploy a new feature
```bash
git add src/
git commit -m "feat: Add new feature"
git push origin main
# Wait 2-3 minutes for Netlify to deploy
# Visit https://gleaming-praline-ba5b42.netlify.app/ to see changes
```

### Test backend changes locally
```bash
npm run dev:server
# Backend runs on http://localhost:4242
# Frontend still connects to Render backend
# Or change VITE_BACKEND_URL=http://localhost:4242 in .env.local
```

### Check deployment logs
- **Netlify:** https://app.netlify.com → Deployments tab
- **Render:** https://dashboard.render.com → Logs tab

### Rollback a bad deployment
```bash
git revert HEAD
git push origin main
# Netlify automatically rebuilds with previous commit
```

---

## Security Notes

⚠️ **IMPORTANT:** Never commit these to GitHub:
- `.env` files (they contain secrets)
- `SUPABASE_SERVICE_ROLE` key
- `BACKEND_API_KEY` values
- Database credentials

These should only be stored in:
- **Local:** `.env` file (in .gitignore)
- **Netlify:** Environment variables → Build & deploy → Environment
- **Render:** Environment tab in dashboard

---

## Getting Help

- **Live app:** https://gleaming-praline-ba5b42.netlify.app/
- **Code repo:** https://github.com/eddieyak0816/bhi-app
- **Documentation:** See README.md, DEVELOPER_STATUS.md
- **Architecture:** See PROJECT_SCOPE.md
- **Strategic recommendations:** See IMPROVEMENT_ROADMAP.md

---

## Quick Reference

| What | Where | How |
|------|-------|-----|
| **Use the app** | https://gleaming-praline-ba5b42.netlify.app/ | Open in browser, create account |
| **Deploy changes** | GitHub main branch | `git push origin main` |
| **Check deployment** | Netlify dashboard | https://app.netlify.com |
| **View logs** | Render dashboard | https://dashboard.render.com |
| **Configure secrets** | Netlify/Render | Go to environment variables |
| **Fix loading pages** | Supabase SQL Editor | Run migrations (see guide above) |
| **View database** | Supabase dashboard | https://supabase.com |
