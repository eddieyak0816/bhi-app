-- Migration: Add scoring_tier column to tags table
-- Implements F47: removes hardcoded OPTIMAL_TAGS / IMPROVEMENT_TAGS from frontend and server.
-- After this migration, the scoring engine reads tier from the database at runtime.
--
-- scoring_tier values: 'optimal' | 'improvement' | 'out_of_range' | NULL (unknown/legacy)
--
-- Backfill: existing known tags are assigned their correct tier so current scoring is preserved.
-- New tags created by the New Marker Wizard will have their tier set at creation time.
--
-- Run in Supabase Dashboard → SQL Editor.
-- Safe to re-run (uses ALTER COLUMN / UPDATE, no destructive operations).

-- 1. Add the column (NULL allowed so existing tags don't break before backfill)
ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS scoring_tier TEXT
    CHECK (scoring_tier IN ('optimal', 'improvement', 'out_of_range'));

-- 2. Backfill all known existing tags with their correct tiers
--    (matches OPTIMAL_TAGS and IMPROVEMENT_TAGS in evaluateRules.ts and server/index.js)

-- OPTIMAL tags (score = 1)
UPDATE tags SET scoring_tier = 'optimal' WHERE name IN (
  'Adequate_VitD',
  'Normal_Glucose',
  'Desirable_Cholesterol',
  'Good_HDL',
  'Optimal_LDL',
  'Normal_Triglycerides',
  'Normal_BP_Systolic',
  'Normal_BP_Diastolic',
  'Normal D',
  'Adequate_B12',
  'Normal_B12',
  'Optimal_Waist_Male',
  'Optimal_Waist_Female',
  'Optimal_Grip',
  'Low_CRP',
  'Excellent_VO2',
  'Optimal_Insulin'
);

-- IMPROVEMENT tags (score = 0.5)
UPDATE tags SET scoring_tier = 'improvement' WHERE name IN (
  'Insufficient_VitD',
  'Prediabetic_Glucose',
  'Borderline_High_Cholesterol',
  'Fair_HDL',
  'Near_Optimal_LDL',
  'Borderline_High_LDL',
  'Borderline_High_Triglycerides',
  'Elevated_BP_Systolic',
  'Elevated_BP_Diastolic',
  'Stage1_Hypertension_Systolic',
  'Stage1_Hypertension_Diastolic',
  'Low_Normal_B12',
  'Borderline_Waist_Male',
  'Borderline_Waist_Female',
  'Low_Normal_Grip',
  'Average_CRP',
  'Average_VO2',
  'Acceptable_Insulin'
);

-- OUT OF RANGE tags (score = 0) — explicitly set for completeness
UPDATE tags SET scoring_tier = 'out_of_range' WHERE name IN (
  'Deficient_VitD',
  'Excess_VitD',
  'Low_Glucose',
  'Prediabetic_Glucose',
  'Diabetic_Glucose',
  'Elevated_Insulin',
  'High_Insulin',
  'Borderline_High_Cholesterol',
  'High_Cholesterol',
  'Low_HDL',
  'Borderline_High_LDL',
  'High_LDL',
  'Very_High_LDL',
  'Borderline_High_Triglycerides',
  'High_Triglycerides',
  'Very_High_Triglycerides',
  'Stage1_Hypertension_Systolic',
  'Stage1_Hypertension_Diastolic',
  'Stage2_Hypertension_Systolic',
  'Stage2_Hypertension_Diastolic',
  'High_CRP',
  'Low_VO2',
  'Deficient_B12',
  'Excess_B12',
  'High_Risk_Waist_Male',
  'High_Risk_Waist_Female',
  'Low_Grip'
) AND scoring_tier IS NULL;

-- Verify: show tier distribution after backfill
SELECT scoring_tier, COUNT(*) AS tag_count
FROM tags
GROUP BY scoring_tier
ORDER BY scoring_tier;
