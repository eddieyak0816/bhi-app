-- Migration: Add male hormone markers (tracked only, NOT scored)
-- Markers: Free Testosterone, Total Testosterone, Estrogen (male)
--
-- Per CLIENT_FEEDBACK.md Email Exchange 2:
--   Free Testosterone (male): optimal ≥ 100 pg/mL
--   Total Testosterone (male): low if < 500 ng/dL (reflex to Free T)
--   Estrogen (male): optimal 25–35 pg/mL
--
-- IMPORTANT: These markers must NOT appear in BHAS v2.3 scoring.
-- Tags are set to 'out_of_range' tier only (for display purposes).
-- No optimal/improvement scoring_tier tags — these are informational only.
-- HIPAA: never expose in employer views, broker views, or any export.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

DO $$
DECLARE
  free_t_id   UUID;
  total_t_id  UUID;
  estrogen_id UUID;
BEGIN

  -- ─── 1. Insert lab markers ───────────────────────────────────────────────

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Free Testosterone (Male)', 'pg/mL', 100, 300)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Total Testosterone (Male)', 'ng/dL', 500, 1000)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Estrogen (Male)', 'pg/mL', 25, 35)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO free_t_id  FROM lab_markers WHERE name = 'Free Testosterone (Male)'  LIMIT 1;
  SELECT id INTO total_t_id FROM lab_markers WHERE name = 'Total Testosterone (Male)' LIMIT 1;
  SELECT id INTO estrogen_id FROM lab_markers WHERE name = 'Estrogen (Male)'          LIMIT 1;

  -- ─── 2. Insert tags (display only — no scoring tier) ────────────────────

  -- Free Testosterone
  INSERT INTO tags (name, scoring_tier) VALUES ('Low_Free_Testosterone',      'out_of_range') ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('Normal_Free_Testosterone',   NULL)            ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('High_Free_Testosterone',     'out_of_range') ON CONFLICT (name) DO NOTHING;

  -- Total Testosterone
  INSERT INTO tags (name, scoring_tier) VALUES ('Low_Total_Testosterone',     'out_of_range') ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('Normal_Total_Testosterone',  NULL)            ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('High_Total_Testosterone',    'out_of_range') ON CONFLICT (name) DO NOTHING;

  -- Estrogen (Male)
  INSERT INTO tags (name, scoring_tier) VALUES ('Low_Estrogen_Male',          'out_of_range') ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('Normal_Estrogen_Male',       NULL)            ON CONFLICT (name) DO NOTHING;
  INSERT INTO tags (name, scoring_tier) VALUES ('High_Estrogen_Male',         'out_of_range') ON CONFLICT (name) DO NOTHING;

  -- ─── 3. Insert logic rules ───────────────────────────────────────────────

  -- Free Testosterone (pg/mL)
  -- Low: < 100
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT free_t_id, 0, 99.9, 'between', 'Low_Free_Testosterone'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = free_t_id AND tag_to_apply = 'Low_Free_Testosterone'
  );

  -- Normal: 100–300
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT free_t_id, 100, 300, 'between', 'Normal_Free_Testosterone'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = free_t_id AND tag_to_apply = 'Normal_Free_Testosterone'
  );

  -- High: > 300
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT free_t_id, 300.1, 9999, 'between', 'High_Free_Testosterone'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = free_t_id AND tag_to_apply = 'High_Free_Testosterone'
  );

  -- Total Testosterone (ng/dL)
  -- Low: < 500 (reflex to Free T per spec)
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT total_t_id, 0, 499.9, 'between', 'Low_Total_Testosterone'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = total_t_id AND tag_to_apply = 'Low_Total_Testosterone'
  );

  -- Normal: 500–1000
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT total_t_id, 500, 1000, 'between', 'Normal_Total_Testosterone'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = total_t_id AND tag_to_apply = 'Normal_Total_Testosterone'
  );

  -- High: > 1000
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT total_t_id, 1000.1, 9999, 'between', 'High_Total_Testosterone'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = total_t_id AND tag_to_apply = 'High_Total_Testosterone'
  );

  -- Estrogen Male (pg/mL)
  -- Low: < 25
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT estrogen_id, 0, 24.9, 'between', 'Low_Estrogen_Male'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = estrogen_id AND tag_to_apply = 'Low_Estrogen_Male'
  );

  -- Normal: 25–35
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT estrogen_id, 25, 35, 'between', 'Normal_Estrogen_Male'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = estrogen_id AND tag_to_apply = 'Normal_Estrogen_Male'
  );

  -- High: > 35
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  SELECT estrogen_id, 35.1, 9999, 'between', 'High_Estrogen_Male'
  WHERE NOT EXISTS (
    SELECT 1 FROM logic_rules WHERE marker_id = estrogen_id AND tag_to_apply = 'High_Estrogen_Male'
  );

  -- ─── 4. Map tags to Hormone Health category ─────────────────────────────
  INSERT INTO tag_categories (tag_name, category_id)
  SELECT t.name, c.id
  FROM tags t
  CROSS JOIN categories c
  WHERE t.name IN (
    'Low_Free_Testosterone', 'Normal_Free_Testosterone', 'High_Free_Testosterone',
    'Low_Total_Testosterone', 'Normal_Total_Testosterone', 'High_Total_Testosterone',
    'Low_Estrogen_Male', 'Normal_Estrogen_Male', 'High_Estrogen_Male'
  )
    AND c.name = 'Hormone Health'
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Male hormone markers created: Free Testosterone, Total Testosterone, Estrogen (Male)';
END $$;

-- Verify
SELECT lm.name AS marker, lm.unit, lr.min_value, lr.max_value, lr.tag_to_apply, t.scoring_tier
FROM logic_rules lr
JOIN lab_markers lm ON lm.id = lr.marker_id
JOIN tags t ON t.name = lr.tag_to_apply
WHERE lm.name IN ('Free Testosterone (Male)', 'Total Testosterone (Male)', 'Estrogen (Male)')
ORDER BY lm.name, lr.min_value;
