-- Migration: Fix hormone markers per Email Exchange 4 (2026-04-12)
--
-- Changes vs 20260412_add_male_hormone_markers.sql:
--   1. Remove logic rules for Free Testosterone (Male) and Total Testosterone (Male)
--      — Damon confirmed track-only, no thresholds, no ranges
--   2. Keep Estrogen (Male) rules as-is (unchanged)
--   3. Add PSA (Prostate-Specific Antigen): Normal 0–4 ng/mL, High > 4 ng/mL
--      Tracked only, NOT scored. Tag scoring_tier = NULL.
--   4. Add female hormone markers (all track-only, no thresholds):
--      Free Testosterone (Female), Total Testosterone (Female), Estradiol (Female)
--
-- HIPAA: none of these markers appear in employer views, broker views, or exports.
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

DO $$
DECLARE
  free_t_m_id   UUID;
  total_t_m_id  UUID;
  psa_id        UUID;
  free_t_f_id   UUID;
  total_t_f_id  UUID;
  estradiol_id  UUID;
BEGIN

  -- ─── 1. Remove incorrect logic rules for Free T (Male) and Total T (Male) ──
  --        These were added by 20260412_add_male_hormone_markers.sql in error.

  SELECT id INTO free_t_m_id  FROM lab_markers WHERE name = 'Free Testosterone (Male)'  LIMIT 1;
  SELECT id INTO total_t_m_id FROM lab_markers WHERE name = 'Total Testosterone (Male)' LIMIT 1;

  IF free_t_m_id IS NOT NULL THEN
    DELETE FROM logic_rules WHERE marker_id = free_t_m_id;
  END IF;

  IF total_t_m_id IS NOT NULL THEN
    DELETE FROM logic_rules WHERE marker_id = total_t_m_id;
  END IF;

  -- Also clear the min_normal / max_normal columns — these are track-only, open-ended
  UPDATE lab_markers SET min_normal = NULL, max_normal = NULL
  WHERE name IN ('Free Testosterone (Male)', 'Total Testosterone (Male)');

  -- ─── 2. Add PSA (Prostate-Specific Antigen) ─────────────────────────────────

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('PSA (Prostate-Specific Antigen)', 'ng/mL', 0, 4)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO psa_id FROM lab_markers WHERE name = 'PSA (Prostate-Specific Antigen)' LIMIT 1;

  -- Tags
  INSERT INTO tags (name, scoring_tier) VALUES ('Normal_PSA', NULL) ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('High_PSA',   NULL) ON CONFLICT (name) DO NOTHING;

  -- Logic rules
  -- Normal: 0–4
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT psa_id, 0, 4, 'between', 'Normal_PSA'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = psa_id AND tag_to_apply = 'Normal_PSA'
  );

  -- High: > 4
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT psa_id, 4.001, 9999, 'between', 'High_PSA'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = psa_id AND tag_to_apply = 'High_PSA'
  );

  -- Category mapping
  INSERT INTO tag_categories (tag_name, category_id)
  SELECT t.name, c.id
  FROM tags t CROSS JOIN categories c
  WHERE t.name IN ('Normal_PSA', 'High_PSA') AND c.name = 'Hormone Health'
  ON CONFLICT DO NOTHING;

  -- ─── 3. Add female hormone markers (track-only, no logic rules) ──────────────

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Free Testosterone (Female)', 'pg/mL', NULL, NULL)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Total Testosterone (Female)', 'ng/dL', NULL, NULL)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Estradiol (Female)', 'pg/mL', NULL, NULL)
  ON CONFLICT (name) DO NOTHING;

  -- No logic rules for female hormones — track only per Damon (Email Exchange 4)

  RAISE NOTICE 'Hormone marker corrections applied: Free T (M) + Total T (M) rules removed, PSA added, female markers added.';
END $$;

-- Verify
SELECT lm.name AS marker, lm.unit, lm.min_normal, lm.max_normal,
       COUNT(lr.id) AS rule_count
FROM lab_markers lm
LEFT JOIN logic_rules lr ON lr.marker_id = lm.id
WHERE lm.name IN (
  'Free Testosterone (Male)',
  'Total Testosterone (Male)',
  'Estrogen (Male)',
  'PSA (Prostate-Specific Antigen)',
  'Free Testosterone (Female)',
  'Total Testosterone (Female)',
  'Estradiol (Female)'
)
GROUP BY lm.name, lm.unit, lm.min_normal, lm.max_normal
ORDER BY lm.name;
