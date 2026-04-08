-- BHAS v2.3: Update HOMA-IR / Fasting Insulin logic rule thresholds
-- Old: Optimal < 5 (0–4.9), Improvement 5–9.9, Out of Range ≥ 10
-- New: Optimal 0–1.9, Improvement 2.0–2.9, Out of Range ≥ 3.0
--
-- Note: HOMA-IR is derived client-side (Insulin × Glucose / 405).
-- The v1 scoring engine proxies it via raw Fasting Insulin logic rules.
-- These rows are updated here so v1 and v2 stay consistent.
--
-- Run in Supabase Dashboard → SQL Editor

DO $$
DECLARE
  ins_id UUID;
BEGIN
  SELECT id INTO ins_id
  FROM lab_markers
  WHERE lower(name) = 'fasting insulin'
  LIMIT 1;

  IF ins_id IS NULL THEN
    RAISE EXCEPTION 'Fasting Insulin marker not found in lab_markers — aborting';
  END IF;

  -- Remove all existing Fasting Insulin rules and replace with updated thresholds
  DELETE FROM logic_rules WHERE marker_id = ins_id;

  -- Optimal: 0–1.9  (HOMA-IR proxy: < 2.0)
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (ins_id, 0, 1.9, 'between', 'Optimal_Insulin');

  -- Improvement: 2.0–2.9  (HOMA-IR proxy: 2.0–3.0)
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (ins_id, 2.0, 2.9, 'between', 'Acceptable_Insulin');

  -- Out of Range: ≥ 3.0
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (ins_id, 3.0, 9999, 'between', 'High_Insulin');

  RAISE NOTICE 'Fasting Insulin logic rules updated for BHAS v2.3';
END $$;

-- Verify
SELECT lr.id, lm.name AS marker_name, lr.operator, lr.min_value, lr.max_value, lr.tag_to_apply
FROM logic_rules lr
JOIN lab_markers lm ON lm.id = lr.marker_id
WHERE lower(lm.name) = 'fasting insulin'
ORDER BY lr.min_value;
