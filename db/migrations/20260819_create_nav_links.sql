-- Migration: Nav links (top navigation dropdown affiliate/partner links)
-- Lets admins manage the links shown in the top nav dropdown (e.g. "25% Off Supplements")
-- independently from the Affiliate Products catalog — deleting a product should not also
-- remove it from the nav, and vice versa.
-- PHI: none — public marketing/affiliate links only.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS nav_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label         TEXT NOT NULL,                 -- shown in the dropdown, e.g. "Fullscript"
  url            TEXT NOT NULL,                 -- destination URL
  sort_order    INTEGER NOT NULL DEFAULT 0,     -- lower shows first
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nav_links_sort_order_idx ON nav_links(sort_order);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE nav_links ENABLE ROW LEVEL SECURITY;

-- Service role full access (used by the backend admin API)
CREATE POLICY "service_role_nav_links_all" ON nav_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- All authenticated users can read active links (this is what the nav dropdown shows)
CREATE POLICY "authenticated_read_active_nav_links" ON nav_links
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins can read all links, including inactive ones (needed for the Admin management tab)
CREATE POLICY "admin_read_all_nav_links" ON nav_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

COMMENT ON TABLE nav_links IS 'Links shown in the top nav dropdown (e.g. affiliate/partner links). Independent from affiliate_products — no PHI.';
COMMENT ON COLUMN nav_links.sort_order IS 'Display order in the dropdown, ascending (lower = shown first).';
