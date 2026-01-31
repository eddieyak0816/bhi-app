-- seed.sql: sample data for local/dev Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- resource_types
INSERT INTO resource_types (name) VALUES ('video') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('doctor') ON CONFLICT (name) DO NOTHING;
INSERT INTO resource_types (name) VALUES ('article') ON CONFLICT (name) DO NOTHING;

-- lab_markers
INSERT INTO lab_markers (id, name, unit, min_normal, max_normal)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Vitamin D', 'ng/mL', 30, 100),
  ('11111111-1111-4111-8111-111111111112', 'Blood Glucose', 'mg/dL', 70, 100),
  ('11111111-1111-4111-8111-111111111113', 'Cholesterol', 'mg/dL', 0, 200),
  ('11111111-1111-4111-8111-111111111114', 'HDL', 'mg/dL', 40, 500),
  ('11111111-1111-4111-8111-111111111115', 'LDL', 'mg/dL', 0, 100),
  ('11111111-1111-4111-8111-111111111116', 'Triglycerides', 'mg/dL', 0, 150),
  ('11111111-1111-4111-8111-111111111117', 'Blood Pressure Systolic', 'mmHg', 90, 120),
  ('11111111-1111-4111-8111-111111111118', 'Blood Pressure Diastolic', 'mmHg', 60, 80)
ON CONFLICT (name) DO NOTHING;

-- logic_rules
INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
VALUES
  ((SELECT id FROM lab_markers WHERE name='Vitamin D' LIMIT 1), 0, 30, 'Low D')
ON CONFLICT (marker_id, min_value, max_value) DO NOTHING;

-- resources
INSERT INTO resources (type, title, description, tags)
VALUES
  ('video', 'Understanding Low Vit D', 'Short video about Vitamin D deficiency and its effects', ARRAY['Low D']),
  ('article', 'Vitamin D Foods Guide', 'Complete guide to foods rich in vitamin D', ARRAY['Low D']),
  ('doctor', 'Dr. Jane Smith', 'Expert overview of vitamin D supplementation', ARRAY['Low D']),
  ('article', 'Blood Glucose Management', 'Tips and strategies for maintaining healthy blood glucose levels', ARRAY['High Glucose']),
  ('video', 'Cholesterol Explained', 'Understanding your cholesterol numbers and what they mean', ARRAY['High Cholesterol']),
  ('article', 'Heart Health Basics', 'Foundation of cardiovascular health and prevention', ARRAY['High Cholesterol']),
  ('doctor', 'Dr. Robert Johnson', 'Cardiologist specializing in cholesterol management', ARRAY['High Cholesterol']),
  ('video', 'Energy Levels & Sleep', 'How to improve energy naturally through sleep and nutrition', ARRAY['Low Energy']),
  ('article', 'Nutrition for Energy', 'Balanced meals to maintain stable energy throughout the day', ARRAY['Low Energy']),
  ('video', 'Weight Management Tips', 'Evidence-based strategies for sustainable weight loss', ARRAY['Weight Management'])
ON CONFLICT (title) DO NOTHING;

-- tags (persistent catalog used by the Admin tag-manager)
INSERT INTO tags (name) VALUES ('Low D') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Normal D') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('High Glucose') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('High Cholesterol') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Low Energy') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Weight Management') ON CONFLICT (name) DO NOTHING;

-- categories
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

-- health_goals
INSERT INTO health_goals (name, description) VALUES
  ('Weight Management', 'Strategies for healthy weight control and maintenance'),
  ('Energy Levels', 'Improving daily energy and reducing fatigue'),
  ('Blood Sugar Control', 'Managing blood glucose levels and insulin sensitivity'),
  ('Heart Health', 'Cardiovascular health and cholesterol management'),
  ('Inflammation', 'Reducing chronic inflammation and supporting immune health'),
  ('Other', 'Other health concerns and goals')
ON CONFLICT (name) DO NOTHING;
