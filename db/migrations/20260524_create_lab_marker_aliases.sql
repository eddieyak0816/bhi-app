-- F87: Lab marker aliases table
--
-- Stores alternative names (from PDF extraction, manual entry, etc.) that
-- should be silently routed to a canonical lab_markers row.
--
-- Usage:
--   - Admin → Markers → Edit modal: add/remove aliases manually
--   - PDF review table: "Save as alias" checkbox creates an alias on save
--   - LabsPage fetches all aliases on load and resolves them before writing
--     user_lab_results, so marker_name is always the canonical name
--
-- The UNIQUE constraint on alias prevents one name mapping to two markers.
-- ON DELETE CASCADE means deleting a marker also deletes its aliases.

CREATE TABLE IF NOT EXISTS lab_marker_aliases (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alias      TEXT        NOT NULL,
  marker_id  UUID        NOT NULL REFERENCES lab_markers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alias)
);

-- Index for fast lookup by marker (used by GET /api/admin/lab-markers/:id/aliases)
CREATE INDEX IF NOT EXISTS idx_lab_marker_aliases_marker_id
  ON lab_marker_aliases (marker_id);

-- Verify
SELECT COUNT(*) AS alias_count FROM lab_marker_aliases;
