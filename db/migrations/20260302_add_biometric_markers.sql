-- Migration: Add Waist Circumference (male/female) and Grip Strength lab markers + logic rules
-- Idempotent: safe to run multiple times
-- BHAS scoring:
--   Waist Circumference Male:   <= 35 in = Optimal (1), 35.1–40 = Improvement (0.5), > 40 = Out of Range (0)
--   Waist Circumference Female: <= 31.5 in = Optimal (1), 31.6–35 = Improvement (0.5), > 35 = Out of Range (0)
--   Grip Strength:              >= 35 kg = Optimal (1), 25–34.9 kg = Improvement (0.5), < 25 = Out of Range (0)

DO $$
DECLARE
  wcm_id  UUID;
  wcf_id  UUID;
  grip_id UUID;
BEGIN

  -- ── Waist Circumference (Male) ────────────────────────────────────────────
  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Waist Circumference (Male)', 'in', 0, 35)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO wcm_id FROM lab_markers WHERE name = 'Waist Circumference (Male)' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Optimal_Waist_Male') THEN
    INSERT INTO tags (name) VALUES ('Optimal_Waist_Male');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Borderline_Waist_Male') THEN
    INSERT INTO tags (name) VALUES ('Borderline_Waist_Male');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'High_Risk_Waist_Male') THEN
    INSERT INTO tags (name) VALUES ('High_Risk_Waist_Male');
  END IF;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (wcm_id, 0, 35, 'between', 'Optimal_Waist_Male')
  ON CONFLICT DO NOTHING;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (wcm_id, 35.1, 40, 'between', 'Borderline_Waist_Male')
  ON CONFLICT DO NOTHING;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (wcm_id, 40.1, 999, 'between', 'High_Risk_Waist_Male')
  ON CONFLICT DO NOTHING;

  -- ── Waist Circumference (Female) ──────────────────────────────────────────
  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Waist Circumference (Female)', 'in', 0, 31.5)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO wcf_id FROM lab_markers WHERE name = 'Waist Circumference (Female)' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Optimal_Waist_Female') THEN
    INSERT INTO tags (name) VALUES ('Optimal_Waist_Female');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Borderline_Waist_Female') THEN
    INSERT INTO tags (name) VALUES ('Borderline_Waist_Female');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'High_Risk_Waist_Female') THEN
    INSERT INTO tags (name) VALUES ('High_Risk_Waist_Female');
  END IF;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (wcf_id, 0, 31.5, 'between', 'Optimal_Waist_Female')
  ON CONFLICT DO NOTHING;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (wcf_id, 31.6, 35, 'between', 'Borderline_Waist_Female')
  ON CONFLICT DO NOTHING;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (wcf_id, 35.1, 999, 'between', 'High_Risk_Waist_Female')
  ON CONFLICT DO NOTHING;

  -- ── Grip Strength ─────────────────────────────────────────────────────────
  INSERT INTO lab_markers (name, unit, min_normal, max_normal)
  VALUES ('Grip Strength', 'kg', 35, 999)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO grip_id FROM lab_markers WHERE name = 'Grip Strength' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Optimal_Grip') THEN
    INSERT INTO tags (name) VALUES ('Optimal_Grip');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Low_Normal_Grip') THEN
    INSERT INTO tags (name) VALUES ('Low_Normal_Grip');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE name = 'Low_Grip') THEN
    INSERT INTO tags (name) VALUES ('Low_Grip');
  END IF;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (grip_id, 35, 999, 'between', 'Optimal_Grip')
  ON CONFLICT DO NOTHING;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (grip_id, 25, 34.9, 'between', 'Low_Normal_Grip')
  ON CONFLICT DO NOTHING;

  INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
  VALUES (grip_id, 0, 24.9, 'between', 'Low_Grip')
  ON CONFLICT DO NOTHING;

END $$;
