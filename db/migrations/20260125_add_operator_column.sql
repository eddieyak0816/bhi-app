-- Add operator column to logic_rules table
ALTER TABLE logic_rules
ADD COLUMN operator VARCHAR(10) DEFAULT 'between';

-- Ensure all existing rules have a valid operator
UPDATE logic_rules
SET operator = 'between'
WHERE operator IS NULL;

-- Add constraint to ensure valid operators
ALTER TABLE logic_rules
ADD CONSTRAINT operator_valid_values
CHECK (operator IN ('between', '<', '>', '=', '<=', '>='));
