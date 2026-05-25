-- F86: Add marker_category to lab_markers
-- Values: 'nhls_score' | 'hormone' | 'additional'
-- Default is 'additional' (catch-all for markers not explicitly categorised)

ALTER TABLE lab_markers
  ADD COLUMN IF NOT EXISTS marker_category TEXT
    CHECK (marker_category IN ('nhls_score', 'hormone', 'additional'))
    DEFAULT 'additional';

-- Backfill the 8 NHLS v2.3 scored markers
UPDATE lab_markers SET marker_category = 'nhls_score'
WHERE name IN (
  'Fasting Glucose',
  'Fasting Insulin',
  'hs-CRP',
  'Triglycerides',
  'HDL',
  'Vitamin D',
  'Vitamin B12',
  'HbA1c'
);

-- Backfill hormone markers (applicable_sex = male or female)
-- These were categorised as hormone in the applicable_sex migration;
-- marker_category makes this explicit and decouples the two concerns.
UPDATE lab_markers SET marker_category = 'hormone'
WHERE applicable_sex IN ('male', 'female');

-- Verify counts
SELECT marker_category, COUNT(*) FROM lab_markers GROUP BY marker_category ORDER BY marker_category;
