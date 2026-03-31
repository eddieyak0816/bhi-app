/**
 * F19 — National Benchmarks (CDC / NHANES seed data)
 *
 * Values represent US adult population averages and optimal thresholds
 * sourced from CDC NHANES 2017–2020 and clinical guideline references.
 * These are used to show users how their values compare to the national average.
 *
 * Sources:
 *   - CDC NHANES 2017–2020 (https://www.cdc.gov/nchs/nhanes/)
 *   - AHA/ACC 2019 guidelines (cholesterol, BP)
 *   - ADA 2024 guidelines (glucose, HbA1c)
 *   - NIH/NLM reference ranges (B12, Vitamin D)
 */

export interface MarkerBenchmark {
  /** Display name — must match the marker name stored in user_lab_results */
  markerName: string
  /** US adult population mean (NHANES) */
  nationalMean: number
  /** Unit for display */
  unit: string
  /**
   * Optimal range (clinical guideline target).
   * Used to draw the green band and label the benchmark context.
   */
  optimalMin: number
  optimalMax: number
  /**
   * Whether a lower value is better (e.g. LDL, Triglycerides, Glucose).
   * Used to determine arrow direction in the comparison UI.
   */
  lowerIsBetter: boolean
  /** One-line context note shown as a tooltip / footnote */
  source: string
}

/**
 * Seed benchmark data for markers the BHAS scoring engine evaluates.
 * Marker names are matched case-insensitively against user_lab_results.marker_name.
 */
export const NATIONAL_BENCHMARKS: MarkerBenchmark[] = [
  {
    markerName: 'Fasting Glucose',
    nationalMean: 100,
    unit: 'mg/dL',
    optimalMin: 70,
    optimalMax: 99,
    lowerIsBetter: true,
    source: 'CDC NHANES 2017–2020 adult mean ~100 mg/dL; ADA optimal <100 mg/dL',
  },
  {
    markerName: 'Total Cholesterol',
    nationalMean: 191,
    unit: 'mg/dL',
    optimalMin: 0,
    optimalMax: 200,
    lowerIsBetter: true,
    source: 'CDC NHANES 2017–2020 adult mean ~191 mg/dL; AHA desirable <200 mg/dL',
  },
  {
    markerName: 'HDL Cholesterol',
    nationalMean: 53,
    unit: 'mg/dL',
    optimalMin: 60,
    optimalMax: 999,
    lowerIsBetter: false,
    source: 'CDC NHANES 2017–2020 adult mean ~53 mg/dL; AHA optimal ≥60 mg/dL',
  },
  {
    markerName: 'LDL Cholesterol',
    nationalMean: 111,
    unit: 'mg/dL',
    optimalMin: 0,
    optimalMax: 100,
    lowerIsBetter: true,
    source: 'CDC NHANES 2017–2020 adult mean ~111 mg/dL; ACC/AHA optimal <100 mg/dL',
  },
  {
    markerName: 'Triglycerides',
    nationalMean: 131,
    unit: 'mg/dL',
    optimalMin: 0,
    optimalMax: 150,
    lowerIsBetter: true,
    source: 'CDC NHANES 2017–2020 adult mean ~131 mg/dL; AHA optimal <150 mg/dL',
  },
  {
    markerName: 'Blood Pressure Systolic',
    nationalMean: 122,
    unit: 'mmHg',
    optimalMin: 0,
    optimalMax: 120,
    lowerIsBetter: true,
    source: 'CDC NHANES 2017–2020 adult mean ~122 mmHg; AHA optimal <120 mmHg',
  },
  {
    markerName: 'Blood Pressure Diastolic',
    nationalMean: 77,
    unit: 'mmHg',
    optimalMin: 0,
    optimalMax: 80,
    lowerIsBetter: true,
    source: 'CDC NHANES 2017–2020 adult mean ~77 mmHg; AHA optimal <80 mmHg',
  },
  {
    markerName: 'Vitamin D',
    nationalMean: 23,
    unit: 'ng/mL',
    optimalMin: 30,
    optimalMax: 100,
    lowerIsBetter: false,
    source: 'CDC NHANES 2011–2014 adult mean ~23 ng/mL; Endocrine Society optimal ≥30 ng/mL',
  },
  {
    markerName: 'Vitamin B12',
    nationalMean: 400,
    unit: 'pg/mL',
    optimalMin: 300,
    optimalMax: 900,
    lowerIsBetter: false,
    source: 'Estimated US adult mean ~400 pg/mL; clinical adequate range 300–900 pg/mL',
  },
  {
    markerName: 'Fasting Insulin',
    nationalMean: 11,
    unit: 'µIU/mL',
    optimalMin: 2,
    optimalMax: 10,
    lowerIsBetter: true,
    source: 'NHANES estimated fasting insulin ~11 µIU/mL; optimal <10 µIU/mL',
  },
  {
    markerName: 'hs-CRP',
    nationalMean: 2.1,
    unit: 'mg/L',
    optimalMin: 0,
    optimalMax: 1.0,
    lowerIsBetter: true,
    source: 'NHANES adult median hs-CRP ~2.1 mg/L; AHA low risk <1.0 mg/L',
  },
  {
    markerName: 'VO2 Max Percentile',
    nationalMean: 35,
    unit: '%ile',
    optimalMin: 60,
    optimalMax: 100,
    lowerIsBetter: false,
    source: 'US adult VO2 Max estimated median ~35th percentile; optimal ≥60th',
  },
  {
    markerName: 'Waist Circumference (Male)',
    nationalMean: 101,
    unit: 'cm',
    optimalMin: 0,
    optimalMax: 94,
    lowerIsBetter: true,
    source: 'NHANES 2017–2020 adult male mean waist ~101 cm; IDF/AHA optimal <94 cm',
  },
  {
    markerName: 'Waist Circumference (Female)',
    nationalMean: 95,
    unit: 'cm',
    optimalMin: 0,
    optimalMax: 80,
    lowerIsBetter: true,
    source: 'NHANES 2017–2020 adult female mean waist ~95 cm; IDF/AHA optimal <80 cm',
  },
  {
    markerName: 'Grip Strength',
    nationalMean: 36,
    unit: 'kg',
    optimalMin: 36,
    optimalMax: 999,
    lowerIsBetter: false,
    source: 'NHANES adult mean grip ~36 kg; optimal ≥36 kg (age/sex adjusted guideline midpoint)',
  },
]

/** Look up benchmark by marker name (case-insensitive). */
export function getBenchmark(markerName: string): MarkerBenchmark | null {
  const lower = markerName.toLowerCase()
  return NATIONAL_BENCHMARKS.find(b => b.markerName.toLowerCase() === lower) ?? null
}
