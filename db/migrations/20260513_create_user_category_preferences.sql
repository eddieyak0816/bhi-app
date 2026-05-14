-- Migration: Create user_category_preferences join table
-- Replaces health_goals user preferences with video/content category preferences

CREATE TABLE IF NOT EXISTS user_category_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_name)
);

-- Enable Row Level Security
ALTER TABLE user_category_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_category_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_category_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_category_preferences;

CREATE POLICY "Users can view own preferences" ON user_category_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_category_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences" ON user_category_preferences
  FOR DELETE USING (auth.uid() = user_id);
