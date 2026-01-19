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
- Client-only tag mapping (no lab numbers saved).
- Supabase wiring for live data (read-only in this flow).
- Playwright smoke test and CI schema validator (already added).

What I need from you (short)
- Supabase `anon` key + URL if you want live integration (best next step). 
- Logo/brand color if you want the UI styled.

Next (I recommend)
- Provide `DATABASE_URL` as a GitHub secret so CI can run the DB validator.
- Tell me if you want me to deploy a demo site (I can set that up).
