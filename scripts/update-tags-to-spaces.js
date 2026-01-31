const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fgduvnmsvkhrhcxykkyc.supabase.co';
const SERVICE_ROLE = 'sb_secret_0BaFhRcYEfojLAp9siIu9A_RHvzCSbG';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const criteria = [
  // Vitamin D
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 0, max: 20, tag: 'Deficient Vitamin D' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 20.1, max: 30, tag: 'Insufficient Vitamin D' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 30.1, max: 100, tag: 'Adequate Vitamin D' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 100.1, max: 10000, tag: 'Excess Vitamin D' },
  
  // Blood Glucose
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 0, max: 70, tag: 'Low Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 70.1, max: 100, tag: 'Normal Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 100.1, max: 126, tag: 'Prediabetic Glucose' },
  { marker_id: 'e18ceedd-d622-4bf2-b8f9-a20f45346e1f', min: 126.1, max: 10000, tag: 'Diabetic Glucose' },
  
  // Total Cholesterol
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 0, max: 200, tag: 'Desirable Cholesterol' },
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 200.1, max: 240, tag: 'Borderline High Cholesterol' },
  { marker_id: 'd065bfb4-f4b0-431b-97e9-a52b5aeb37a9', min: 240.1, max: 10000, tag: 'High Cholesterol' },
  
  // HDL
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 0, max: 40, tag: 'Low HDL' },
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 40.1, max: 59, tag: 'Fair HDL' },
  { marker_id: 'd74ae77d-48af-47d2-9aeb-3b044321dcb9', min: 60, max: 500, tag: 'Good HDL' },
  
  // LDL
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 0, max: 100, tag: 'Optimal LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 100.1, max: 130, tag: 'Near Optimal LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 130.1, max: 160, tag: 'Borderline High LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 160.1, max: 190, tag: 'High LDL' },
  { marker_id: '1863047f-e183-4df4-a447-806b28b2f439', min: 190.1, max: 10000, tag: 'Very High LDL' },
  
  // Triglycerides
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 0, max: 150, tag: 'Normal Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 150.1, max: 200, tag: 'Borderline High Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 200.1, max: 500, tag: 'High Triglycerides' },
  { marker_id: 'c42dcc61-854e-4639-b9fc-01a3694d23cb', min: 500.1, max: 10000, tag: 'Very High Triglycerides' },
  
  // Blood Pressure Systolic
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 0, max: 120, tag: 'Normal Blood Pressure' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 120.1, max: 130, tag: 'Elevated Blood Pressure' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 130.1, max: 140, tag: 'Stage 1 Hypertension' },
  { marker_id: 'b31476bd-8425-4cf8-ad2a-68fba7567941', min: 140.1, max: 10000, tag: 'Stage 2 Hypertension' },
  
  // Blood Pressure Diastolic (use same tags as systolic for consistency)
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 0, max: 80, tag: 'Normal Blood Pressure' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 80.1, max: 90, tag: 'Elevated Blood Pressure' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 90.1, max: 100, tag: 'Stage 1 Hypertension' },
  { marker_id: '61fce2e6-d0ca-498e-920d-1f81f4381949', min: 100.1, max: 10000, tag: 'Stage 2 Hypertension' }
];

const tags = [
  'Deficient Vitamin D', 'Insufficient Vitamin D', 'Adequate Vitamin D', 'Excess Vitamin D',
  'Low Glucose', 'Normal Glucose', 'Prediabetic Glucose', 'Diabetic Glucose',
  'Desirable Cholesterol', 'Borderline High Cholesterol', 'High Cholesterol',
  'Low HDL', 'Fair HDL', 'Good HDL',
  'Optimal LDL', 'Near Optimal LDL', 'Borderline High LDL', 'High LDL', 'Very High LDL',
  'Normal Triglycerides', 'Borderline High Triglycerides', 'High Triglycerides', 'Very High Triglycerides',
  'Normal Blood Pressure', 'Elevated Blood Pressure', 'Stage 1 Hypertension', 'Stage 2 Hypertension'
];

async function updateCriteria() {
  console.log('Updating criteria tags to use spaces...\n');
  
  // Delete old criteria with underscore tags
  const oldTags = [
    'Low_D', 'Normal_D', 'High_Glucose', 'High_Cholesterol', 'Low_Energy', 'Weight_Management',
    'Deficient_VitD', 'Insufficient_VitD', 'Adequate_VitD', 'Excess_VitD',
    'Low_Glucose', 'Normal_Glucose', 'Prediabetic_Glucose', 'Diabetic_Glucose',
    'Desirable_Cholesterol', 'Borderline_High_Cholesterol', 'High_Cholesterol',
    'Low_HDL', 'Fair_HDL', 'Good_HDL',
    'Optimal_LDL', 'Near_Optimal_LDL', 'Borderline_High_LDL', 'High_LDL', 'Very_High_LDL',
    'Normal_Triglycerides', 'Borderline_High_Triglycerides', 'High_Triglycerides', 'Very_High_Triglycerides',
    'Normal_BP_Systolic', 'Elevated_BP_Systolic', 'Stage1_Hypertension_Systolic', 'Stage2_Hypertension_Systolic',
    'Normal_BP_Diastolic', 'Elevated_BP_Diastolic', 'Stage1_Hypertension_Diastolic', 'Stage2_Hypertension_Diastolic'
  ];
  
  const { error: deleteError } = await sb
    .from('logic_rules')
    .delete()
    .in('tag_to_apply', oldTags);
  
  if (deleteError) {
    console.error('Error deleting old rules:', deleteError.message);
  } else {
    console.log('✓ Deleted old criteria rules');
  }
  
  // Insert new criteria with space-separated tags
  const { data: insertData, error: insertError } = await sb
    .from('logic_rules')
    .insert(criteria.map(c => ({
      marker_id: c.marker_id,
      min_value: c.min,
      max_value: c.max,
      tag_to_apply: c.tag
    })));
  
  if (insertError) {
    console.error('Error inserting new rules:', insertError.message);
  } else {
    console.log(`✓ Inserted ${criteria.length} criteria rules with space-separated tags`);
  }
  
  // Delete old tags with underscores
  const { error: deleteTagsError } = await sb
    .from('tags')
    .delete()
    .in('name', oldTags);
  
  if (deleteTagsError) {
    console.error('Error deleting old tags:', deleteTagsError.message);
  } else {
    console.log('✓ Deleted old underscore tags');
  }
  
  // Insert new tags with spaces
  const { error: insertTagsError } = await sb
    .from('tags')
    .insert(tags.map(t => ({ name: t })));
  
  if (insertTagsError && insertTagsError.code !== '23505') {
    console.error('Error inserting new tags:', insertTagsError.message);
  } else {
    console.log(`✓ Ensured ${tags.length} new tags with spaces exist`);
  }
  
  console.log('\n✓ All tags updated to use spaces!');
  process.exit(0);
}

updateCriteria();
