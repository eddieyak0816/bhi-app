-- seed.sql: sample data for local/dev Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- resource_types
INSERT INTO resource_types (name) VALUES ('video') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('doctor') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('article') ON CONFLICT (name) DO NOTHING;

-- lab_markers
INSERT INTO lab_markers (id, name, unit)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Vitamin D', 'ng/mL')
ON CONFLICT (id) DO NOTHING;

-- logic_rules
INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
VALUES
  ((SELECT id FROM lab_markers WHERE name='Vitamin D' LIMIT 1), 0, 30, 'Low_D')
ON CONFLICT DO NOTHING;

-- resources
INSERT INTO resources (type, title, description, tags)
VALUES
  ('video', 'Understanding Low Vit D', 'Short video about Vitamin D deficiency and its effects', ARRAY['Low_D']),
  ('article', 'Vitamin D Foods Guide', 'Complete guide to foods rich in vitamin D', ARRAY['Low_D']),
  ('doctor', 'Dr. Jane Smith', 'Expert overview of vitamin D supplementation', ARRAY['Low_D']),
  ('article', 'Blood Glucose Management', 'Tips and strategies for maintaining healthy blood glucose levels', ARRAY['High_Glucose']),
  ('video', 'Cholesterol Explained', 'Understanding your cholesterol numbers and what they mean', ARRAY['High_Cholesterol']),
  ('article', 'Heart Health Basics', 'Foundation of cardiovascular health and prevention', ARRAY['High_Cholesterol']),
  ('doctor', 'Dr. Robert Johnson', 'Cardiologist specializing in cholesterol management', ARRAY['High_Cholesterol']),
  ('video', 'Energy Levels & Sleep', 'How to improve energy naturally through sleep and nutrition', ARRAY['Low_Energy']),
  ('article', 'Nutrition for Energy', 'Balanced meals to maintain stable energy throughout the day', ARRAY['Low_Energy']),
  ('video', 'Weight Management Tips', 'Evidence-based strategies for sustainable weight loss', ARRAY['Weight_Management'])
ON CONFLICT DO NOTHING;

-- tags (persistent catalog used by the Admin tag-manager)
INSERT INTO tags (name) VALUES ('Low_D') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Normal_D') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('High_Glucose') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('High_Cholesterol') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Low_Energy') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Weight_Management') ON CONFLICT (name) DO NOTHING;

-- health_goals
INSERT INTO health_goals (name, description) VALUES
  ('Weight Management', 'Strategies for healthy weight control and maintenance'),
  ('Energy Levels', 'Improving daily energy and reducing fatigue'),
  ('Blood Sugar Control', 'Managing blood glucose levels and insulin sensitivity'),
  ('Heart Health', 'Cardiovascular health and cholesterol management'),
  ('Inflammation', 'Reducing chronic inflammation and supporting immune health'),
  ('Other', 'Other health concerns and goals')
ON CONFLICT (name) DO NOTHING;
