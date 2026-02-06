-- Migration: add optional category_id to tags table
-- Adds a nullable foreign key to categories so tags can be grouped by category

DO $$
BEGIN
  -- add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE tags ADD COLUMN category_id UUID NULL;
  END IF;

  -- add foreign key constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'tags' AND tc.constraint_type = 'FOREIGN KEY' AND kcu.column_name = 'category_id'
  ) THEN
    ALTER TABLE tags ADD CONSTRAINT tags_category_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill: if there are tags that match an existing category name, link them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tags) THEN
    UPDATE tags t
    SET category_id = c.id
    FROM categories c
    WHERE t.category_id IS NULL AND lower(t.name) = lower(c.name);
  END IF;
END $$;
