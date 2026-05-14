-- Migration: Add applicable_sex column to lab_markers
-- Allows markers to be designated as male-only, female-only, or universal (both)

ALTER TABLE lab_markers
  ADD COLUMN IF NOT EXISTS applicable_sex TEXT NOT NULL DEFAULT 'both'
  CHECK (applicable_sex IN ('male', 'female', 'both'));

-- Update existing sex-specific waist circumference markers
UPDATE lab_markers SET applicable_sex = 'male'   WHERE name = 'Waist Circumference (Male)';
UPDATE lab_markers SET applicable_sex = 'female' WHERE name = 'Waist Circumference (Female)';

-- Update hormone markers
UPDATE lab_markers SET applicable_sex = 'male'   WHERE name IN ('Free T (Male)', 'Total T (Male)', 'Estrogen (Male)', 'PSA');
UPDATE lab_markers SET applicable_sex = 'female' WHERE name IN ('Free T (Female)', 'Total T (Female)', 'Estradiol (Female)');
