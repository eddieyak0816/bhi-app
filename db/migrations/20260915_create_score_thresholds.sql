-- Migration: Admin-editable NHLS v2.3 score thresholds
--
-- Damon asked: "Or is there a way where I can adjust those scores". Until now every
-- threshold lived in src/utils/bhasV2.ts, so each clinical tweak needed a code change.
-- This table holds them instead; bhasV2.ts reads from here and falls back to the same
-- hardcoded defaults if the table is empty or unreachable, so scoring can never break.
--
-- Seeded with the EXACT values currently in bhasV2.ts, so running this changes nobody's
-- score. The one intentional change is Vitamin B12 gaining an Improvement tier
-- (500-750) per Damon 2026-09-14 — previously it was pass/fail at >750, which flagged
-- normal lab values as "Out of Range".
--
-- Not included: Advance Care Plan (a yes/no checkbox, no thresholds to tune) and which
-- metrics are scored at all (the 8-point total and derived formulas assume a fixed set).
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS score_thresholds (
  metric_key      TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  unit            TEXT,
  optimal_value   NUMERIC NOT NULL,
  improvement_value NUMERIC NOT NULL,
  lower_is_better BOOLEAN NOT NULL DEFAULT TRUE,
  description     TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with current bhasV2.ts values. ON CONFLICT DO NOTHING so re-running never
-- overwrites thresholds Damon has since adjusted.
INSERT INTO score_thresholds
  (metric_key, label, unit, optimal_value, improvement_value, lower_is_better, description, sort_order)
VALUES
  ('homa_ir',    'HOMA-IR',               '',       2.0,  3.0,  TRUE,  'Insulin resistance, calculated from Fasting Insulin x Fasting Glucose / 405. Optimal below the first value; Improvement between the two.', 1),
  ('hs_crp',     'hs-CRP',                'mg/L',   1.0,  3.0,  TRUE,  'Inflammation marker. Optimal below the first value; Improvement between the two.', 2),
  ('tg_hdl',     'TG/HDL Ratio',          '',       2.0,  3.0,  TRUE,  'Triglycerides divided by HDL. Optimal below the first value; Improvement between the two.', 3),
  ('hba1c',      'Hemoglobin A1c',        '%',      5.7,  6.5,  TRUE,  'Average blood sugar. Optimal below the first value; Improvement between the two.', 4),
  ('wthr',       'Waist-to-Height Ratio', '',       0.50, 0.56, TRUE,  'Waist divided by height. Optimal below the first value; Improvement between the two.', 5),
  ('vitamin_d',  'Vitamin D',             'ng/mL',  50,   30,   FALSE, 'Optimal above the first value; Improvement between the two. Higher is better.', 6),
  ('vitamin_b12','Vitamin B12',           'pg/mL',  750,  500,  FALSE, 'Optimal above the first value; Improvement between the two. Higher is better.', 7)
ON CONFLICT (metric_key) DO NOTHING;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE score_thresholds ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by the backend admin API)
CREATE POLICY "service_role_score_thresholds_all" ON score_thresholds
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Every signed-in member needs to read these — the score is calculated in the browser.
CREATE POLICY "authenticated_read_score_thresholds" ON score_thresholds
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE score_thresholds IS 'Admin-editable cutoffs for the NHLS v2.3 score. bhasV2.ts reads these, falling back to its hardcoded defaults if unavailable.';
COMMENT ON COLUMN score_thresholds.lower_is_better IS 'TRUE: optimal is BELOW optimal_value (e.g. HbA1c). FALSE: optimal is ABOVE it (e.g. Vitamin D).';
