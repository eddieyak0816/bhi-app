-- Migration: Add Vitamin B12 lab marker and scoring rules
-- Idempotent: safe to run multiple times
-- BHAS scoring: Adequate_B12 = 1 (Optimal), Low_Normal_B12 = 0.5 (Improvement), all others = 0

DO $$
DECLARE
  b12_id UUID;
BEGIN

  -- 1. Insert lab marker
  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Vitamin B12', 'pg/mL', 300, 900)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO b12_id FROM lab_markers WHERE name = 'Vitamin B12' LIMIT 1;

  -- 2. Insert tags
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Deficient_B12') THEN
    INSERT INTO tags (name) VALUES ('Deficient_B12');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Low_Normal_B12') THEN
    INSERT INTO tags (name) VALUES ('Low_Normal_B12');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Adequate_B12') THEN
    INSERT INTO tags (name) VALUES ('Adequate_B12');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Excess_B12') THEN
    INSERT INTO tags (name) VALUES ('Excess_B12');
  END IF;

  -- 3. Insert logic rules
  -- Deficient: < 200 pg/mL  → score 0
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (b12_id, 0, 199.9, 'between', 'Deficient_B12')
  ON CONFLICT DO NOTHING;

  -- Low-normal / improvement: 200–299 pg/mL → score 0.5
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (b12_id, 200, 299.9, 'between', 'Low_Normal_B12')
  ON CONFLICT DO NOTHING;

  -- Adequate / optimal: 300–900 pg/mL → score 1
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (b12_id, 300, 900, 'between', 'Adequate_B12')
  ON CONFLICT DO NOTHING;

  -- Excess: > 900 pg/mL → score 0
  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (b12_id, 900.1, 99999, 'between', 'Excess_B12')
  ON CONFLICT DO NOTHING;

  -- 4. Map tags to Nutrition category (if it exists)
  INSERT INTO tag_categories (tag_name, category_id)
  SELECT t.name, c.id
  FROM tags t
  CROSS JOIN categories c
  WHERE t.name IN ('Deficient_B12', 'Low_Normal_B12', 'Adequate_B12', 'Excess_B12')
    AND c.name = 'Nutrition'
  ON CONFLICT DO NOTHING;

END $$;
