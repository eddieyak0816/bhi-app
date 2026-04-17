-- Migration: Add acute_care_visits column to profiles table
-- Implements EOB field (tie-breaker #3 in BHAS v2.3 leaderboard ranking)
--
-- Per BHAS v2.3 spec: tie-breaker #3 = acute care visits + medical claims count.
-- Already wired in src/utils/bhasV2.ts as acuteVisits — this migration provides
-- the DB storage so ProfilePage can write and EvaluationContext can read it.
--
-- Column: acute_care_visits INTEGER DEFAULT 0
-- UI: numeric input on ProfilePage (Biometrics section)
-- Leaderboard: lower is better (fewer acute visits = healthier tie-breaker)
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS acute_visits INTEGER DEFAULT 0;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'acute_visits';
