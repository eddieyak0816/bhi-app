-- Migration: allow reading the tags table
--
-- `tags` had RLS enabled but ZERO policies, so nothing could read it — not even a
-- signed-in member. logic_rules and lab_markers both already had
-- "Enable read access for all users"; tags had simply been missed.
--
-- Symptom this caused: EvaluationContext loads tags to build the tag -> scoring_tier
-- map. That fetch is deliberately best-effort ("non-fatal if it fails"), so it failed
-- silently and the map came back empty. v1 never noticed because tagToScore() falls
-- back to its hardcoded OPTIMAL_TAGS / IMPROVEMENT_TAGS sets. v2.3 did notice: with no
-- tier available it fell back to the spec cutoffs, so a Vitamin B12 of 600 scored 0 and
-- rendered an X on Home even though Damon's Admin range says 500-900 is Optimal.
--
-- Contains no PHI — tag names and their scoring tier only (e.g. Adequate_B12 -> optimal).
-- The same tag names are already readable via logic_rules.tag_to_apply.
--
-- Already applied by hand in Supabase on 2026-09-15; recorded here so a rebuilt
-- environment doesn't reintroduce the bug. Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tags' AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON tags
      FOR SELECT TO public USING (true);
  END IF;
END $$;
