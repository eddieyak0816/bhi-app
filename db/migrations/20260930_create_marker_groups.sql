-- Migration: interchangeable marker groups for the NHLS v2.3 score
--
-- Damon (2026-09-19): "Are you able to add c peptide, HOMA-IR and hemoglobin A1C to one
-- category" / "if any of these markers are scored it will produce a score".
--
-- The problem: HbA1c and HOMA-IR both measure glucose control, but the score counts them
-- as two separate points out of 8. A patient whose doctor ordered one and not the other
-- loses a point for a test they never had — not because of their health.
--
-- A group is one score slot that several markers can fill. The engine walks the group in
-- sort_order and scores the FIRST marker the patient has a value for. Damon's ordering
-- (2026-09-28) is clinical, not arbitrary: HbA1c and fructosamine reflect weeks-to-months,
-- so they outrank a single-moment c-peptide or HOMA-IR reading.
--
-- Two markers in one group = the score drops from 8 to 7, which Damon confirmed he wants.
--
-- Not aliases: lab_marker_aliases maps different SPELLINGS of one test to one marker
-- ("Vit B12" -> "Vitamin B12"). These are genuinely different tests with different values
-- and different ranges, so they need their own marker rows and their own scoring rules.
--
-- Run in Supabase Dashboard -> SQL Editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS marker_groups (
  group_key   TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Which markers fill a group, and in what priority order.
-- marker_name (not marker_id) so a group can name a marker that doesn't exist as a row
-- yet — the derived ratios (HOMA-IR) have no lab_markers row, and Damon can add
-- fructosamine/c-peptide later without the group breaking in the meantime.
CREATE TABLE IF NOT EXISTS marker_group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key   TEXT NOT NULL REFERENCES marker_groups(group_key) ON DELETE CASCADE,
  marker_name TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (group_key, marker_name)
);

CREATE INDEX IF NOT EXISTS idx_marker_group_members_group
  ON marker_group_members (group_key, sort_order);

-- ─── Seed: Damon's two groups ────────────────────────────────────────────────
INSERT INTO marker_groups (group_key, label, description, sort_order) VALUES
  ('glucose_control', 'Glucose Control',
   'Any one of these measures how the body handles sugar. The highest-priority result the patient has is the one that scores.', 1),
  ('b12_status', 'Vitamin B12',
   'Any one of these measures B12 status. The highest-priority result the patient has is the one that scores.', 5)
ON CONFLICT (group_key) DO NOTHING;

-- Damon's order, 2026-09-28: "hgb A1c, fructosamine, then c peptide then HOMA-IR as the
-- first two are over a period of weeks and months" and "for b12 let's use order of MMA,
-- RBC B12, then b12 for weight of results."
INSERT INTO marker_group_members (group_key, marker_name, sort_order) VALUES
  ('glucose_control', 'Hemoglobin A1c', 1),
  ('glucose_control', 'Fructosamine',   2),
  ('glucose_control', 'C-Peptide',      3),
  ('glucose_control', 'HOMA-IR',        4),
  ('b12_status',      'Methylmalonic Acid', 1),
  ('b12_status',      'RBC B12',            2),
  ('b12_status',      'Vitamin B12',        3)
ON CONFLICT (group_key, marker_name) DO NOTHING;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Same policy shape as lab_markers and logic_rules, which these sit alongside.
-- Members need read access because the score is computed in the browser.
-- No PHI here — group names and marker names only.
ALTER TABLE marker_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marker_group_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marker_groups'
                 AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON marker_groups
      FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marker_group_members'
                 AND policyname = 'Enable read access for all users') THEN
    CREATE POLICY "Enable read access for all users" ON marker_group_members
      FOR SELECT TO public USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marker_groups'
                 AND policyname = 'service_role_marker_groups_all') THEN
    CREATE POLICY "service_role_marker_groups_all" ON marker_groups
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'marker_group_members'
                 AND policyname = 'service_role_marker_group_members_all') THEN
    CREATE POLICY "service_role_marker_group_members_all" ON marker_group_members
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMENT ON TABLE marker_groups IS 'One NHLS score slot that several interchangeable markers can fill. Empty table = engine falls back to its built-in 8 metrics.';
COMMENT ON COLUMN marker_group_members.sort_order IS 'Priority: the engine scores the first marker in this order that the patient has a value for.';
