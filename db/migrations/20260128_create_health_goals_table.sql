-- Migration: Create health_goals table for user profile preferences

-- Create health_goals table
CREATE TABLE IF NOT EXISTS health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_health_goals_updated_at ON health_goals;
CREATE TRIGGER update_health_goals_updated_at BEFORE UPDATE ON health_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read health goals
CREATE POLICY "Anyone can view health goals" ON health_goals
  FOR SELECT USING (true);

-- Only admins can modify health goals (handled at application level)
CREATE POLICY "Admins can insert health goals" ON health_goals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update health goals" ON health_goals
  FOR UPDATE USING (true);

CREATE POLICY "Admins can delete health goals" ON health_goals
  FOR DELETE USING (true);

-- Insert some default health goals
INSERT INTO health_goals (name, description, is_active) VALUES
  ('Weight Management', 'Focus on achieving and maintaining a healthy weight', true),
  ('Energy & Vitality', 'Improve daily energy levels and reduce fatigue', true),
  ('Heart Health', 'Support cardiovascular health and circulation', true),
  ('Digestive Health', 'Improve gut health and digestion', true),
  ('Immune Support', 'Strengthen immune system function', true),
  ('Mental Clarity', 'Enhance cognitive function and mental focus', true),
  ('Sleep Quality', 'Improve sleep patterns and restfulness', true),
  ('Stress Management', 'Better manage stress and anxiety', true),
  ('Hormone Balance', 'Support healthy hormone levels', true),
  ('Bone & Joint Health', 'Maintain strong bones and healthy joints', true),
  ('Skin Health', 'Support healthy skin, hair, and nails', true),
  ('Blood Sugar Balance', 'Maintain healthy blood sugar levels', true)
ON CONFLICT (name) DO NOTHING;

-- Add is_active column to resource_types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resource_types' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE resource_types ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;
