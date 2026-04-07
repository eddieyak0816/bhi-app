-- F24/F25: Affiliate product catalog
-- Creates affiliate_products and product_tags tables with RLS.
-- Run in Supabase Dashboard → SQL Editor.

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS affiliate_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url   TEXT,
  affiliate_url TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Join table: product ↔ health tags (matched against user result tags)
CREATE TABLE IF NOT EXISTS product_tags (
  product_id  UUID NOT NULL REFERENCES affiliate_products(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  PRIMARY KEY (product_id, tag)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags       ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active products (needed for user-facing display)
CREATE POLICY "affiliate_products_read" ON affiliate_products
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins can do full CRUD — identified by role column on profiles
CREATE POLICY "affiliate_products_admin" ON affiliate_products
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- product_tags: read for all authenticated (needed to match tags)
CREATE POLICY "product_tags_read" ON product_tags
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "product_tags_admin" ON product_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
