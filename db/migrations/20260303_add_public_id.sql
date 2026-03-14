-- Migration: add public_id (de-identified token) to profiles table
-- This is the only identifier ever shown publicly alongside health data.
-- Real name is never exposed. Token format: BHI-XXXX-XXXX (8 random alphanumeric chars).

alter table profiles add column if not exists public_id text unique;

-- Backfill existing rows with a generated token.
-- Uses Postgres random string from md5+clock. Format: BHI-XXXX-XXXX
update profiles
set public_id = 'BHI-' ||
  upper(substring(md5(random()::text || id::text) from 1 for 4)) || '-' ||
  upper(substring(md5(random()::text || id::text) from 5 for 4))
where public_id is null;

-- Make non-nullable now that all rows have a value
alter table profiles alter column public_id set not null;
