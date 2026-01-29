-- Insert all medically accurate criteria rules

-- Vitamin D rules
INSERT INTO logic_rules (marker_id, min_value, max_value, tag_to_apply)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 0, 20, 'Deficient_VitD'),
  ('11111111-1111-4111-8111-111111111111', 20.1, 30, 'Insufficient_VitD'),
  ('11111111-1111-4111-8111-111111111111', 30.1, 100, 'Adequate_VitD'),
  ('11111111-1111-4111-8111-111111111111', 100.1, 10000, 'Excess_VitD'),
  
  -- Blood Glucose rules (fasting glucose ranges)
  ('11111111-1111-4111-8111-111111111112', 0, 70, 'Low_Glucose'),
  ('11111111-1111-4111-8111-111111111112', 70.1, 100, 'Normal_Glucose'),
  ('11111111-1111-4111-8111-111111111112', 100.1, 126, 'Prediabetic_Glucose'),
  ('11111111-1111-4111-8111-111111111112', 126.1, 10000, 'Diabetic_Glucose'),
  
  -- Total Cholesterol rules (ATP III guidelines)
  ('11111111-1111-4111-8111-111111111113', 0, 200, 'Desirable_Cholesterol'),
  ('11111111-1111-4111-8111-111111111113', 200.1, 240, 'Borderline_High_Cholesterol'),
  ('11111111-1111-4111-8111-111111111113', 240.1, 10000, 'High_Cholesterol'),
  
  -- HDL (good cholesterol) rules (higher is better)
  ('11111111-1111-4111-8111-111111111114', 0, 40, 'Low_HDL'),
  ('11111111-1111-4111-8111-111111111114', 40.1, 59, 'Fair_HDL'),
  ('11111111-1111-4111-8111-111111111114', 60, 500, 'Good_HDL'),
  
  -- LDL (bad cholesterol) rules (lower is better)
  ('11111111-1111-4111-8111-111111111115', 0, 100, 'Optimal_LDL'),
  ('11111111-1111-4111-8111-111111111115', 100.1, 130, 'Near_Optimal_LDL'),
  ('11111111-1111-4111-8111-111111111115', 130.1, 160, 'Borderline_High_LDL'),
  ('11111111-1111-4111-8111-111111111115', 160.1, 190, 'High_LDL'),
  ('11111111-1111-4111-8111-111111111115', 190.1, 10000, 'Very_High_LDL'),
  
  -- Triglycerides rules
  ('11111111-1111-4111-8111-111111111116', 0, 150, 'Normal_Triglycerides'),
  ('11111111-1111-4111-8111-111111111116', 150.1, 200, 'Borderline_High_Triglycerides'),
  ('11111111-1111-4111-8111-111111111116', 200.1, 500, 'High_Triglycerides'),
  ('11111111-1111-4111-8111-111111111116', 500.1, 10000, 'Very_High_Triglycerides'),
  
  -- Blood Pressure Systolic rules (American College of Cardiology guidelines)
  ('11111111-1111-4111-8111-111111111117', 0, 120, 'Normal_BP_Systolic'),
  ('11111111-1111-4111-8111-111111111117', 120.1, 130, 'Elevated_BP_Systolic'),
  ('11111111-1111-4111-8111-111111111117', 130.1, 140, 'Stage1_Hypertension_Systolic'),
  ('11111111-1111-4111-8111-111111111117', 140.1, 10000, 'Stage2_Hypertension_Systolic'),
  
  -- Blood Pressure Diastolic rules
  ('11111111-1111-4111-8111-111111111118', 0, 80, 'Normal_BP_Diastolic'),
  ('11111111-1111-4111-8111-111111111118', 80.1, 90, 'Elevated_BP_Diastolic'),
  ('11111111-1111-4111-8111-111111111118', 90.1, 100, 'Stage1_Hypertension_Diastolic'),
  ('11111111-1111-4111-8111-111111111118', 100.1, 10000, 'Stage2_Hypertension_Diastolic')
ON CONFLICT (marker_id, min_value, max_value, tag_to_apply) DO NOTHING;

-- Insert all the tags so they're available in the tag manager
INSERT INTO tags (name) VALUES
  ('Deficient_VitD'),
  ('Insufficient_VitD'),
  ('Adequate_VitD'),
  ('Excess_VitD'),
  ('Low_Glucose'),
  ('Normal_Glucose'),
  ('Prediabetic_Glucose'),
  ('Diabetic_Glucose'),
  ('Desirable_Cholesterol'),
  ('Borderline_High_Cholesterol'),
  ('High_Cholesterol'),
  ('Low_HDL'),
  ('Fair_HDL'),
  ('Good_HDL'),
  ('Optimal_LDL'),
  ('Near_Optimal_LDL'),
  ('Borderline_High_LDL'),
  ('High_LDL'),
  ('Very_High_LDL'),
  ('Normal_Triglycerides'),
  ('Borderline_High_Triglycerides'),
  ('High_Triglycerides'),
  ('Very_High_Triglycerides'),
  ('Normal_BP_Systolic'),
  ('Elevated_BP_Systolic'),
  ('Stage1_Hypertension_Systolic'),
  ('Stage2_Hypertension_Systolic'),
  ('Normal_BP_Diastolic'),
  ('Elevated_BP_Diastolic'),
  ('Stage1_Hypertension_Diastolic'),
  ('Stage2_Hypertension_Diastolic')
ON CONFLICT (name) DO NOTHING;
