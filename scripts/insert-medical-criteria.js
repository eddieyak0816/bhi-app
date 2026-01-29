const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fgduvnmsvkhrhcxykkyc.supabase.co';
const SERVICE_ROLE = 'sb_secret_0BaFhRcYEfojLAp9siIu9A_RHvzCSbG';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const criteria = [
  // Vitamin D (0-200 ng/mL, deficiency <20, insufficient 20-30, adequate 30-100, excess >100)
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 0, max: 20, tag: 'Deficient_VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 20.1, max: 30, tag: 'Insufficient_VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 30.1, max: 100, tag: 'Adequate_VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 100.1, max: 10000, tag: 'Excess_VitD' },
  
  // Blood Glucose (fasting, mg/dL)
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 0, max: 70, tag: 'Low_Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 70.1, max: 100, tag: 'Normal_Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 100.1, max: 126, tag: 'Prediabetic_Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 126.1, max: 10000, tag: 'Diabetic_Glucose' },
  
  // Total Cholesterol (mg/dL, ATP III guidelines)
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 0, max: 200, tag: 'Desirable_Cholesterol' },
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 200.1, max: 240, tag: 'Borderline_High_Cholesterol' },
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 240.1, max: 10000, tag: 'High_Cholesterol' },
  
  // HDL - Good Cholesterol (mg/dL, higher is better)
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 0, max: 40, tag: 'Low_HDL' },
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 40.1, max: 59, tag: 'Fair_HDL' },
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 60, max: 500, tag: 'Good_HDL' },
  
  // LDL - Bad Cholesterol (mg/dL, lower is better)
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 0, max: 100, tag: 'Optimal_LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 100.1, max: 130, tag: 'Near_Optimal_LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 130.1, max: 160, tag: 'Borderline_High_LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 160.1, max: 190, tag: 'High_LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 190.1, max: 10000, tag: 'Very_High_LDL' },
  
  // Triglycerides (mg/dL)
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 0, max: 150, tag: 'Normal_Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 150.1, max: 200, tag: 'Borderline_High_Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 200.1, max: 500, tag: 'High_Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 500.1, max: 10000, tag: 'Very_High_Triglycerides' },
  
  // Blood Pressure Systolic (mmHg, ACC/AHA guidelines)
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 0, max: 120, tag: 'Normal_BP_Systolic' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 120.1, max: 130, tag: 'Elevated_BP_Systolic' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 130.1, max: 140, tag: 'Stage1_Hypertension_Systolic' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 140.1, max: 10000, tag: 'Stage2_Hypertension_Systolic' },
  
  // Blood Pressure Diastolic (mmHg)
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 0, max: 80, tag: 'Normal_BP_Diastolic' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 80.1, max: 90, tag: 'Elevated_BP_Diastolic' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 90.1, max: 100, tag: 'Stage1_Hypertension_Diastolic' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 100.1, max: 10000, tag: 'Stage2_Hypertension_Diastolic' }
];

const tags = [
  'Deficient_VitD', 'Insufficient_VitD', 'Adequate_VitD', 'Excess_VitD',
  'Low_Glucose', 'Normal_Glucose', 'Prediabetic_Glucose', 'Diabetic_Glucose',
  'Desirable_Cholesterol', 'Borderline_High_Cholesterol', 'High_Cholesterol',
  'Low_HDL', 'Fair_HDL', 'Good_HDL',
  'Optimal_LDL', 'Near_Optimal_LDL', 'Borderline_High_LDL', 'High_LDL', 'Very_High_LDL',
  'Normal_Triglycerides', 'Borderline_High_Triglycerides', 'High_Triglycerides', 'Very_High_Triglycerides',
  'Normal_BP_Systolic', 'Elevated_BP_Systolic', 'Stage1_Hypertension_Systolic', 'Stage2_Hypertension_Systolic',
  'Normal_BP_Diastolic', 'Elevated_BP_Diastolic', 'Stage1_Hypertension_Diastolic', 'Stage2_Hypertension_Diastolic'
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
