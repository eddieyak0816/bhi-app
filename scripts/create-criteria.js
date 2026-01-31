const criteria = [
  // Vitamin D
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 0, max: 20, tag: 'Deficient VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 20.1, max: 30, tag: 'Insufficient VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 30.1, max: 100, tag: 'Adequate VitD' },
  { marker_id: '11111111-1111-4111-8111-111111111111', min: 100.1, max: 10000, tag: 'Excess VitD' },
  
  // Blood Glucose
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 0, max: 70, tag: 'Low Glucose' },
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 70.1, max: 100, tag: 'Normal Glucose' },
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 100.1, max: 126, tag: 'Prediabetic Glucose' },
  { marker_id: '11111111-1111-4111-8111-111111111112', min: 126.1, max: 10000, tag: 'Diabetic Glucose' },
  
  // Total Cholesterol
  { marker_id: '11111111-1111-4111-8111-111111111113', min: 0, max: 200, tag: 'Desirable Cholesterol' },
  { marker_id: '11111111-1111-4111-8111-111111111113', min: 200.1, max: 240, tag: 'Borderline High Cholesterol' },
  { marker_id: '11111111-1111-4111-8111-111111111113', min: 240.1, max: 10000, tag: 'High Cholesterol' },
  
  // HDL (good cholesterol)
  { marker_id: '11111111-1111-4111-8111-111111111114', min: 0, max: 40, tag: 'Low HDL' },
  { marker_id: '11111111-1111-4111-8111-111111111114', min: 40.1, max: 59, tag: 'Fair HDL' },
  { marker_id: '11111111-1111-4111-8111-111111111114', min: 60, max: 500, tag: 'Good HDL' },
  
  // LDL (bad cholesterol)
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 0, max: 100, tag: 'Optimal LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 100.1, max: 130, tag: 'Near Optimal LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 130.1, max: 160, tag: 'Borderline High LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 160.1, max: 190, tag: 'High LDL' },
  { marker_id: '11111111-1111-4111-8111-111111111115', min: 190.1, max: 10000, tag: 'Very High LDL' },
  
  // Triglycerides
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 0, max: 150, tag: 'Normal Triglycerides' },
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 150.1, max: 200, tag: 'Borderline High Triglycerides' },
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 200.1, max: 500, tag: 'High Triglycerides' },
  { marker_id: '11111111-1111-4111-8111-111111111116', min: 500.1, max: 10000, tag: 'Very High Triglycerides' },
  
  // Blood Pressure Systolic
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 0, max: 120, tag: 'Normal BP Systolic' },
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 120.1, max: 130, tag: 'Elevated BP Systolic' },
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 130.1, max: 140, tag: 'Stage1 Hypertension Systolic' },
  { marker_id: '11111111-1111-4111-8111-111111111117', min: 140.1, max: 10000, tag: 'Stage2 Hypertension Systolic' },
  
  // Blood Pressure Diastolic
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 0, max: 80, tag: 'Normal BP Diastolic' },
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 80.1, max: 90, tag: 'Elevated BP Diastolic' },
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 90.1, max: 100, tag: 'Stage1 Hypertension Diastolic' },
  { marker_id: '11111111-1111-4111-8111-111111111118', min: 100.1, max: 10000, tag: 'Stage2 Hypertension Diastolic' }
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
