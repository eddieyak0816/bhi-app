-- Migration: League / cross-org leaderboard (above organizations layer)
-- Leagues group multiple orgs under one competitive umbrella.
-- NHL admin creates leagues. Each league has a duration (default 9 months).
-- PHI: league leaderboard shows username + public_id + org name + BHAS score only.
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

-- ─── Leagues table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  starts_at   DATE NOT NULL,
  ends_at     DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── League org memberships ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS league_orgs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id  UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (league_id, org_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS league_orgs_league_id_idx ON league_orgs(league_id);
CREATE INDEX IF NOT EXISTS league_orgs_org_id_idx ON league_orgs(org_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_orgs ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_leagues_all" ON leagues
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_league_orgs_all" ON league_orgs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Any authenticated user can read active leagues (community engagement)
CREATE POLICY "authenticated_read_active_leagues" ON leagues
  FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

-- Org admins and app admins can read which orgs are in a league
CREATE POLICY "authenticated_read_league_orgs" ON league_orgs
  FOR SELECT USING (auth.uid() IS NOT NULL);

COMMENT ON TABLE leagues IS 'Cross-org competitive leagues. NHL admin creates. PHI: league leaderboard exposes username + public_id + org name + BHAS score only.';
COMMENT ON TABLE league_orgs IS 'Maps organizations into leagues for cross-org competition.';
