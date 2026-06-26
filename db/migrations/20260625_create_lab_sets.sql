-- F90: Lab Sets — Admin-managed timeframe labels (Initial, 3 Month Follow-Up, etc.)
-- Allows side-by-side comparison of lab results across time periods.

CREATE TABLE IF NOT EXISTS lab_sets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT        NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  is_initial  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: public SELECT, service role full access
ALTER TABLE lab_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_sets_select_all"
  ON lab_sets FOR SELECT
  USING (true);

CREATE POLICY "lab_sets_service_all"
  ON lab_sets FOR ALL
  USING (auth.role() = 'service_role');

-- Seed defaults
INSERT INTO lab_sets (label, sort_order, is_initial) VALUES
  ('Initial',           0, true),
  ('3 Month Follow-Up', 1, false),
  ('6 Month Follow-Up', 2, false)
ON CONFLICT DO NOTHING;

-- Add lab_set_id to user_lab_results
ALTER TABLE user_lab_results
  ADD COLUMN IF NOT EXISTS lab_set_id UUID REFERENCES lab_sets(id) ON DELETE SET NULL;
