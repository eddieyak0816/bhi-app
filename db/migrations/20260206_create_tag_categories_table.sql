-- Migration: create tag_categories join table (many-to-many tags <-> categories)

CREATE TABLE IF NOT EXISTS tag_categories (
  tag_name TEXT NOT NULL,
  category_id UUID NOT NULL,
  PRIMARY KEY (tag_name, category_id),
  FOREIGN KEY (tag_name) REFERENCES tags(name) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Backfill from tags.category_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'category_id'
  ) THEN
    INSERT INTO tag_categories(tag_name, category_id)
    SELECT name, category_id FROM tags WHERE category_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
