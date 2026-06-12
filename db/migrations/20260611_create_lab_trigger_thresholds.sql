-- F88: Lab trigger message thresholds — editable by admin
-- Stores warning/danger thresholds for each marker so Damon can adjust them
-- without code changes. Loaded by the server and served to the frontend.

CREATE TABLE IF NOT EXISTS lab_trigger_thresholds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marker_name     TEXT NOT NULL,
  sex             TEXT CHECK (sex IN ('male', 'female', 'both')) DEFAULT 'both',
  level           TEXT NOT NULL CHECK (level IN ('warning', 'danger')),
  condition       TEXT NOT NULL,  -- e.g. 'between', '>=', '<', '<='
  min_value       NUMERIC,        -- lower bound (inclusive), null if not applicable
  max_value       NUMERIC,        -- upper bound (inclusive), null if not applicable
  headline        TEXT NOT NULL,
  body            TEXT NOT NULL,
  actions         TEXT[] NOT NULL DEFAULT '{}',
  escalate        TEXT,           -- null = no escalation note
  sort_order      INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Seed with current hardcoded defaults so nothing changes on first deploy

-- Fasting Glucose
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Fasting Glucose','both','warning','between',100,125,
  'Your fasting glucose is elevated',
  'Your fasting glucose is in the pre-diabetic range. Early action can prevent progression.',
  ARRAY['Reduce refined carbohydrates and added sugars','Walk for 10–15 minutes after meals','Prioritize 7–8 hours of quality sleep','Include protein with every meal to blunt glucose spikes'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Fasting Glucose' AND level='warning');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Fasting Glucose','both','danger','>=',126,NULL,
  'Your fasting glucose is significantly elevated',
  'Your fasting glucose suggests impaired glucose regulation.',
  ARRAY['Follow a structured whole-food nutrition plan','Add resistance training 3x per week','Consider time-restricted eating (e.g. 8–10 hour eating window)'],
  'We recommend reviewing these results with a healthcare provider.', 2
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Fasting Glucose' AND level='danger');

-- Fasting Insulin
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Fasting Insulin','both','warning','between',2.0,2.99,
  'Your insulin sensitivity is starting to decline',
  'Your insulin level is in a range that may indicate early insulin resistance.',
  ARRAY['Include protein with each meal','Reduce processed carbohydrates','Walk after meals to improve glucose uptake','Aim for 7–8 hours of sleep per night'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Fasting Insulin' AND level='warning');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Fasting Insulin','both','danger','>=',3.0,NULL,
  'Your results suggest reduced insulin sensitivity',
  'Your insulin level is elevated, which may indicate insulin resistance.',
  ARRAY['Follow a structured nutrition plan focused on whole foods','Add resistance training at least 3x per week','Consider time-restricted eating (e.g. 8–10 hour eating window)'],
  'We recommend reviewing these results with a healthcare provider.', 2
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Fasting Insulin' AND level='danger');

-- hs-CRP
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'hs-CRP','both','warning','between',1.0,3.0,
  'Your inflammation markers are slightly elevated',
  'Low-grade inflammation can contribute to long-term health risks if left unaddressed.',
  ARRAY['Prioritize 7–9 hours of quality sleep','Add omega-3 rich foods (salmon, sardines, walnuts)','Reduce processed foods and alcohol','Incorporate daily movement or light exercise'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='hs-CRP' AND level='warning');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'hs-CRP','both','danger','>',3.0,NULL,
  'Your inflammation level is elevated',
  'Elevated hs-CRP is associated with increased cardiovascular and metabolic risk.',
  ARRAY['Focus on a whole-food, anti-inflammatory diet','Prioritize sleep and stress reduction','Add daily movement — even a 20-minute walk helps'],
  'A follow-up with a healthcare provider is recommended.', 2
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='hs-CRP' AND level='danger');

-- Vitamin D
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Vitamin D','both','warning','between',20.0,49.99,
  'Your Vitamin D level is below optimal',
  'Vitamin D supports immune function, bone health, and mood regulation.',
  ARRAY['Get 15–20 minutes of direct sun exposure daily when possible','Consider a Vitamin D3 supplement (consult your provider for dosing)','Eat Vitamin D-rich foods: fatty fish, egg yolks, fortified dairy'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Vitamin D' AND level='warning');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Vitamin D','both','danger','<',NULL,20.0,
  'Your Vitamin D level is low',
  'A Vitamin D level below 20 ng/mL is considered deficient and may affect multiple body systems.',
  ARRAY['Start a Vitamin D3 supplement — dosing should be guided by your provider','Recheck levels in 8–12 weeks after supplementing'],
  'We recommend reviewing this with a provider to determine the right supplementation dose.', 2
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Vitamin D' AND level='danger');

-- Vitamin B12
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Vitamin B12','both','warning','between',300.0,499.99,
  'Your B12 level is in a lower range',
  'Vitamin B12 is essential for nerve function, energy, and red blood cell production.',
  ARRAY['Increase B12-rich foods: meat, fish, eggs, dairy','Consider a B12 supplement, especially if you follow a plant-based diet'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Vitamin B12' AND level='warning');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Vitamin B12','both','danger','<',NULL,300.0,
  'Your B12 level is low',
  'Low B12 can cause fatigue, neurological symptoms, and anemia over time.',
  ARRAY['Start targeted B12 supplementation (methylcobalamin preferred)','Re-evaluate levels after 8–12 weeks'],
  'A provider can help determine the best supplementation approach and rule out absorption issues.', 2
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Vitamin B12' AND level='danger');

-- Triglycerides
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Triglycerides','both','warning','between',100.0,199.99,
  'Your triglycerides are slightly elevated',
  'Mildly elevated triglycerides are often diet and lifestyle related.',
  ARRAY['Reduce added sugars and refined carbohydrates','Limit alcohol intake','Increase physical activity','Pay attention to meal timing — avoid large late-night meals'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Triglycerides' AND level='warning');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'Triglycerides','both','danger','>=',200.0,NULL,
  'Your triglyceride levels are elevated',
  'High triglycerides increase cardiovascular risk and are often tied to metabolic health.',
  ARRAY['Switch to a whole-food nutrition plan — prioritize vegetables, protein, and healthy fats','Add regular exercise (aim for 150+ minutes per week)','Work on weight management if applicable'],
  'We recommend reviewing this with a healthcare provider.', 2
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='Triglycerides' AND level='danger');

-- HDL (sex-specific)
INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'HDL','male','warning','<',NULL,40.0,
  'Your HDL is lower than optimal',
  'HDL ("good" cholesterol) helps remove other forms of cholesterol from your bloodstream.',
  ARRAY['Increase aerobic physical activity (brisk walking, cycling, swimming)','Add healthy fats: olive oil, avocado, nuts, fatty fish','Prioritize sleep and reduce chronic stress','Quit smoking if applicable — it significantly raises HDL'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='HDL' AND sex='male');

INSERT INTO lab_trigger_thresholds (marker_name, sex, level, condition, min_value, max_value, headline, body, actions, escalate, sort_order)
SELECT 'HDL','female','warning','<',NULL,50.0,
  'Your HDL is lower than optimal',
  'HDL ("good" cholesterol) helps remove other forms of cholesterol from your bloodstream.',
  ARRAY['Increase aerobic physical activity (brisk walking, cycling, swimming)','Add healthy fats: olive oil, avocado, nuts, fatty fish','Prioritize sleep and reduce chronic stress','Quit smoking if applicable — it significantly raises HDL'],
  NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM lab_trigger_thresholds WHERE marker_name='HDL' AND sex='female');

-- Enable RLS (no PHI — admin-only write, public read for frontend use)
ALTER TABLE lab_trigger_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read trigger thresholds"
  ON lab_trigger_thresholds FOR SELECT USING (true);

CREATE POLICY "service role can modify trigger thresholds"
  ON lab_trigger_thresholds FOR ALL USING (auth.role() = 'service_role');
