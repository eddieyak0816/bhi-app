-- F70: Add invite_code to organizations for anonymous org join
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate unique 8-character invite codes for all existing orgs
UPDATE organizations
SET invite_code = upper(substring(md5(random()::text || id::text) from 1 for 8))
WHERE invite_code IS NULL;
