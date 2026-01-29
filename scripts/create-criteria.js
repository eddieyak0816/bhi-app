const criteria = [
  // Vitamin D
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 0, max: 20, tag: 'Deficient_VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 20.1, max: 30, tag: 'Insufficient_VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 30.1, max: 100, tag: 'Adequate_VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 100.1, max: 10000, tag: 'Excess_VitD' },
  
  // Blood Glucose
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 0, max: 70, tag: 'Low_Glucose' },
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 70.1, max: 100, tag: 'Normal_Glucose' },
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 100.1, max: 126, tag: 'Prediabetic_Glucose' },
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 126.1, max: 10000, tag: 'Diabetic_Glucose' },
  
  // Total Cholesterol
  { marker_id: '11111111-1111-4111-8111-111111111113', min: 0, max: 200, tag: 'Desirable_Cholesterol' },
  { marker_id: '11111111-1111-4111-8111-111111111113', min: 200.1, max: 240, tag: 'Borderline_High_Cholesterol' },
  { marker_id: '11111111-1111-4111-8111-111111111113', min: 240.1, max: 10000, tag: 'High_Cholesterol' },
  
  // HDL (good cholesterol)
  { marker_id: '11111111-1111-4111-8111-111111111114', min: 0, max: 40, tag: 'Low_HDL' },
  { marker_id: '11111111-1111-4111-8111-111111111114', min: 40.1, max: 59, tag: 'Fair_HDL' },
  { marker_id: '11111111-1111-4111-8111-111111111114', min: 60, max: 500, tag: 'Good_HDL' },
  
  // LDL (bad cholesterol)
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 0, max: 100, tag: 'Optimal_LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 100.1, max: 130, tag: 'Near_Optimal_LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 130.1, max: 160, tag: 'Borderline_High_LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 160.1, max: 190, tag: 'High_LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 190.1, max: 10000, tag: 'Very_High_LDL' },
  
  // Triglycerides
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 0, max: 150, tag: 'Normal_Triglycerides' },
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 150.1, max: 200, tag: 'Borderline_High_Triglycerides' },
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 200.1, max: 500, tag: 'High_Triglycerides' },
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 500.1, max: 10000, tag: 'Very_High_Triglycerides' },
  
  // Blood Pressure Systolic
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 0, max: 120, tag: 'Normal_BP_Systolic' },
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 120.1, max: 130, tag: 'Elevated_BP_Systolic' },
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 130.1, max: 140, tag: 'Stage1_Hypertension_Systolic' },
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 140.1, max: 10000, tag: 'Stage2_Hypertension_Systolic' },
  
  // Blood Pressure Diastolic
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 0, max: 80, tag: 'Normal_BP_Diastolic' },
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 80.1, max: 90, tag: 'Elevated_BP_Diastolic' },
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 90.1, max: 100, tag: 'Stage1_Hypertension_Diastolic' },
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 100.1, max: 10000, tag: 'Stage2_Hypertension_Diastolic' }
];

async function createCriteria() {
  let count = 0;
  for (const rule of criteria) {
    try {
      const res = await fetch('http://localhost:4242/api/admin/logic-rules', {
        method: 'POST',
        headers: {
          'x-backend-api-key': 'foo',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          marker_id: rule.marker_id,
          min_value: rule.min,
          max_value: rule.max,
          tag_to_apply: rule.tag
        })
      });
      
      if (res.ok) {
        console.log(`✓ ${rule.tag}`);
        count++;
      } else {
        console.error(`✗ ${rule.tag}: ${res.status}`);
      }
    } catch (err) {
      console.error(`✗ ${rule.tag}: ${err.message}`);
    }
  }
  console.log(`\n✓ Created ${count}/${criteria.length} criteria rules`);
}

createCriteria();
