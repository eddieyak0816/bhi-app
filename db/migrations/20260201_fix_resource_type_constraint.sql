-- Migration: Fix resources_type_check constraint to be dynamic
-- This constraint was preventing new resource types from being added.
-- We replace the hardcoded constraint with a foreign key relationship instead.

-- First, check if the old constraint exists and drop it
ALTER TABLE resources
DROP CONSTRAINT IF EXISTS resources_type_check;

-- Add a proper foreign key constraint that references the resource_types table
-- First ensure resource_types table has a unique constraint on name (it should have PRIMARY KEY)
ALTER TABLE resource_types
ADD CONSTRAINT resource_types_name_unique UNIQUE (name) ON CONFLICT DO NOTHING;

-- Now add the foreign key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'resources'
    AND constraint_name = 'resources_type_fk'
  ) THEN
    ALTER TABLE resources
    ADD CONSTRAINT resources_type_fk
    FOREIGN KEY (type) REFERENCES resource_types(name);
  END IF;
END $$;
