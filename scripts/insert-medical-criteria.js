const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fgduvnmsvkhrhcxykkyc.supabase.co';
const SERVICE_ROLE = 'sb_secret_0BaFhRcYEfojLAp9siIu9A_RHvzCSbG';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const criteria = [
  // Vitamin D (0-200 ng/mL, deficiency <20, insufficient 20-30, adequate 30-100, excess >100)
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 0, max: 20, tag: 'Deficient VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 20.1, max: 30, tag: 'Insufficient VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 30.1, max: 100, tag: 'Adequate VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 100.1, max: 10000, tag: 'Excess VitD' },
  
  // Blood Glucose (fasting, mg/dL)
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 0, max: 70, tag: 'Low Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 70.1, max: 100, tag: 'Normal Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 100.1, max: 126, tag: 'Prediabetic Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 126.1, max: 10000, tag: 'Diabetic Glucose' },
  
  // Total Cholesterol (mg/dL, ATP III guidelines)
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 0, max: 200, tag: 'Desirable Cholesterol' },
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 200.1, max: 240, tag: 'Borderline High Cholesterol' },
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 240.1, max: 10000, tag: 'High Cholesterol' },
  
  // HDL - Good Cholesterol (mg/dL, higher is better)
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 0, max: 40, tag: 'Low HDL' },
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 40.1, max: 59, tag: 'Fair HDL' },
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 60, max: 500, tag: 'Good HDL' },
  
  // LDL - Bad Cholesterol (mg/dL, lower is better)
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 0, max: 100, tag: 'Optimal LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 100.1, max: 130, tag: 'Near Optimal LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 130.1, max: 160, tag: 'Borderline High LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 160.1, max: 190, tag: 'High LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 190.1, max: 10000, tag: 'Very High LDL' },
  
  // Triglycerides (mg/dL)
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 0, max: 150, tag: 'Normal Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 150.1, max: 200, tag: 'Borderline High Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 200.1, max: 500, tag: 'High Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 500.1, max: 10000, tag: 'Very High Triglycerides' },
  
  // Blood Pressure Systolic (mmHg, ACC/AHA guidelines)
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 0, max: 120, tag: 'Normal BP Systolic' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 120.1, max: 130, tag: 'Elevated BP Systolic' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 130.1, max: 140, tag: 'Stage1 Hypertension Systolic' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 140.1, max: 10000, tag: 'Stage2 Hypertension Systolic' },
  
  // Blood Pressure Diastolic (mmHg)
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 0, max: 80, tag: 'Normal BP Diastolic' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 80.1, max: 90, tag: 'Elevated BP Diastolic' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 90.1, max: 100, tag: 'Stage1 Hypertension Diastolic' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 100.1, max: 10000, tag: 'Stage2 Hypertension Diastolic' }
];

const tags = [
  'Deficient VitD', 'Insufficient VitD', 'Adequate VitD', 'Excess VitD',
  'Low Glucose', 'Normal Glucose', 'Prediabetic Glucose', 'Diabetic Glucose',
  'Desirable Cholesterol', 'Borderline High Cholesterol', 'High Cholesterol',
  'Low HDL', 'Fair HDL', 'Good HDL',
  'Optimal LDL', 'Near Optimal LDL', 'Borderline High LDL', 'High LDL', 'Very High LDL',
  'Normal Triglycerides', 'Borderline High Triglycerides', 'High Triglycerides', 'Very High Triglycerides',
  'Normal BP Systolic', 'Elevated BP Systolic', 'Stage1 Hypertension Systolic', 'Stage2 Hypertension Systolic',
  'Normal BP Diastolic', 'Elevated BP Diastolic', 'Stage1 Hypertension Diastolic', 'Stage2 Hypertension Diastolic'
];

async function insertCriteria() {
  console.log('Inserting criteria and tags into Supabase...');
  
  // Insert rules
  const { data: rulesData, error: rulesError } = await sb
    .from('logic_rules')
    .insert(criteria.map(c => ({
      marker_id: c.marker_id,
      min_value: c.min,
      max_value: c.max,
      tag_to_apply: c.tag
    })));
  
  if (rulesError) {
    console.error('Error inserting rules:', rulesError);
  } else {
    console.log(`✓ Inserted ${criteria.length} criteria rules`);
  }
  
  // Insert tags
  const { data: tagsData, error: tagsError } = await sb
    .from('tags')
    .insert(tags.map(t => ({ name: t })));
  
  if (tagsError) {
    console.error('Error inserting tags:', tagsError);
  } else {
    console.log(`✓ Inserted ${tags.length} tags`);
  }
  
  console.log('\n✓ Done!');
  process.exit(0);
}

insertCriteria();
