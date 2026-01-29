-- Migration: Add min/max reference ranges to lab_markers
-- This allows admins to define normal/optimal ranges for each marker
-- Users see these ranges when entering lab results

-- Add columns for reference ranges
ALTER TABLE lab_markers ADD COLUMN IF NOT EXISTS min_normal NUMERIC DEFAULT NULL;
ALTER TABLE lab_markers ADD COLUMN IF NOT EXISTS max_normal NUMERIC DEFAULT NULL;

-- Add unique constraint on name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lab_markers_name_unique'
  ) THEN
    ALTER TABLE lab_markers ADD CONSTRAINT lab_markers_name_unique UNIQUE (name);
  END IF;
END $$;

-- Insert the 7 common markers with reference ranges
INSERT INTO lab_markers (name, unit, min_normal, max_normal) VALUES
  ('Blood Glucose', 'mg/dL', 70, 100),
  ('Cholesterol', 'mg/dL', 0, 200),
  ('HDL', 'mg/dL', 40, 500),
  ('LDL', 'mg/dL', 0, 100),
  ('Triglycerides', 'mg/dL', 0, 150),
  ('Blood Pressure Systolic', 'mmHg', 90, 120),
  ('Blood Pressure Diastolic', 'mmHg', 60, 80)
ON CONFLICT (name) DO UPDATE SET
  unit = EXCLUDED.unit,
  min_normal = EXCLUDED.min_normal,
  max_normal = EXCLUDED.max_normal;

-- Add comment for clarity
COMMENT ON COLUMN lab_markers.min_normal IS 'Minimum normal/optimal value for this marker';
COMMENT ON COLUMN lab_markers.max_normal IS 'Maximum normal/optimal value for this marker';
