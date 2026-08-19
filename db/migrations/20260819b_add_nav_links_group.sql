-- Migration: Add group_label to nav_links
-- Lets one nav_links table support multiple separate nav dropdown menus, not just one
-- ("25% Off Supplements", plus e.g. "Wellness Partners" — any name an admin types).
-- A dropdown only appears in the nav once it has at least one active link in that group.
--
-- Run in Supabase Dashboard → SQL Editor. Idempotent — safe to re-run.

ALTER TABLE nav_links ADD COLUMN IF NOT EXISTS group_label TEXT NOT NULL DEFAULT '25% Off Supplements';

COMMENT ON COLUMN nav_links.group_label IS 'Which nav dropdown menu this link belongs to. The nav shows one dropdown per distinct group_label that has ≥1 active link.';
