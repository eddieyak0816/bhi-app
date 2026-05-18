-- Add duration_type to resources table for video length toggle feature
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS duration_type TEXT
    CHECK (duration_type IN ('short', 'long', 'both'))
    DEFAULT 'both';

-- Backfill existing rows
UPDATE resources SET duration_type = 'both' WHERE duration_type IS NULL;
