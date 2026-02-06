-- Migration: add unique constraint on tags.name
-- Ensures tags cannot have duplicate names; allows duplicate error on insert/update

-- Check if constraint already exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tags' AND constraint_name = 'tags_name_key'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_name_key UNIQUE (name);
  END IF;
END $$;
