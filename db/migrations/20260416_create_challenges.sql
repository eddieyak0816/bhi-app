-- Migration: Challenge feature (head-to-head org competition)
-- Links 2+ orgs into a time-boxed challenge.
-- Duration: 9 months. Lab cadence: baseline at 0 months + follow-up at 6 months.
-- NHL admin creates challenges. Participants see their org's aggregate standing.
-- PHI: challenge results show org-level aggregates only — no individual data.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

-- ─── Challenges table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenges (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  starts_at    DATE NOT NULL,
  ends_at      DATE NOT NULL,  -- typically starts_at + 9 months
  baseline_at  DATE NOT NULL,  -- lab snapshot date at start (month 0)
  midpoint_at  DATE NOT NULL,  -- lab snapshot date at month 6
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Challenge org participants ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS challenge_orgs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, org_id)
);

CREATE INDEX IF NOT EXISTS challenge_orgs_challenge_id_idx ON challenge_orgs(challenge_id);
CREATE INDEX IF NOT EXISTS challenge_orgs_org_id_idx ON challenge_orgs(org_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_challenges_all" ON challenges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_challenge_orgs_all" ON challenge_orgs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can read active challenges
CREATE POLICY "authenticated_read_active_challenges" ON challenges
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_read_challenge_orgs" ON challenge_orgs
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE challenges IS 'Head-to-head org competitions. 9-month duration, 0+6-month lab cadence. NHL admin creates. PHI: results are org-level aggregates only.';
COMMENT ON TABLE challenge_orgs IS 'Orgs participating in a challenge.';
