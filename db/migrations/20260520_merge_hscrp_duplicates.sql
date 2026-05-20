-- Merge duplicate hs-CRP lab marker rows into the canonical 'hs-CRP' entry.
--
-- Three rows existed: 'hs-CRP' (canonical), 'Hs CRP', 'HS CRP'.
-- PDF extraction and manual entry produced the latter two, causing bhasV2.ts
-- score lookups (which match on 'hs-CRP') to silently miss those results.
--
-- Step 1: re-point all user_lab_results rows to the canonical marker name.
-- Step 2: delete the duplicate lab_markers rows.
-- Step 3: also delete any logic_rules and tags tied to the duplicates (cascade
--         would handle foreign keys, but listed explicitly for clarity).

-- Step 1: rename results stored under duplicate names to canonical name
UPDATE user_lab_results
SET marker_name = 'hs-CRP'
WHERE marker_name IN ('Hs CRP', 'HS CRP');

-- Step 2: remove logic_rules referencing the duplicate marker IDs
DELETE FROM logic_rules
WHERE marker_id IN (
  'cc758098-d765-4f4e-aa65-621d95b41ca6',  -- Hs CRP
  '8739971d-1178-4116-8250-9e2e282bf3d4'   -- HS CRP
);

-- Step 3: delete the duplicate lab_markers rows
DELETE FROM lab_markers
WHERE id IN (
  'cc758098-d765-4f4e-aa65-621d95b41ca6',  -- Hs CRP
  '8739971d-1178-4116-8250-9e2e282bf3d4'   -- HS CRP
);
