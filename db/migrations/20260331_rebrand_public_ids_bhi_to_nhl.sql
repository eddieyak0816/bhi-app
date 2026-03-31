-- Migration: Rebrand public_id prefix BHI- → NHL-
-- Run in: Supabase Dashboard → SQL Editor
-- Safe to re-run: only updates rows that still have the BHI- prefix

UPDATE profiles
SET public_id = 'NHL-' || substring(public_id FROM 5)
WHERE public_id LIKE 'BHI-%';
