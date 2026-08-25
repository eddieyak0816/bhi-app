-- Migration: Multi-org providers
-- Lets one virtual_provider be linked to SEVERAL specific organizations, not just one
-- (previous model: org_id was a single value, or NULL for "visible to everyone").
-- Requested by Damon: "need to be able to add a provider to multiple organizations as needed
-- not just one."
--
-- virtual_providers.org_id is left in place (not dropped) for safety/rollback, but is no
-- longer used to decide visibility once this migration runs — provider_orgs is now the source
-- of truth. A provider with zero rows here is Global (visible to everyone), same meaning
-- org_id IS NULL used to have.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS provider_orgs (
  provider_id   UUID NOT NULL REFERENCES virtual_providers(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider_id, org_id)
);

CREATE INDEX IF NOT EXISTS provider_orgs_org_id_idx ON provider_orgs(org_id);

-- Carry forward existing single-org assignments so behavior doesn't change for any provider
-- that already had one — only providers that were already org_id IS NULL (global) keep
-- meaning "zero rows = global" with nothing to migrate.
INSERT INTO provider_orgs (provider_id, org_id)
SELECT id, org_id FROM virtual_providers WHERE org_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE provider_orgs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_provider_orgs_all" ON provider_orgs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Members need to be able to read this table too, since the updated virtual_providers
-- visibility policy below joins through it.
CREATE POLICY "authenticated_read_provider_orgs" ON provider_orgs
  FOR SELECT TO authenticated USING (true);

-- ─── Replace virtual_providers' visibility policy to use provider_orgs instead of org_id ──
DROP POLICY IF EXISTS "authenticated_read_active_providers" ON virtual_providers;

CREATE POLICY "authenticated_read_active_providers" ON virtual_providers
  FOR SELECT USING (
    is_active = true
    AND auth.uid() IS NOT NULL
    AND (
      NOT EXISTS (SELECT 1 FROM provider_orgs WHERE provider_orgs.provider_id = virtual_providers.id)
      OR EXISTS (
        SELECT 1 FROM provider_orgs po
        JOIN org_memberships om ON om.org_id = po.org_id
        WHERE po.provider_id = virtual_providers.id AND om.user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE provider_orgs IS 'Which organizations a provider is visible to. Zero rows for a provider = global (visible to everyone), same meaning virtual_providers.org_id IS NULL used to have before this migration.';
