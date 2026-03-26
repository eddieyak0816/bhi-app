---
name: supabase-rls
description: Guide for writing correct Supabase RLS policies for BHI
---

RLS rules for this project:

- Authenticated users: SELECT/INSERT/UPDATE their own rows using `auth.uid() = user_id`
- Public tables (e.g. resources): public SELECT, authenticated INSERT
- PHI rule — employer-visible queries must NEVER expose: name, email, raw lab values
  - Employer views only show: username, public_id, team, BHAS %
- Always test policies with both anon role and authenticated role
- `resource-thumbnails` bucket: public SELECT, authenticated INSERT
