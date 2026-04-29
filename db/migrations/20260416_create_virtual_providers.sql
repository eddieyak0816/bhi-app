-- Migration: Virtual provider links
-- Providers have a brief bio visible on main screen; click to expand full bio + details.
-- NHL admin or org admins can add providers. All members can view them.
-- Org-specific providers are scoped to an org; global providers are visible to all.
-- PHI: no PHI involved — provider info is public-facing professional info.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS virtual_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  title         TEXT,                          -- e.g., "MD", "NP", "Health Coach"
  specialty     TEXT,                          -- e.g., "Metabolic Health", "Nutrition"
  brief_bio     TEXT NOT NULL,                 -- shown on card (1–2 sentences)
  full_bio      TEXT,                          -- shown on expand
  link_url      TEXT,                          -- booking / telehealth link
  image_url     TEXT,                          -- optional headshot
  org_id        UUID REFERENCES organizations(id) ON DELETE CASCADE,
                                               -- NULL = visible to all members (global)
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS virtual_providers_org_id_idx ON virtual_providers(org_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE virtual_providers ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_virtual_providers_all" ON virtual_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- All authenticated users can read active providers
-- (global = org_id IS NULL; org-specific = user is a member of that org)
CREATE POLICY "authenticated_read_active_providers" ON virtual_providers
  FOR SELECT USING (
    is_active = true
    AND auth.uid() IS NOT NULL
    AND (
      org_id IS NULL
      OR EXISTS (
        SELECT 1 FROM org_memberships
        WHERE org_memberships.org_id = virtual_providers.org_id
          AND org_memberships.user_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE virtual_providers IS 'Virtual / telehealth provider cards shown to members. Global (org_id=NULL) or org-specific. No PHI stored here.';
COMMENT ON COLUMN virtual_providers.brief_bio IS 'Short description shown on the card without expanding (1-2 sentences).';
COMMENT ON COLUMN virtual_providers.org_id IS 'NULL = visible to all members. Set to restrict to a specific org.';
