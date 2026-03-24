-- F49: Add thumbnail_url column to resources table
-- Stores the public URL of an image uploaded to the resource-thumbnails storage bucket.
-- Nullable — existing resources without a thumbnail are unaffected.

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT DEFAULT NULL;
