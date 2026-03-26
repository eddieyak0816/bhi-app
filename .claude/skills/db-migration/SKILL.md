---
name: db-migration
description: Workflow for creating a new Supabase DB migration in BHI
---

When creating a new DB migration:

1. Create file: `db/migrations/YYYYMMDD_description.sql`
2. Use `WHERE NOT EXISTS` for idempotent inserts (no unique constraint on logic_rules)
3. Add the migration to the run order list in `MEMORY.md`
4. Remind user: run it in **Supabase Dashboard → SQL Editor** (not CLI)
5. After confirming it ran, mark it ✅ in MEMORY.md

Key DB facts to remember:
- Tags use underscore format: `Normal_Glucose`, `Adequate_VitD`
- `logic_rules` operator column: between, <, >, =, <=, >=  (default: 'between')
- Glucose marker name: "Fasting Glucose" (not "Blood Glucose")
