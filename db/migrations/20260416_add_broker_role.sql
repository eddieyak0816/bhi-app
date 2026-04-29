-- Migration: Broker role
-- Brokers manage multiple orgs and can view de-identified aggregate reports
-- across all their assigned orgs. They cannot edit resources or affiliate links.
--
-- Implementation:
--   - New table: broker_orgs maps a broker user to one or more organizations
--   - profiles.role gains a new allowed value: 'broker'
--   - Brokers are app-level users (not org-level), assigned by NHL admin
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

-- Extend the role check on profiles to include 'broker'
-- (Supabase does not support ALTER CONSTRAINT directly — drop and recreate)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'admin', 'super_admin', 'broker'));

-- ─── Broker org assignments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS broker_orgs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (broker_id, org_id)
);

CREATE INDEX IF NOT EXISTS broker_orgs_broker_id_idx ON broker_orgs(broker_id);
CREATE INDEX IF NOT EXISTS broker_orgs_org_id_idx ON broker_orgs(org_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE broker_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_broker_orgs_all" ON broker_orgs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Brokers can read their own assignments
CREATE POLICY "broker_read_own_assignments" ON broker_orgs
  FOR SELECT USING (broker_id = auth.uid());

COMMENT ON TABLE broker_orgs IS 'Maps broker users to organizations they manage. Brokers get aggregate-only, de-identified reports. Cannot edit resources or affiliate links.';
COMMENT ON COLUMN broker_orgs.broker_id IS 'User with profiles.role = broker';
