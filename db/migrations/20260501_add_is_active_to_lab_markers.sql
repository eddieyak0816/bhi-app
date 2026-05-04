-- Add is_active flag to lab_markers
-- Default true so all existing markers remain active

ALTER TABLE lab_markers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
