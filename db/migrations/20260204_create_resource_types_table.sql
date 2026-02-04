-- Create resource_types table for ProfilePage to query
CREATE TABLE IF NOT EXISTS resource_types (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add some default resource types
INSERT INTO resource_types (name) VALUES ('video') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('doctor') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('article') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('podcast') ON CONFLICT (name) DO NOTHING;
