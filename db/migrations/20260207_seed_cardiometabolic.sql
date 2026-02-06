-- Migration: seed cardiometabolic category and tags
-- Idempotent: safe to run multiple times

DO $$
DECLARE
  cat_id UUID;
BEGIN
  -- Ensure category exists (case-insensitive match)
  SELECT id INTO cat_id FROM categories WHERE lower(name) = lower('Cardiometabolic Health') LIMIT 1;
  IF cat_id IS NULL THEN
    INSERT INTO categories (id, name, description, is_active)
    VALUES (gen_random_uuid(), 'Cardiometabolic Health', 'Group for cardiometabolic markers', true)
    RETURNING id INTO cat_id;
  END IF;

  -- Ensure tags exist (idempotent inserts)
  IF NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = lower('HsCRP')) THEN
    INSERT INTO tags (name) VALUES ('HsCRP');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = lower('Fasting glucose')) THEN
    INSERT INTO tags (name) VALUES ('Fasting glucose');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = lower('Fasting insulin')) THEN
    INSERT INTO tags (name) VALUES ('Fasting insulin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM tags WHERE lower(name) = lower('Triglycerides')) THEN
    INSERT INTO tags (name) VALUES ('Triglycerides');
  END IF;

  -- Map tags to the category in the join table
  INSERT INTO tag_categories (tag_name, category_id)
  SELECT t.name, cat_id
  FROM tags t
  WHERE lower(t.name) IN ('hscrp','fasting glucose','fasting insulin','triglycerides')
  ON CONFLICT DO NOTHING;

END $$;
