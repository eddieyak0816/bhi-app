-- Migration: Create categories table for resource categorization
-- Categories are independent from Tags - a resource can have multiple categories AND multiple tags

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (safe to run multiple times)
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;

-- Create policies
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Admins can delete categories" ON categories FOR DELETE USING (true);

-- Add categories column to resources table (array of category names for simplicity)
-- This allows multiple categories per resource
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'categories'
  ) THEN
    ALTER TABLE resources ADD COLUMN categories TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Insert some default health-related categories
INSERT INTO categories (name, description, is_active) VALUES
  ('Diabetes', 'Resources related to diabetes management and prevention', true),
  ('Heart Health', 'Cardiovascular health and circulation', true),
  ('Thyroid', 'Thyroid function and related conditions', true),
  ('Hormone Health', 'Hormone balance and endocrine health', true),
  ('Gut Health', 'Digestive system and microbiome', true),
  ('Weight Management', 'Healthy weight and metabolism', true),
  ('Mental Health', 'Cognitive function, stress, and emotional wellness', true),
  ('Immune System', 'Immune function and autoimmune conditions', true),
  ('Sleep', 'Sleep quality and circadian rhythm', true),
  ('Nutrition', 'Diet, supplements, and nutritional guidance', true)
ON CONFLICT (name) DO NOTHING;
