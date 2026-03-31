-- F51 — 1-year lab data retention policy
--
-- Deletes user_lab_results rows where the lab date is older than 1 year.
-- Scheduled via pg_cron to run nightly at 02:00 UTC.
--
-- Prerequisites:
--   1. pg_cron extension must be enabled in Supabase:
--      Dashboard → Database → Extensions → search "pg_cron" → Enable
--   2. Run this script in Supabase Dashboard → SQL Editor
--
-- Idempotent: uses cron.unschedule() before re-scheduling so re-running
-- this script does not create duplicate jobs.

-- Step 1: Enable pg_cron (safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 2: Remove any existing job with this name (idempotent)
SELECT cron.unschedule('nhl-lab-retention-1yr')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'nhl-lab-retention-1yr'
);

-- Step 3: Schedule the nightly purge at 02:00 UTC
-- Deletes rows where the recorded lab `date` column is older than 365 days.
-- Uses the `date` column (the date the lab was taken) rather than created_at
-- so that old labs entered recently are also subject to the policy.
SELECT cron.schedule(
  'nhl-lab-retention-1yr',          -- job name
  '0 2 * * *',                      -- cron: nightly at 02:00 UTC
  $$
    DELETE FROM user_lab_results
    WHERE date < (CURRENT_DATE - INTERVAL '1 year');
  $$
);

-- Step 4: Verify the job was created
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'nhl-lab-retention-1yr';
