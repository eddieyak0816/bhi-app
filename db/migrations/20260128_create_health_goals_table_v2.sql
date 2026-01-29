-- Migration: Create health_goals table (safe to run multiple times)

-- Create health_goals table if it doesn't exist
CREATE TABLE IF NOT EXISTS health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Drop and recreate trigger (safe)
DROP TRIGGER IF EXISTS update_health_goals_updated_at ON health_goals;
CREATE TRIGGER update_health_goals_updated_at BEFORE UPDATE ON health_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (safe to run multiple times)
ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then recreate
DROP POLICY IF EXISTS "Anyone can view health goals" ON health_goals;
DROP POLICY IF EXISTS "Admins can insert health goals" ON health_goals;
DROP POLICY IF EXISTS "Admins can update health goals" ON health_goals;
DROP POLICY IF EXISTS "Admins can delete health goals" ON health_goals;

CREATE POLICY "Anyone can view health goals" ON health_goals FOR SELECT USING (true);
CREATE POLICY "Admins can insert health goals" ON health_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update health goals" ON health_goals FOR UPDATE USING (true);
CREATE POLICY "Admins can delete health goals" ON health_goals FOR DELETE USING (true);

-- Insert default health goals (skip if already exist)
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
