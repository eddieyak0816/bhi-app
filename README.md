Balanced Health Institute — MVP (plain language)

Quick: this repo contains a small web app that shows trusted health learning resources based on a lab test name + number. It does NOT give medical advice and it does NOT save your lab numbers.

How to run (short)
1. Copy `.env.example` → `.env` and add your Supabase keys (optional). If you don't add keys the app will use local sample data.
2. npm install
3. npm run dev
4. Open http://localhost:3000

To load sample data into a Supabase project (optional)
- Set `DATABASE_URL` then run: `npm run seed:db`

What I built (short)
- React + Vite frontend (stateless lab input). 
- Client-only tag mapping (no lab numbers saved by default).
- Supabase wiring for live data (read-only in this flow).
- Opt-in storage scaffold for user lab values (disabled by default; backend + RLS required to enable).
- Playwright smoke test and CI schema validator (already added).

What I need from you (short)
- Supabase `anon` key + URL if you want live integration (best next step). 
- Logo/brand color if you want the UI styled.

Next (I recommend)
- Provide `DATABASE_URL` as a GitHub secret so CI can run the DB validator.
- To enable opt-in storage: add these secrets to GitHub (do NOT paste them here):
  - `BACKEND_API_KEY` (short secret for the frontend to call the server in dev)
  - `SUPABASE_SERVICE_ROLE` (server-only; never expose to browser)
- Run the backend locally for testing: `BACKEND_API_KEY=foo SUPABASE_SERVICE_ROLE=<service_role> VITE_SUPABASE_URL=<url> npm run dev:server`

- Dev-only: to inspect recent opt-in saves locally, set `ENABLE_DEV_ENDPOINT=true` in `.env.server` and restart the backend; then call `GET /api/dev/user-lab-values` with the header `x-backend-api-key: foo`.

- Tell me if you want me to deploy a demo site (I can set that up).
