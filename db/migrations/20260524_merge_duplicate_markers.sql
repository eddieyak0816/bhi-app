-- Merge all duplicate lab_marker rows into their canonical entries.
--
-- Background: The lab_markers table accumulated duplicate rows for the same
-- biological marker under different capitalisation/formatting variants
-- (e.g. TRIGLYCERIDES vs Triglycerides, VITAMIN B12 vs Vitamin B12).
-- PDF extraction and manual entry produced results under the duplicate names,
-- which caused bhasV2.ts score lookups to silently miss those results because
-- the scoring engine matches on the canonical name (case-insensitively via
-- normalizeName(), but the DB still has multiple rows that user_lab_results
-- can land under).
--
-- Pattern per group:
--   Step A: re-point user_lab_results rows to the canonical marker_name
--   Step B: delete logic_rules tied to the duplicate marker rows
--   Step C: delete the duplicate lab_markers rows
--
-- After all merges:
--   Step D: fix marker_category backfill (F86 used 'HbA1c' but canonical is
--           'Hemoglobin A1c' — ensure the surviving row is tagged nhls_score)
--
-- This script is idempotent: re-running it is safe because the duplicate rows
-- will already be gone on the second run (DELETEs are no-ops on missing rows,
-- UPDATEs match 0 rows when results are already under the canonical name).
--
-- Run in Supabase SQL Editor AFTER running:
--   20260524_add_marker_category_to_lab_markers.sql  (F86)
--
-- Canonical NHLS v2.3 scoring marker names (must be preserved exactly):
--   Fasting Glucose, Fasting Insulin, hs-CRP, Triglycerides, HDL,
--   Vitamin D, Vitamin B12, Hemoglobin A1c

-- ════════════════════════════════════════════════════════════════
-- GROUP 1: Triglycerides / TRIGLYCERIDES
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'Triglycerides'
WHERE marker_name IN ('TRIGLYCERIDES', 'triglycerides', 'Triglyceride');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('TRIGLYCERIDES', 'triglycerides', 'Triglyceride')
);

DELETE FROM lab_markers
WHERE name IN ('TRIGLYCERIDES', 'triglycerides', 'Triglyceride');

-- ════════════════════════════════════════════════════════════════
-- GROUP 2: Vitamin B12 / VITAMIN B12
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'Vitamin B12'
WHERE marker_name IN ('VITAMIN B12', 'vitamin b12', 'Vitamin B-12', 'VITAMIN B-12', 'B12', 'B-12');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('VITAMIN B12', 'vitamin b12', 'Vitamin B-12', 'VITAMIN B-12', 'B12', 'B-12')
);

DELETE FROM lab_markers
WHERE name IN ('VITAMIN B12', 'vitamin b12', 'Vitamin B-12', 'VITAMIN B-12', 'B12', 'B-12');

-- ════════════════════════════════════════════════════════════════
-- GROUP 3: Vitamin D / VITAMIN D
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'Vitamin D'
WHERE marker_name IN ('VITAMIN D', 'vitamin d', 'Vitamin D3', 'VITAMIN D3', 'Vitamin D, 25-Hydroxy',
                      'Vitamin D 25-OH', '25-OH Vitamin D', '25(OH)D');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('VITAMIN D', 'vitamin d', 'Vitamin D3', 'VITAMIN D3', 'Vitamin D, 25-Hydroxy',
                 'Vitamin D 25-OH', '25-OH Vitamin D', '25(OH)D')
);

DELETE FROM lab_markers
WHERE name IN ('VITAMIN D', 'vitamin d', 'Vitamin D3', 'VITAMIN D3', 'Vitamin D, 25-Hydroxy',
               'Vitamin D 25-OH', '25-OH Vitamin D', '25(OH)D');

-- ════════════════════════════════════════════════════════════════
-- GROUP 4: Fasting Glucose / GLUCOSE / Glucose (fasting)
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'Fasting Glucose'
WHERE marker_name IN ('GLUCOSE', 'Glucose', 'glucose', 'FASTING GLUCOSE',
                      'Glucose (fasting)', 'GLUCOSE FASTING', 'Fasting Blood Glucose');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('GLUCOSE', 'Glucose', 'glucose', 'FASTING GLUCOSE',
                 'Glucose (fasting)', 'GLUCOSE FASTING', 'Fasting Blood Glucose')
);

DELETE FROM lab_markers
WHERE name IN ('GLUCOSE', 'Glucose', 'glucose', 'FASTING GLUCOSE',
               'Glucose (fasting)', 'GLUCOSE FASTING', 'Fasting Blood Glucose');

-- ════════════════════════════════════════════════════════════════
-- GROUP 5: Fasting Insulin / INSULIN / Insulin (fasting)
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'Fasting Insulin'
WHERE marker_name IN ('INSULIN', 'Insulin', 'insulin', 'FASTING INSULIN',
                      'Insulin (fasting)', 'INSULIN FASTING', 'Fasting Blood Insulin');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('INSULIN', 'Insulin', 'insulin', 'FASTING INSULIN',
                 'Insulin (fasting)', 'INSULIN FASTING', 'Fasting Blood Insulin')
);

DELETE FROM lab_markers
WHERE name IN ('INSULIN', 'Insulin', 'insulin', 'FASTING INSULIN',
               'Insulin (fasting)', 'INSULIN FASTING', 'Fasting Blood Insulin');

-- ════════════════════════════════════════════════════════════════
-- GROUP 6: HDL / HDL Cholesterol / HDL-C
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'HDL'
WHERE marker_name IN ('HDL Cholesterol', 'HDL-C', 'HDL CHOLESTEROL', 'HDL-CHOLESTEROL',
                      'High Density Lipoprotein', 'HIGH DENSITY LIPOPROTEIN');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('HDL Cholesterol', 'HDL-C', 'HDL CHOLESTEROL', 'HDL-CHOLESTEROL',
                 'High Density Lipoprotein', 'HIGH DENSITY LIPOPROTEIN')
);

DELETE FROM lab_markers
WHERE name IN ('HDL Cholesterol', 'HDL-C', 'HDL CHOLESTEROL', 'HDL-CHOLESTEROL',
               'High Density Lipoprotein', 'HIGH DENSITY LIPOPROTEIN');

-- ════════════════════════════════════════════════════════════════
-- GROUP 7: Hemoglobin A1c (canonical for F84 scoring)
--           Duplicates: HbA1c, HEMOGLOBIN A1c (deleted in F84), A1C, HBA1C
-- ════════════════════════════════════════════════════════════════
-- Note: bhasV2.ts calls latest(results, 'Hemoglobin A1c').
--       normalizeName() strips hyphens/spaces so 'hemoglobina1c' is the key.
--       'HbA1c' normalises to 'hba1c' — different key, so it would NOT match.
--       All variants must be re-pointed to 'Hemoglobin A1c'.

UPDATE user_lab_results
SET marker_name = 'Hemoglobin A1c'
WHERE marker_name IN ('HbA1c', 'HBA1C', 'HEMOGLOBIN A1C', 'A1C', 'A1c',
                      'Glycated Hemoglobin', 'Glycohemoglobin', 'HbA1C');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('HbA1c', 'HBA1C', 'HEMOGLOBIN A1C', 'A1C', 'A1c',
                 'Glycated Hemoglobin', 'Glycohemoglobin', 'HbA1C')
);

DELETE FROM lab_markers
WHERE name IN ('HbA1c', 'HBA1C', 'HEMOGLOBIN A1C', 'A1C', 'A1c',
               'Glycated Hemoglobin', 'Glycohemoglobin', 'HbA1C');

-- ════════════════════════════════════════════════════════════════
-- GROUP 8: LDL / LDL Cholesterol / LDL-C (non-scoring — tidy up anyway)
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'LDL'
WHERE marker_name IN ('LDL Cholesterol', 'LDL-C', 'LDL CHOLESTEROL', 'LDL-CHOLESTEROL',
                      'Low Density Lipoprotein', 'LOW DENSITY LIPOPROTEIN');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('LDL Cholesterol', 'LDL-C', 'LDL CHOLESTEROL', 'LDL-CHOLESTEROL',
                 'Low Density Lipoprotein', 'LOW DENSITY LIPOPROTEIN')
);

DELETE FROM lab_markers
WHERE name IN ('LDL Cholesterol', 'LDL-C', 'LDL CHOLESTEROL', 'LDL-CHOLESTEROL',
               'Low Density Lipoprotein', 'LOW DENSITY LIPOPROTEIN');

-- ════════════════════════════════════════════════════════════════
-- GROUP 9: Total Cholesterol / CHOLESTEROL
-- ════════════════════════════════════════════════════════════════

UPDATE user_lab_results
SET marker_name = 'Total Cholesterol'
WHERE marker_name IN ('CHOLESTEROL', 'Cholesterol', 'cholesterol', 'TOTAL CHOLESTEROL',
                      'Total Chol', 'TOTAL CHOL');

DELETE FROM logic_rules
WHERE marker_id IN (
  SELECT id FROM lab_markers
  WHERE name IN ('CHOLESTEROL', 'Cholesterol', 'cholesterol', 'TOTAL CHOLESTEROL',
                 'Total Chol', 'TOTAL CHOL')
);

DELETE FROM lab_markers
WHERE name IN ('CHOLESTEROL', 'Cholesterol', 'cholesterol', 'TOTAL CHOLESTEROL',
               'Total Chol', 'TOTAL CHOL');

-- ════════════════════════════════════════════════════════════════
-- STEP D: Fix marker_category for 'Hemoglobin A1c'
--
-- The F86 migration (`20260524_add_marker_category_to_lab_markers.sql`)
-- backfilled nhls_score WHERE name IN (..., 'HbA1c') — but the canonical
-- row is named 'Hemoglobin A1c', not 'HbA1c'. That row got category =
-- 'additional' by default. Fix it now.
-- ════════════════════════════════════════════════════════════════

UPDATE lab_markers
SET marker_category = 'nhls_score'
WHERE name = 'Hemoglobin A1c';

-- Also ensure all 8 canonical scoring markers are tagged correctly
-- (defensive re-run of F86 backfill with the correct name set):
UPDATE lab_markers
SET marker_category = 'nhls_score'
WHERE name IN (
  'Fasting Glucose',
  'Fasting Insulin',
  'hs-CRP',
  'Triglycerides',
  'HDL',
  'Vitamin D',
  'Vitamin B12',
  'Hemoglobin A1c'
);

-- ════════════════════════════════════════════════════════════════
-- VERIFICATION — run these SELECTs to confirm results
-- ════════════════════════════════════════════════════════════════

-- Should return 0 rows (no duplicates remain):
SELECT LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) AS normalized, COUNT(*) as c
FROM lab_markers
GROUP BY LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
HAVING COUNT(*) > 1
ORDER BY normalized;

-- Should show 8 rows with marker_category = 'nhls_score':
SELECT name, marker_category, applicable_sex
FROM lab_markers
WHERE marker_category = 'nhls_score'
ORDER BY name;
