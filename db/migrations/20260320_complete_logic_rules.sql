-- Migration: Complete logic rules for all lab markers
-- Sources:
--   AHA/ACC 2023 Cardiovascular guidelines
--   ADA 2024 Standards of Diabetes Care
--   Endocrine Society Vitamin D guidelines
--   WHO/NHANES grip strength reference data
--   AHA Waist circumference consensus
--   ACSM VO2 Max percentile norms
--   ACC/AHA hs-CRP cardiovascular risk guidelines
--   Fasting Insulin: Kraft/conventional reference ranges
--
-- Idempotent: safe to re-run. Uses WHERE NOT EXISTS guards.
-- Run AFTER all prior migrations and after insert_medical_criteria.sql

DO $$
DECLARE
  vid_id   UUID;  -- Vitamin D
  glu_id   UUID;  -- Fasting Glucose
  ins_id   UUID;  -- Fasting Insulin
  cho_id   UUID;  -- Cholesterol (Total)
  hdl_id   UUID;  -- HDL
  ldl_id   UUID;  -- LDL
  tri_id   UUID;  -- Triglycerides
  bps_id   UUID;  -- Blood Pressure Systolic
  bpd_id   UUID;  -- Blood Pressure Diastolic
  crp_id   UUID;  -- hs-CRP
  vo2_id   UUID;  -- VO2 Max Percentile
  b12_id   UUID;  -- Vitamin B12
  wcm_id   UUID;  -- Waist Circumference (Male)
  wcf_id   UUID;  -- Waist Circumference (Female)
  grip_id  UUID;  -- Grip Strength
BEGIN

  -- ── Resolve all marker IDs ───────────────────────────────────────────────
  SELECT id INTO vid_id  FROM lab_markers WHERE lower(name) = 'vitamin d'                   LIMIT 1;
  SELECT id INTO glu_id  FROM lab_markers WHERE lower(name) = 'fasting glucose'             LIMIT 1;
  SELECT id INTO ins_id  FROM lab_markers WHERE lower(name) = 'fasting insulin'             LIMIT 1;
  SELECT id INTO cho_id  FROM lab_markers WHERE lower(name) = 'cholesterol'                 LIMIT 1;
  SELECT id INTO hdl_id  FROM lab_markers WHERE lower(name) = 'hdl'                         LIMIT 1;
  SELECT id INTO ldl_id  FROM lab_markers WHERE lower(name) = 'ldl'                         LIMIT 1;
  SELECT id INTO tri_id  FROM lab_markers WHERE lower(name) = 'triglycerides'               LIMIT 1;
  SELECT id INTO bps_id  FROM lab_markers WHERE lower(name) = 'blood pressure systolic'     LIMIT 1;
  SELECT id INTO bpd_id  FROM lab_markers WHERE lower(name) = 'blood pressure diastolic'    LIMIT 1;
  SELECT id INTO crp_id  FROM lab_markers WHERE lower(name) = 'hs-crp'                      LIMIT 1;
  SELECT id INTO vo2_id  FROM lab_markers WHERE lower(name) = 'vo2 max percentile'          LIMIT 1;
  SELECT id INTO b12_id  FROM lab_markers WHERE lower(name) = 'vitamin b12'                 LIMIT 1;
  SELECT id INTO wcm_id  FROM lab_markers WHERE lower(name) = 'waist circumference (male)'  LIMIT 1;
  SELECT id INTO wcf_id  FROM lab_markers WHERE lower(name) = 'waist circumference (female)'LIMIT 1;
  SELECT id INTO grip_id FROM lab_markers WHERE lower(name) = 'grip strength'               LIMIT 1;

  -- ════════════════════════════════════════════════════════════════════════
  -- VITAMIN D  (ng/mL)
  -- Endocrine Society: Deficient <20, Insufficient 20-29, Sufficient 30-100, Toxicity >100
  -- ════════════════════════════════════════════════════════════════════════
  IF vid_id IS NOT NULL THEN
    -- Tags
    INSERT INTO tags (name) VALUES ('Deficient_VitD')    ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Insufficient_VitD') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Adequate_VitD')     ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Excess_VitD')       ON CONFLICT (name) DO NOTHING;

    -- Rules (replace approach: delete old and re-insert so ranges are current)
    DELETE FROM logic_rules WHERE marker_id = vid_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (vid_id,   0,    19.9, 'between', 'Deficient_VitD'),    -- score 0
      (vid_id,  20,    29.9, 'between', 'Insufficient_VitD'), -- score 0.5
      (vid_id,  30,   100,   'between', 'Adequate_VitD'),     -- score 1
      (vid_id, 100.1, 9999,  'between', 'Excess_VitD');       -- score 0
  ELSE
    RAISE NOTICE 'Vitamin D marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- FASTING GLUCOSE  (mg/dL)
  -- ADA 2024: Normal <100, Prediabetes 100-125, Diabetes ≥126
  -- Low <70 (hypoglycemia risk)
  -- ════════════════════════════════════════════════════════════════════════
  IF glu_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Low_Glucose')         ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Normal_Glucose')      ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Prediabetic_Glucose') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Diabetic_Glucose')    ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = glu_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (glu_id,   0,   69.9, 'between', 'Low_Glucose'),         -- score 0
      (glu_id,  70,   99.9, 'between', 'Normal_Glucose'),      -- score 1
      (glu_id, 100,  125.9, 'between', 'Prediabetic_Glucose'), -- score 0.5
      (glu_id, 126,  9999,  'between', 'Diabetic_Glucose');    -- score 0
  ELSE
    RAISE NOTICE 'Fasting Glucose marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- FASTING INSULIN  (µIU/mL)
  -- Conventional reference: Optimal <5, Acceptable 5-10, Elevated >10
  -- Kraft / functional medicine standard used here (stricter)
  -- ════════════════════════════════════════════════════════════════════════
  IF ins_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Optimal_Insulin')     ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Acceptable_Insulin')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Elevated_Insulin')    ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_Insulin')        ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = ins_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (ins_id,  0,    4.9, 'between', 'Optimal_Insulin'),    -- score 1
      (ins_id,  5,    9.9, 'between', 'Acceptable_Insulin'), -- score 0.5
      (ins_id, 10,   19.9, 'between', 'Elevated_Insulin'),   -- score 0
      (ins_id, 20,  9999,  'between', 'High_Insulin');       -- score 0
  ELSE
    RAISE NOTICE 'Fasting Insulin marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- TOTAL CHOLESTEROL  (mg/dL)
  -- AHA/ACC: Desirable <200, Borderline High 200-239, High ≥240
  -- ════════════════════════════════════════════════════════════════════════
  IF cho_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Desirable_Cholesterol')         ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Borderline_High_Cholesterol')   ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_Cholesterol')              ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = cho_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (cho_id,   0,   199.9, 'between', 'Desirable_Cholesterol'),       -- score 1
      (cho_id, 200,   239.9, 'between', 'Borderline_High_Cholesterol'), -- score 0.5
      (cho_id, 240,   9999,  'between', 'High_Cholesterol');            -- score 0
  ELSE
    RAISE NOTICE 'Cholesterol marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- HDL CHOLESTEROL  (mg/dL)
  -- AHA/ACC: Low <40 (men) / <50 (women) — using unified cutoff here
  -- Low <40, Fair 40-59, Good ≥60
  -- ════════════════════════════════════════════════════════════════════════
  IF hdl_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Low_HDL')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Fair_HDL') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Good_HDL') ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = hdl_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (hdl_id,  0,   39.9, 'between', 'Low_HDL'),  -- score 0
      (hdl_id, 40,   59.9, 'between', 'Fair_HDL'), -- score 0.5
      (hdl_id, 60,  999,   'between', 'Good_HDL'); -- score 1
  ELSE
    RAISE NOTICE 'HDL marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- LDL CHOLESTEROL  (mg/dL)
  -- ACC/AHA 2023: Optimal <70 (high-risk) or <100 (standard)
  -- Using standard population cutoffs: Optimal <100, Near-Optimal 100-129,
  -- Borderline High 130-159, High 160-189, Very High ≥190
  -- ════════════════════════════════════════════════════════════════════════
  IF ldl_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Optimal_LDL')          ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Near_Optimal_LDL')     ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Borderline_High_LDL')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_LDL')             ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Very_High_LDL')        ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = ldl_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (ldl_id,   0,   99.9, 'between', 'Optimal_LDL'),         -- score 1
      (ldl_id, 100,  129.9, 'between', 'Near_Optimal_LDL'),    -- score 0.5
      (ldl_id, 130,  159.9, 'between', 'Borderline_High_LDL'), -- score 0
      (ldl_id, 160,  189.9, 'between', 'High_LDL'),            -- score 0
      (ldl_id, 190,  9999,  'between', 'Very_High_LDL');       -- score 0
  ELSE
    RAISE NOTICE 'LDL marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- TRIGLYCERIDES  (mg/dL)
  -- AHA/ACC: Normal <150, Borderline High 150-199, High 200-499, Very High ≥500
  -- ════════════════════════════════════════════════════════════════════════
  IF tri_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Normal_Triglycerides')           ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Borderline_High_Triglycerides')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_Triglycerides')             ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Very_High_Triglycerides')        ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = tri_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (tri_id,   0,  149.9, 'between', 'Normal_Triglycerides'),          -- score 1
      (tri_id, 150,  199.9, 'between', 'Borderline_High_Triglycerides'), -- score 0.5
      (tri_id, 200,  499.9, 'between', 'High_Triglycerides'),            -- score 0
      (tri_id, 500,  9999,  'between', 'Very_High_Triglycerides');       -- score 0
  ELSE
    RAISE NOTICE 'Triglycerides marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- BLOOD PRESSURE SYSTOLIC  (mmHg)
  -- AHA/ACC 2017: Normal <120, Elevated 120-129, Stage 1 HTN 130-139, Stage 2 HTN ≥140
  -- ════════════════════════════════════════════════════════════════════════
  IF bps_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Normal_BP_Systolic')           ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Elevated_BP_Systolic')         ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Stage1_Hypertension_Systolic') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Stage2_Hypertension_Systolic') ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = bps_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (bps_id,   0, 119.9, 'between', 'Normal_BP_Systolic'),           -- score 1
      (bps_id, 120, 129.9, 'between', 'Elevated_BP_Systolic'),         -- score 0.5
      (bps_id, 130, 139.9, 'between', 'Stage1_Hypertension_Systolic'), -- score 0
      (bps_id, 140, 9999,  'between', 'Stage2_Hypertension_Systolic'); -- score 0
  ELSE
    RAISE NOTICE 'Blood Pressure Systolic marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- BLOOD PRESSURE DIASTOLIC  (mmHg)
  -- AHA/ACC 2017: Normal <80, Stage 1 HTN 80-89, Stage 2 HTN ≥90
  -- ════════════════════════════════════════════════════════════════════════
  IF bpd_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Normal_BP_Diastolic')           ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Stage1_Hypertension_Diastolic') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Stage2_Hypertension_Diastolic') ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = bpd_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (bpd_id,  0,  79.9, 'between', 'Normal_BP_Diastolic'),           -- score 1
      (bpd_id, 80,  89.9, 'between', 'Stage1_Hypertension_Diastolic'), -- score 0.5
      (bpd_id, 90,  9999, 'between', 'Stage2_Hypertension_Diastolic'); -- score 0
  ELSE
    RAISE NOTICE 'Blood Pressure Diastolic marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- hs-CRP  (mg/L)
  -- ACC/AHA: Low cardiovascular risk <1.0, Average 1.0-3.0, High >3.0
  -- ════════════════════════════════════════════════════════════════════════
  IF crp_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Low_CRP')      ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Average_CRP')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_CRP')     ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = crp_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (crp_id,  0,   0.99, 'between', 'Low_CRP'),     -- score 1
      (crp_id,  1.0, 3.0,  'between', 'Average_CRP'), -- score 0.5
      (crp_id,  3.1, 9999, 'between', 'High_CRP');    -- score 0
  ELSE
    RAISE NOTICE 'hs-CRP marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- VO2 MAX PERCENTILE  (0–100)
  -- ACSM norms: ≥60th percentile = Excellent/Superior, 40-59 = Good/Average, <40 = Fair/Poor
  -- ════════════════════════════════════════════════════════════════════════
  IF vo2_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Excellent_VO2') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Average_VO2')   ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Low_VO2')       ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = vo2_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (vo2_id, 60,  100, 'between', 'Excellent_VO2'), -- score 1
      (vo2_id, 40,   59, 'between', 'Average_VO2'),   -- score 0.5
      (vo2_id,  0,   39, 'between', 'Low_VO2');       -- score 0
  ELSE
    RAISE NOTICE 'VO2 Max Percentile marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- VITAMIN B12  (pg/mL)
  -- Conventional: Deficient <200, Low-normal 200-299, Adequate 300-900, Excess >900
  -- ════════════════════════════════════════════════════════════════════════
  IF b12_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Deficient_B12')  ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Low_Normal_B12') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Adequate_B12')   ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Excess_B12')     ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = b12_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (b12_id,   0,   199.9, 'between', 'Deficient_B12'),  -- score 0
      (b12_id, 200,   299.9, 'between', 'Low_Normal_B12'), -- score 0.5
      (b12_id, 300,   900,   'between', 'Adequate_B12'),   -- score 1
      (b12_id, 900.1, 99999, 'between', 'Excess_B12');     -- score 0
  ELSE
    RAISE NOTICE 'Vitamin B12 marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- WAIST CIRCUMFERENCE (MALE)  (inches)
  -- AHA/NHLBI: Low risk ≤35 in, Increased risk 35.1-39, High risk ≥40
  -- ════════════════════════════════════════════════════════════════════════
  IF wcm_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Optimal_Waist_Male')      ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Borderline_Waist_Male')   ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_Risk_Waist_Male')    ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = wcm_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (wcm_id,  0,   35,  'between', 'Optimal_Waist_Male'),    -- score 1
      (wcm_id, 35.1, 39.9,'between', 'Borderline_Waist_Male'), -- score 0.5
      (wcm_id, 40,   999, 'between', 'High_Risk_Waist_Male');  -- score 0
  ELSE
    RAISE NOTICE 'Waist Circumference (Male) marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- WAIST CIRCUMFERENCE (FEMALE)  (inches)
  -- AHA/NHLBI: Low risk ≤31.5 in, Increased risk 31.6-34.9, High risk ≥35
  -- ════════════════════════════════════════════════════════════════════════
  IF wcf_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Optimal_Waist_Female')    ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Borderline_Waist_Female') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('High_Risk_Waist_Female')  ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = wcf_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (wcf_id,  0,    31.5, 'between', 'Optimal_Waist_Female'),    -- score 1
      (wcf_id, 31.6,  34.9, 'between', 'Borderline_Waist_Female'), -- score 0.5
      (wcf_id, 35,   999,   'between', 'High_Risk_Waist_Female');  -- score 0
  ELSE
    RAISE NOTICE 'Waist Circumference (Female) marker not found — skipping';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════
  -- GRIP STRENGTH  (kg)
  -- WHO/Dodds 2014 reference: thresholds vary by age but general cutoffs:
  -- Optimal ≥35 kg (men) / ≥20 kg (women) — unified here since marker is
  -- sex-neutral; v2.3 engine uses sex-specific grip ratio instead.
  -- General population: ≥35 = Optimal, 25-34.9 = Low-Normal, <25 = Low
  -- ════════════════════════════════════════════════════════════════════════
  IF grip_id IS NOT NULL THEN
    INSERT INTO tags (name) VALUES ('Optimal_Grip')    ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Low_Normal_Grip') ON CONFLICT (name) DO NOTHING;
    INSERT INTO tags (name) VALUES ('Low_Grip')        ON CONFLICT (name) DO NOTHING;

    DELETE FROM logic_rules WHERE marker_id = grip_id;

    INSERT INTO logic_rules (marker_id, min_value, max_value, operator, tag_to_apply)
    VALUES
      (grip_id, 35,   999, 'between', 'Optimal_Grip'),    -- score 1
      (grip_id, 25,   34.9,'between', 'Low_Normal_Grip'), -- score 0.5
      (grip_id,  0,   24.9,'between', 'Low_Grip');        -- score 0
  ELSE
    RAISE NOTICE 'Grip Strength marker not found — skipping';
  END IF;

END $$;
