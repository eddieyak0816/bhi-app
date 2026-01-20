-- tags.sql: simple persistent tags table for Admin tag manager

CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Note: this is intentionally minimal — tags are a simple catalog used by the Admin UI.
-- If you want richer metadata later (description, source, owner), expand this table and add
-- application-side constraints/permissions as needed.
