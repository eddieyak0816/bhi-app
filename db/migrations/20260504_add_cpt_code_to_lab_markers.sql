-- F69: Add CPT billing code to lab_markers
ALTER TABLE lab_markers ADD COLUMN IF NOT EXISTS cpt_code TEXT;

-- Pre-populate known CPT codes from Email Exchange 6 spec
-- HOMA-IR components
UPDATE lab_markers SET cpt_code = '83525' WHERE name = 'Fasting Insulin';
UPDATE lab_markers SET cpt_code = '82947' WHERE name = 'Fasting Glucose';

-- TG/HDL components
UPDATE lab_markers SET cpt_code = '84478' WHERE name = 'Triglycerides';
UPDATE lab_markers SET cpt_code = '83718' WHERE name = 'HDL';

-- Individual markers
UPDATE lab_markers SET cpt_code = '86141' WHERE name = 'hs-CRP';
UPDATE lab_markers SET cpt_code = '82652' WHERE name = 'Vitamin D';
UPDATE lab_markers SET cpt_code = '82607' WHERE name = 'Vitamin B12';
UPDATE lab_markers SET cpt_code = '99497' WHERE name = 'Advanced Care Planning';
