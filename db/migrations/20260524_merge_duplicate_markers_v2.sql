-- Merge remaining duplicate lab_marker rows using exact IDs from the DB.
--
-- Canonical choices per group:
--   ALL-CAPS variant is always the duplicate — title-case is canonical.
--   Exception: eGFR preferred over EGFR (mixed-case is the standard abbreviation).
--   Exception: Homocysteine preferred over Homocyst(e)ine (simpler name).
--   Exception: Vitamin D, 25-Hydroxy preferred over Vitamin D, 25 hydroxy.
--   Exception: Vitamin D, 25-OH, TOTAL.IA preferred over VITAMIN D, 25-OH, TOTAL, IA.
--
-- NOTE: 'Glucose' and 'Insulin' groups are kept as-is (non-fasting variants,
--       distinct from 'Fasting Glucose' / 'Fasting Insulin'). Only the ALL-CAPS
--       duplicate is deleted.
--
-- Idempotent: safe to re-run.

-- ════════════════════════════════════════════════════════════════
-- GROUP 1: Albumin / ALBUMIN  →  keep Albumin (e485e87b)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Albumin'
WHERE marker_name = 'ALBUMIN';

DELETE FROM logic_rules WHERE marker_id = '32f9af22-a2cb-428e-a217-031a3343c02d'; -- ALBUMIN
DELETE FROM lab_markers  WHERE id        = '32f9af22-a2cb-428e-a217-031a3343c02d';

-- ════════════════════════════════════════════════════════════════
-- GROUP 2: Alkaline Phosphatase / ALKALINE PHOSPHATASE  →  keep Alkaline Phosphatase (c0683018)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Alkaline Phosphatase'
WHERE marker_name = 'ALKALINE PHOSPHATASE';

DELETE FROM logic_rules WHERE marker_id = 'd1d01eca-955c-4011-9c42-3a016675ceb4'; -- ALKALINE PHOSPHATASE
DELETE FROM lab_markers  WHERE id        = 'd1d01eca-955c-4011-9c42-3a016675ceb4';

-- ════════════════════════════════════════════════════════════════
-- GROUP 3: Bilirubin, Total / BILIRUBIN, TOTAL  →  keep Bilirubin, Total (69f19039)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Bilirubin, Total'
WHERE marker_name = 'BILIRUBIN, TOTAL';

DELETE FROM logic_rules WHERE marker_id = 'dc39e55e-3380-4ae1-b715-d976cd4c44da'; -- BILIRUBIN, TOTAL
DELETE FROM lab_markers  WHERE id        = 'dc39e55e-3380-4ae1-b715-d976cd4c44da';

-- ════════════════════════════════════════════════════════════════
-- GROUP 4: Calcium / CALCIUM  →  keep Calcium (dfd2a4b0)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Calcium'
WHERE marker_name = 'CALCIUM';

DELETE FROM logic_rules WHERE marker_id = 'c6c12b4d-a2ab-4a9f-82de-bc180c39b99e'; -- CALCIUM
DELETE FROM lab_markers  WHERE id        = 'c6c12b4d-a2ab-4a9f-82de-bc180c39b99e';

-- ════════════════════════════════════════════════════════════════
-- GROUP 5: Chloride / CHLORIDE  →  keep Chloride (e2649436)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Chloride'
WHERE marker_name = 'CHLORIDE';

DELETE FROM logic_rules WHERE marker_id = '8d00eb19-d364-4200-94f9-7a42dd64e8c7'; -- CHLORIDE
DELETE FROM lab_markers  WHERE id        = '8d00eb19-d364-4200-94f9-7a42dd64e8c7';

-- ════════════════════════════════════════════════════════════════
-- GROUP 6: Creatinine / CREATININE  →  keep Creatinine (22b8935e)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Creatinine'
WHERE marker_name = 'CREATININE';

DELETE FROM logic_rules WHERE marker_id = '8f811bc5-7879-4aaa-81aa-587cef6c4b3f'; -- CREATININE
DELETE FROM lab_markers  WHERE id        = '8f811bc5-7879-4aaa-81aa-587cef6c4b3f';

-- ════════════════════════════════════════════════════════════════
-- GROUP 7: eGFR / EGFR  →  keep eGFR (52732779)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'eGFR'
WHERE marker_name = 'EGFR';

DELETE FROM logic_rules WHERE marker_id = '58063ea0-0173-403b-9f95-da3da851145b'; -- EGFR
DELETE FROM lab_markers  WHERE id        = '58063ea0-0173-403b-9f95-da3da851145b';

-- ════════════════════════════════════════════════════════════════
-- GROUP 8: Glucose / GLUCOSE  →  keep Glucose (0a9a6cdd)
-- NOTE: this is the non-fasting 'Glucose' marker — distinct from 'Fasting Glucose'.
--       Only the ALL-CAPS duplicate is removed.
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Glucose'
WHERE marker_name = 'GLUCOSE';

DELETE FROM logic_rules WHERE marker_id = '0048a9c1-4c3d-4b33-be28-f1e0f01218ca'; -- GLUCOSE
DELETE FROM lab_markers  WHERE id        = '0048a9c1-4c3d-4b33-be28-f1e0f01218ca';

-- ════════════════════════════════════════════════════════════════
-- GROUP 9: Hematocrit / HEMATOCRIT  →  keep Hematocrit (43d8cd41)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Hematocrit'
WHERE marker_name = 'HEMATOCRIT';

DELETE FROM logic_rules WHERE marker_id = '907c5951-9cef-4318-af0f-0b6a4a5963f4'; -- HEMATOCRIT
DELETE FROM lab_markers  WHERE id        = '907c5951-9cef-4318-af0f-0b6a4a5963f4';

-- ════════════════════════════════════════════════════════════════
-- GROUP 10: Hemoglobin / HEMOGLOBIN  →  keep Hemoglobin (b89c592d)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Hemoglobin'
WHERE marker_name = 'HEMOGLOBIN';

DELETE FROM logic_rules WHERE marker_id = '81d6b8a7-03a3-45c4-b2be-6b159bbf85ed'; -- HEMOGLOBIN
DELETE FROM lab_markers  WHERE id        = '81d6b8a7-03a3-45c4-b2be-6b159bbf85ed';

-- ════════════════════════════════════════════════════════════════
-- GROUP 11: Homocyst(e)ine / Homocysteine  →  keep Homocysteine (077f14be)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Homocysteine'
WHERE marker_name = 'Homocyst(e)ine';

DELETE FROM logic_rules WHERE marker_id = 'fa079898-0636-467c-a80b-3e26b5bb4078'; -- Homocyst(e)ine
DELETE FROM lab_markers  WHERE id        = 'fa079898-0636-467c-a80b-3e26b5bb4078';

-- ════════════════════════════════════════════════════════════════
-- GROUP 12: Insulin / INSULIN  →  keep Insulin (a94f9d36)
-- NOTE: this is the non-fasting 'Insulin' marker — distinct from 'Fasting Insulin'.
--       Only the ALL-CAPS duplicate is removed.
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Insulin'
WHERE marker_name = 'INSULIN';

DELETE FROM logic_rules WHERE marker_id = '5ca72c59-1611-4606-9c3b-b39f9100081c'; -- INSULIN
DELETE FROM lab_markers  WHERE id        = '5ca72c59-1611-4606-9c3b-b39f9100081c';

-- ════════════════════════════════════════════════════════════════
-- GROUP 13: Potassium / POTASSIUM  →  keep Potassium (bdf1db8e)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Potassium'
WHERE marker_name = 'POTASSIUM';

DELETE FROM logic_rules WHERE marker_id = '96455aab-8eea-4d1a-a328-d0de9f05fed0'; -- POTASSIUM
DELETE FROM lab_markers  WHERE id        = '96455aab-8eea-4d1a-a328-d0de9f05fed0';

-- ════════════════════════════════════════════════════════════════
-- GROUP 14: Protein, Total / PROTEIN, TOTAL  →  keep Protein, Total (a10fb649)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Protein, Total'
WHERE marker_name = 'PROTEIN, TOTAL';

DELETE FROM logic_rules WHERE marker_id = '05abb04d-cb50-48bc-ab80-871ac1129c7f'; -- PROTEIN, TOTAL
DELETE FROM lab_markers  WHERE id        = '05abb04d-cb50-48bc-ab80-871ac1129c7f';

-- ════════════════════════════════════════════════════════════════
-- GROUP 15: Sodium / SODIUM  →  keep Sodium (8231b22e)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Sodium'
WHERE marker_name = 'SODIUM';

DELETE FROM logic_rules WHERE marker_id = '5444cea5-fec2-47e4-b9f4-679b57624f3d'; -- SODIUM
DELETE FROM lab_markers  WHERE id        = '5444cea5-fec2-47e4-b9f4-679b57624f3d';

-- ════════════════════════════════════════════════════════════════
-- GROUP 16: Triglycerides / TRIGLYCERIDES  →  keep Triglycerides (c42dcc61)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Triglycerides'
WHERE marker_name = 'TRIGLYCERIDES';

DELETE FROM logic_rules WHERE marker_id = '03c37848-9044-4db9-b9bb-e89bee38a910'; -- TRIGLYCERIDES
DELETE FROM lab_markers  WHERE id        = '03c37848-9044-4db9-b9bb-e89bee38a910';

-- ════════════════════════════════════════════════════════════════
-- GROUP 17: Vitamin B12 / VITAMIN B12  →  keep Vitamin B12 (38f83cb4)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Vitamin B12'
WHERE marker_name = 'VITAMIN B12';

DELETE FROM logic_rules WHERE marker_id = 'b9a6d196-cc35-47b9-89d1-430784ffeac2'; -- VITAMIN B12
DELETE FROM lab_markers  WHERE id        = 'b9a6d196-cc35-47b9-89d1-430784ffeac2';

-- ════════════════════════════════════════════════════════════════
-- GROUP 18: Vitamin D, 25 hydroxy / Vitamin D, 25-Hydroxy  →  keep Vitamin D, 25-Hydroxy (6fde185a)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Vitamin D, 25-Hydroxy'
WHERE marker_name = 'Vitamin D, 25 hydroxy';

DELETE FROM logic_rules WHERE marker_id = 'd3325026-422c-4cec-9f61-ff21eec3ae7b'; -- Vitamin D, 25 hydroxy
DELETE FROM lab_markers  WHERE id        = 'd3325026-422c-4cec-9f61-ff21eec3ae7b';

-- ════════════════════════════════════════════════════════════════
-- GROUP 19: VITAMIN D, 25-OH, TOTAL, IA / Vitamin D, 25-OH, TOTAL.IA
--           →  keep Vitamin D, 25-OH, TOTAL.IA (afa4dc22)
-- ════════════════════════════════════════════════════════════════
UPDATE user_lab_results SET marker_name = 'Vitamin D, 25-OH, TOTAL.IA'
WHERE marker_name = 'VITAMIN D, 25-OH, TOTAL, IA';

DELETE FROM logic_rules WHERE marker_id = '454decb3-de98-4f65-a1e9-8f4cffae6df7'; -- VITAMIN D, 25-OH, TOTAL, IA
DELETE FROM lab_markers  WHERE id        = '454decb3-de98-4f65-a1e9-8f4cffae6df7';

-- ════════════════════════════════════════════════════════════════
-- VERIFICATION — should return 0 rows
-- ════════════════════════════════════════════════════════════════
SELECT LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) AS normalized, COUNT(*) AS c
FROM lab_markers
GROUP BY LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
HAVING COUNT(*) > 1
ORDER BY normalized;
