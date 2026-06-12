-- F88 redesign: merge alert messages into logic_rules so ranges and warnings
-- are configured in one place (Admin → Markers → edit scoring rules).
--
-- alert_message: shown as a popup after lab entry when a result matches this rule.
--   NULL = no popup for this rule. Only the first matching rule's message fires.
-- alert_level: 'warning' or 'danger'. Controls popup colour.

ALTER TABLE logic_rules
  ADD COLUMN IF NOT EXISTS alert_message TEXT,
  ADD COLUMN IF NOT EXISTS alert_level   TEXT CHECK (alert_level IN ('warning','danger'));

-- Seed existing known rules with their hardcoded messages.
-- Matched by marker name + approximate range. Safe to skip if names differ.

-- Fasting Glucose: 100–125 warning
UPDATE logic_rules lr
SET alert_message = 'Your fasting glucose is in the pre-diabetic range. Early action can prevent progression.',
    alert_level   = 'warning'
WHERE lr.marker_id = (SELECT id FROM lab_markers WHERE name = 'Fasting Glucose' LIMIT 1)
  AND lr.min_value >= 99 AND lr.max_value <= 126
  AND lr.alert_message IS NULL;

-- Fasting Glucose: >=126 danger
UPDATE logic_rules lr
SET alert_message = 'Your fasting glucose suggests impaired glucose regulation.',
    alert_level   = 'danger'
WHERE lr.marker_id = (SELECT id FROM lab_markers WHERE name = 'Fasting Glucose' LIMIT 1)
  AND lr.min_value >= 126
  AND lr.alert_message IS NULL;

-- Fasting Insulin: 2.0–2.99 warning
UPDATE logic_rules lr
SET alert_message = 'Your insulin level is in a range that may indicate early insulin resistance.',
    alert_level   = 'warning'
WHERE lr.marker_id = (SELECT id FROM lab_markers WHERE name = 'Fasting Insulin' LIMIT 1)
  AND lr.min_value >= 2 AND lr.max_value < 3
  AND lr.alert_message IS NULL;

-- Fasting Insulin: >=3.0 danger
UPDATE logic_rules lr
SET alert_message = 'Your insulin level is elevated, which may indicate insulin resistance.',
    alert_level   = 'danger'
WHERE lr.marker_id = (SELECT id FROM lab_markers WHERE name = 'Fasting Insulin' LIMIT 1)
  AND lr.min_value >= 3
  AND lr.alert_message IS NULL;
