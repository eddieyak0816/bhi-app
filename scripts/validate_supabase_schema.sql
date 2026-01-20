-- validate_supabase_schema.sql
-- Run this in the Supabase SQL editor or with psql. No persistent changes (tests that write are wrapped in a ROLLBACK).

-- 1) Basic: confirm tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lab_markers','logic_rules','resources','tags');

-- Expected: 4 rows (one per table)

-- 2) Check columns & types for each table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lab_markers'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'logic_rules'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'resources'
ORDER BY ordinal_position;

-- Expected highlights:
-- - lab_markers.id: uuid, default gen_random_uuid()
-- - logic_rules.marker_id: uuid (FK)
-- - resources.tags: data_type = ARRAY / udt_name = "_text" (text[])

-- 3) Verify primary / foreign key constraints
-- Primary key on lab_markers.id
SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  USING (constraint_name, constraint_schema, table_name)
WHERE tc.table_name = 'lab_markers'
  AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY');

-- Foreign key from logic_rules.marker_id -> lab_markers(id)
SELECT
  kcu.constraint_name,
  kcu.table_name AS child_table,
  kcu.column_name AS child_column,
  ccu.table_name AS parent_table,
  ccu.column_name AS parent_column
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu
  USING (constraint_name, constraint_schema)
WHERE kcu.table_name = 'logic_rules'
  AND kcu.column_name = 'marker_id';

-- 4) Check for gen_random_uuid() default on lab_markers.id
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'lab_markers' AND column_name = 'id';

-- Expected: column_default contains gen_random_uuid() or uuid_generate_v4() depending on implementation

-- 5) Row-Level Security (RLS) status + policies
SELECT c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
WHERE c.relname IN ('lab_markers','logic_rules','resources');

-- List active policies (if any)
SELECT * FROM pg_policies WHERE tablename IN ('lab_markers','logic_rules','resources');

-- Expected: relrowsecurity = true for tables that should be tenant-isolated; policies present to allow necessary operations.

-- 6) Sample-data checks (non-destructive)
SELECT * FROM lab_markers LIMIT 5;
SELECT * FROM logic_rules LIMIT 5;
SELECT * FROM resources LIMIT 5;

-- 7) Functional check: map a simulated lab input to resources (example: Vitamin D = 25)
-- This verifies logic_rules linking and tags-array matching
WITH m AS (
  SELECT id FROM lab_markers WHERE name ILIKE 'Vitamin D' LIMIT 1
), matching_rules AS (
  SELECT tag_to_apply FROM logic_rules
  WHERE marker_id = (SELECT id FROM m)
    AND 25 BETWEEN min_value AND max_value
)
SELECT r.*
FROM resources r
WHERE r.tags && (SELECT ARRAY(SELECT tag_to_apply FROM matching_rules));

-- Expected: returns resources tagged 'Low_D' when rules include range that contains 25

-- 8) Safety test: attempt a transient INSERT into `resources` using a validated type (non-destructive; wrapped in transaction + rollback)
-- Diagnostic: show existing `type` values and the CHECK constraint that enforces allowed types (helps explain failures).
SELECT DISTINCT type FROM resources;
SELECT conname, pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'resources'::regclass AND contype = 'c';

-- Choose an allowed type (prefer an existing value; otherwise extract one literal from the CHECK). If none found, the INSERT is skipped.
BEGIN;
  WITH chosen_type AS (
    SELECT COALESCE(
      (SELECT type FROM resources LIMIT 1),
      (SELECT (regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)'''))[1]
       FROM pg_constraint c
       JOIN pg_class t ON t.oid = c.conrelid
       WHERE t.relname = 'resources' AND c.contype='c' AND c.conname='resources_type_check'
       LIMIT 1)
    ) AS type
  )
  INSERT INTO resources (type, title, tags)
  SELECT type, 'schema-validation (transient)', ARRAY['__validation_test__']
  FROM chosen_type
  WHERE type IS NOT NULL;

  -- show the transient row (if inserted)
  SELECT * FROM resources WHERE tags && ARRAY['__validation_test__'];
ROLLBACK;

-- Expected: when an allowed `type` is available the SELECT will show the transient row inside the transaction; otherwise the insert will be skipped and diagnostics above will explain why.

-- 9) (Optional) Ensure no persistent storage of raw lab numeric values by searching for columns that might store values
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name ~* 'lab|test|result|measurement|value' AND table_schema='public'
ORDER BY table_name, column_name;

-- 10) Find numeric columns outside `logic_rules` (quick spotlight)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name <> 'logic_rules'
  AND data_type IN ('numeric','double precision','real','integer','smallint','bigint')
ORDER BY table_name, ordinal_position;

-- 11) Tables that contain BOTH a likely user identifier column and a numeric column (high-risk candidates)
-- This flags tables that may be storing user-linked numeric measurements.
SELECT c.table_name,
       BOOL_OR(c.column_name ~* 'email|user|account|employ|member|person') AS has_identifier_like_column,
       BOOL_OR(c.data_type IN ('numeric','double precision','real','integer','smallint','bigint')) AS has_numeric_column
FROM information_schema.columns c
WHERE c.table_schema='public'
GROUP BY c.table_name
HAVING BOOL_OR(c.column_name ~* 'email|user|account|employ|member|person')
   AND BOOL_OR(c.data_type IN ('numeric','double precision','real','integer','smallint','bigint'))
ORDER BY c.table_name;

-- 12) Optional: check opt-in storage scaffold `user_lab_values` and its RLS policy
-- Expected: table may exist but must have RLS enabled and a policy that prevents direct client writes.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_lab_values' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT c.relname AS table, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c
WHERE c.relname = 'user_lab_values';

SELECT conname, pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'user_lab_values'::regclass AND contype = 'c';

SELECT * FROM pg_policies WHERE tablename = 'user_lab_values';

-- Verify there is a deny-client-writes policy (name may vary)
SELECT count(*) AS deny_client_write_policies
FROM pg_policies
WHERE tablename = 'user_lab_values' AND (policyname ILIKE '%no_client%' OR policyname ILIKE '%deny%' OR policyname ILIKE '%client%');

-- Guidance:
-- * If `user_lab_values` exists, ensure RLS is enabled and client writes are denied. Any writes must go through a
--   trusted backend/service role calling a secured DB function.

-- End of checks

