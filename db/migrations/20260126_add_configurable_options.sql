-- Add tables for configurable health goals and content types
-- Migration: 20260126_add_configurable_options.sql

-- Create health_goals table
CREATE TABLE IF NOT EXISTS health_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE health_goals ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - can be restricted later)
CREATE POLICY "Allow all operations on health_goals" ON health_goals FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_goals_active ON health_goals(is_active);