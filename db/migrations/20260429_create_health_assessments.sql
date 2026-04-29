-- Migration: F67 Health Assessment
-- Creates health_assessments table for lifestyle Yes/No inputs and symptom checklist.
-- PHI: user-scoped only. Never exposed in employer, broker, or league views.
-- Run in Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS health_assessments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Lifestyle inputs (Yes/No)
  sleep_ok      boolean,   -- "Do you get 7–9 hours of sleep most nights?"
  stress_ok     boolean,   -- "Is your stress generally manageable day to day?"
  exercise_ok   boolean,   -- "Do you exercise at least 150 minutes per week?"
  alcohol_ok    boolean,   -- "Do you drink more than one alcoholic beverage daily?" (true = NO problem = healthy)
  smoking_ok    boolean,   -- "Do you currently smoke or use tobacco?" (true = NO = healthy)
  diet_ok       boolean,   -- "Do 80%+ of meals come from whole/minimally processed foods?"
  -- Symptom checklist (true = symptom present)
  sym_sob       boolean DEFAULT false,  -- Shortness of breath
  sym_chest     boolean DEFAULT false,  -- Chest pain or palpitations
  sym_fatigue   boolean DEFAULT false,  -- Fatigue
  sym_headache  boolean DEFAULT false,  -- Headache
  sym_nausea    boolean DEFAULT false,  -- Nausea
  sym_diarrhea  boolean DEFAULT false,  -- Diarrhea
  sym_swallow   boolean DEFAULT false,  -- Difficulty swallowing
  sym_joint     boolean DEFAULT false,  -- Joint pain
  sym_back      boolean DEFAULT false,  -- Back pain
  sym_depressed boolean DEFAULT false,  -- Depressed
  sym_anxious   boolean DEFAULT false,  -- Anxious
  sym_heartburn boolean DEFAULT false,  -- Heartburn or GERD
  -- Metadata
  completed_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS health_assessments_user_id_idx ON health_assessments(user_id, completed_at DESC);

-- RLS
ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;

-- Users can only read and write their own assessments
CREATE POLICY "users_own_assessments_select" ON health_assessments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_own_assessments_insert" ON health_assessments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_own_assessments_update" ON health_assessments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_own_assessments_delete" ON health_assessments
  FOR DELETE USING (user_id = auth.uid());

-- Service role (backend) can read all — for aggregate employer stats only (de-identified)
CREATE POLICY "service_role_health_assessments_all" ON health_assessments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE health_assessments IS
  'PHI: lifestyle Yes/No inputs and symptom checklist per user. '
  'Never expose individual rows to employers, brokers, or leagues. '
  'Aggregate de-identified stats only (e.g. % of org reporting poor sleep).';
