-- Fix: affiliate_products RLS — allow admins to read all rows (not just active)
-- The original affiliate_products_read policy filtered is_active = true,
-- which blocked admins from seeing inactive products in the Admin tab.
-- FOR ALL policies do NOT override FOR SELECT policies in Postgres.

-- Drop the old blanket read policy
DROP POLICY IF EXISTS "affiliate_products_read" ON affiliate_products;

-- Users see only active products
CREATE POLICY "affiliate_products_read_active" ON affiliate_products
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Admins see all products (active + inactive)
CREATE POLICY "affiliate_products_read_admin" ON affiliate_products
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
