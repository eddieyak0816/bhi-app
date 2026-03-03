-- Insert all medically accurate criteria rules
-- Idempotent: looks up marker IDs by name, safe to run multiple times

DO $$
DECLARE
  vid_id  UUID;
  glu_id  UUID;
  cho_id  UUID;
  hdl_id  UUID;
  ldl_id  UUID;
  tri_id  UUID;
  bps_id  UUID;
  bpd_id  UUID;
BEGIN

  -- Resolve marker IDs by name
  SELECT id INTO vid_id FROM lab_markers WHERE lower(name) = 'vitamin d'                  LIMIT 1;
  SELECT id INTO glu_id FROM lab_markers WHERE lower(name) = 'fasting glucose'            LIMIT 1;
  SELECT id INTO cho_id FROM lab_markers WHERE lower(name) = 'cholesterol'                LIMIT 1;
  SELECT id INTO hdl_id FROM lab_markers WHERE lower(name) = 'hdl'                        LIMIT 1;
  SELECT id INTO ldl_id FROM lab_markers WHERE lower(name) = 'ldl'                        LIMIT 1;
  SELECT id INTO tri_id FROM lab_markers WHERE lower(name) = 'triglycerides'              LIMIT 1;
  SELECT id INTO bps_id FROM lab_markers WHERE lower(name) = 'blood pressure systolic'    LIMIT 1;
  SELECT id INTO bpd_id FROM lab_markers WHERE lower(name) = 'blood pressure diastolic'   LIMIT 1;

  -- ── Vitamin D ────────────────────────────────────────────────────────────
  IF vid_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT vid_id, 0, 20, 'Deficient_VitD'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=vid_id AND tag_to_apply='Deficient_VitD');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT vid_id, 20.1, 30, 'Insufficient_VitD'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=vid_id AND tag_to_apply='Insufficient_VitD');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT vid_id, 30.1, 100, 'Adequate_VitD'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=vid_id AND tag_to_apply='Adequate_VitD');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT vid_id, 100.1, 10000, 'Excess_VitD'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=vid_id AND tag_to_apply='Excess_VitD');
  ELSE
    RAISE NOTICE 'Vitamin D marker not found — skipping its rules';
  END IF;

  -- ── Blood Glucose ────────────────────────────────────────────────────────
  IF glu_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT glu_id, 0, 70, 'Low_Glucose'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=glu_id AND tag_to_apply='Low_Glucose');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT glu_id, 70.1, 100, 'Normal_Glucose'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=glu_id AND tag_to_apply='Normal_Glucose');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT glu_id, 100.1, 126, 'Prediabetic_Glucose'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=glu_id AND tag_to_apply='Prediabetic_Glucose');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT glu_id, 126.1, 10000, 'Diabetic_Glucose'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=glu_id AND tag_to_apply='Diabetic_Glucose');
  ELSE
    RAISE NOTICE 'Fasting Glucose marker not found — skipping its rules';
  END IF;

  -- ── Total Cholesterol ────────────────────────────────────────────────────
  IF cho_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT cho_id, 0, 200, 'Desirable_Cholesterol'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=cho_id AND tag_to_apply='Desirable_Cholesterol');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT cho_id, 200.1, 240, 'Borderline_High_Cholesterol'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=cho_id AND tag_to_apply='Borderline_High_Cholesterol');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT cho_id, 240.1, 10000, 'High_Cholesterol'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=cho_id AND tag_to_apply='High_Cholesterol');
  ELSE
    RAISE NOTICE 'Cholesterol marker not found — skipping its rules';
  END IF;

  -- ── HDL ──────────────────────────────────────────────────────────────────
  IF hdl_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT hdl_id, 0, 40, 'Low_HDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=hdl_id AND tag_to_apply='Low_HDL');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT hdl_id, 40.1, 59, 'Fair_HDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=hdl_id AND tag_to_apply='Fair_HDL');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT hdl_id, 60, 500, 'Good_HDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=hdl_id AND tag_to_apply='Good_HDL');
  ELSE
    RAISE NOTICE 'HDL marker not found — skipping its rules';
  END IF;

  -- ── LDL ──────────────────────────────────────────────────────────────────
  IF ldl_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT ldl_id, 0, 100, 'Optimal_LDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=ldl_id AND tag_to_apply='Optimal_LDL');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT ldl_id, 100.1, 130, 'Near_Optimal_LDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=ldl_id AND tag_to_apply='Near_Optimal_LDL');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT ldl_id, 130.1, 160, 'Borderline_High_LDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=ldl_id AND tag_to_apply='Borderline_High_LDL');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT ldl_id, 160.1, 190, 'High_LDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=ldl_id AND tag_to_apply='High_LDL');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT ldl_id, 190.1, 10000, 'Very_High_LDL'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=ldl_id AND tag_to_apply='Very_High_LDL');
  ELSE
    RAISE NOTICE 'LDL marker not found — skipping its rules';
  END IF;

  -- ── Triglycerides ────────────────────────────────────────────────────────
  IF tri_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT tri_id, 0, 150, 'Normal_Triglycerides'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=tri_id AND tag_to_apply='Normal_Triglycerides');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT tri_id, 150.1, 200, 'Borderline_High_Triglycerides'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=tri_id AND tag_to_apply='Borderline_High_Triglycerides');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT tri_id, 200.1, 500, 'High_Triglycerides'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=tri_id AND tag_to_apply='High_Triglycerides');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT tri_id, 500.1, 10000, 'Very_High_Triglycerides'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=tri_id AND tag_to_apply='Very_High_Triglycerides');
  ELSE
    RAISE NOTICE 'Triglycerides marker not found — skipping its rules';
  END IF;

  -- ── Blood Pressure Systolic ───────────────────────────────────────────────
  IF bps_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bps_id, 0, 120, 'Normal_BP_Systolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bps_id AND tag_to_apply='Normal_BP_Systolic');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bps_id, 120.1, 130, 'Elevated_BP_Systolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bps_id AND tag_to_apply='Elevated_BP_Systolic');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bps_id, 130.1, 140, 'Stage1_Hypertension_Systolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bps_id AND tag_to_apply='Stage1_Hypertension_Systolic');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bps_id, 140.1, 10000, 'Stage2_Hypertension_Systolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bps_id AND tag_to_apply='Stage2_Hypertension_Systolic');
  ELSE
    RAISE NOTICE 'Blood Pressure Systolic marker not found — skipping its rules';
  END IF;

  -- ── Blood Pressure Diastolic ──────────────────────────────────────────────
  IF bpd_id IS NOT NULL THEN
    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bpd_id, 0, 80, 'Normal_BP_Diastolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bpd_id AND tag_to_apply='Normal_BP_Diastolic');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bpd_id, 80.1, 90, 'Elevated_BP_Diastolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bpd_id AND tag_to_apply='Elevated_BP_Diastolic');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bpd_id, 90.1, 100, 'Stage1_Hypertension_Diastolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bpd_id AND tag_to_apply='Stage1_Hypertension_Diastolic');

    INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
    SELECT bpd_id, 100.1, 10000, 'Stage2_Hypertension_Diastolic'
    WHERE NOT EXISTS (SELECT 1 FROM logic_rules WHERE marker_id=bpd_id AND tag_to_apply='Stage2_Hypertension_Diastolic');
  ELSE
    RAISE NOTICE 'Blood Pressure Diastolic marker not found — skipping its rules';
  END IF;

END $$;

-- ── Tags ─────────────────────────────────────────────────────────────────────
INSERT INTO tags (name) VALUES
  ('Deficient_VitD'),
  ('Insufficient_VitD'),
  ('Adequate_VitD'),
  ('Excess_VitD'),
  ('Low_Glucose'),
  ('Normal_Glucose'),
  ('Prediabetic_Glucose'),
  ('Diabetic_Glucose'),
  ('Desirable_Cholesterol'),
  ('Borderline_High_Cholesterol'),
  ('High_Cholesterol'),
  ('Low_HDL'),
  ('Fair_HDL'),
  ('Good_HDL'),
  ('Optimal_LDL'),
  ('Near_Optimal_LDL'),
  ('Borderline_High_LDL'),
  ('High_LDL'),
  ('Very_High_LDL'),
  ('Normal_Triglycerides'),
  ('Borderline_High_Triglycerides'),
  ('High_Triglycerides'),
  ('Very_High_Triglycerides'),
  ('Normal_BP_Systolic'),
  ('Elevated_BP_Systolic'),
  ('Stage1_Hypertension_Systolic'),
  ('Stage2_Hypertension_Systolic'),
  ('Normal_BP_Diastolic'),
  ('Elevated_BP_Diastolic'),
  ('Stage1_Hypertension_Diastolic'),
  ('Stage2_Hypertension_Diastolic')
ON CONFLICT (name) DO NOTHING;
