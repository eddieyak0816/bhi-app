-- seed.sql: sample data for local/dev Supabase
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  ('video', 'Understanding Low Vit D', 'Short video about Vitamin D', ARRAY['Low_D']),
  ('doctor', 'Dr. Jane Smith', 'Expert overview', ARRAY['Low_D'])
ON CONFLICT DO NOTHING;

-- tags (persistent catalog used by the Admin tag-manager)
INSERT INTO tags (name) VALUES ('Low_D') ON CONFLICT (name) DO NOTHING;
INSERT INTO tags (name) VALUES ('Normal_D') ON CONFLICT (name) DO NOTHING;
