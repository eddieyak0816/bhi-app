/**
 * BHAS v2.3 Scoring Engine
 *
 * Runs in parallel with the existing v1 engine (calculateBhasScore in evaluateRules.ts).
 * This version uses derived ratios (HOMA-IR, TG/HDL, WtHR, Grip Ratio) rather than
 * scoring raw markers directly.
 *
 * Source spec: docs/APP integration Point system and Metrics.pdf
 */

export interface BhasV2Profile {
  sex: 'male' | 'female' | 'other' | ''
  heightCm: number | null
  waistCm: number | null        // always in cm for v2 — convert if stored in inches
  weightKg: number | null
  gripStrengthKg: number | null
  isType1Diabetes: boolean
  totalDailyInsulinUnits: number | null  // Type 1 only
  hasAdvancedCarePlan: boolean
  acuteVisits: number | null            // tie-breaker only
}

export interface BhasV2MetricScore {
  metric: string
  derived: string       // e.g. "HOMA-IR = 1.23" or "raw = 45 ng/mL"
  score: 0 | 0.5 | 1
  label: 'Optimal' | 'Improvement' | 'Out of Range' | 'Missing'
  included: boolean     // false when excluded by Type 1 logic
}

export interface BhasV2Result {
  metricScores: BhasV2MetricScore[]
  totalScore: number          // sum of included scores
  maxPossible: number         // always 8.0
  label: 'Optimal' | 'Healthy' | 'Needs Improvement' | 'High Risk'
  // Derived values (stored for leaderboard/analytics use)
  derived: {
    homaIr: number | null
    tgHdlRatio: number | null
    gripRatio: number | null
    wthr: number | null
    insulinUnitsPerKg: number | null
  }
  // Biometric tracking values (not scored — analysis/leaderboard only)
  biometrics: {
    vo2MaxPercentile: number | null
    gripStrengthKg: number | null
    wthr: number | null
  }
  // Tie-breaker inputs (for leaderboard ranking)
  tieBreaker: {
    vo2MaxPercentile: number | null    // #1
    gripStrengthKg: number | null     // #2 (was gripRatio)
    acuteVisits: number | null        // #3
    hsCrp: number | null              // #4
  }
  /** True if enough core inputs are present to display the score */
  hasEnoughData: boolean
  /** Which markers are still missing (shown as hints to the user) */
  missingInputs: string[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function score3(value: number, t1: number, t2: number, lowerIsBetter: boolean): 0 | 0.5 | 1 {
  if (lowerIsBetter) {
    if (value < t1) return 1
    if (value <= t2) return 0.5
    return 0
  } else {
    if (value >= t1) return 1
    if (value >= t2) return 0.5
    return 0
  }
}

function toLabel(score: 0 | 0.5 | 1): 'Optimal' | 'Improvement' | 'Out of Range' {
  if (score === 1) return 'Optimal'
  if (score === 0.5) return 'Improvement'
  return 'Out of Range'
}

function interpretTotal(total: number): 'Optimal' | 'Healthy' | 'Needs Improvement' | 'High Risk' {
  if (total >= 7.0) return 'Optimal'
  if (total >= 5.5) return 'Healthy'
  if (total >= 4.0) return 'Needs Improvement'
  return 'High Risk'
}

// Normalize marker names for matching: lowercase, strip hyphens/spaces/dots
// so 'hs-CRP', 'Hs CRP', 'HS CRP', 'HSCRP' all resolve to the same key.
function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[-\s.]/g, '')
}

function latest(results: LabInput[], name: string): number | null {
  const needle = normalizeName(name)
  const matches = results
    .filter(r => normalizeName(r.markerName) === needle)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  return matches.length > 0 ? matches[0].value : null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LabInput {
  markerName: string
  value: number
  date: string
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Calculate BHAS v2.3 score.
 *
 * Returns hasEnoughData=false if the minimum required markers are absent,
 * so callers can conditionally show the panel.
 *
 * Minimum required to show the panel: at least 4 of the 9 scored metrics
 * must have data (otherwise the score is too incomplete to be meaningful).
 */
export function calculateBhasV2Score(
  results: LabInput[],
  profile: BhasV2Profile
): BhasV2Result {
  const missingInputs: string[] = []

  // ── Pull raw lab values ──────────────────────────────────────────────────
  const fastingGlucose    = latest(results, 'Fasting Glucose')
  const fastingInsulin    = latest(results, 'Fasting Insulin')
  const hsCrp             = latest(results, 'hs-CRP')
  const triglycerides     = latest(results, 'Triglycerides')
  const hdl               = latest(results, 'HDL')
  const vitaminD          = latest(results, 'Vitamin D')
  const vitaminB12        = latest(results, 'Vitamin B12')
  const hbA1c             = latest(results, 'Hemoglobin A1c')
  const vo2MaxPercentile  = latest(results, 'VO2 Max Percentile')

  const { sex, heightCm, waistCm, weightKg, gripStrengthKg,
          isType1Diabetes, totalDailyInsulinUnits,
          hasAdvancedCarePlan, acuteVisits } = profile

  // ── Derived calculations ─────────────────────────────────────────────────
  const homaIr = (fastingInsulin != null && fastingGlucose != null)
    ? (fastingInsulin * fastingGlucose) / 405
    : null

  const tgHdlRatio = (triglycerides != null && hdl != null && hdl > 0)
    ? triglycerides / hdl
    : null

  const gripRatio = (gripStrengthKg != null && weightKg != null && weightKg > 0)
    ? gripStrengthKg / weightKg
    : null

  const wthr = (waistCm != null && heightCm != null && heightCm > 0)
    ? waistCm / heightCm
    : null

  const insulinUnitsPerKg = (isType1Diabetes && totalDailyInsulinUnits != null && weightKg != null && weightKg > 0)
    ? totalDailyInsulinUnits / weightKg
    : null

  // ── Score each metric ────────────────────────────────────────────────────
  const metricScores: BhasV2MetricScore[] = []

  // 1. HOMA-IR (non-Type 1) OR Insulin Units/kg (Type 1)
  // Thresholds: Optimal < 2, Improvement 2–3, Out of Range ≥ 3
  if (!isType1Diabetes) {
    if (homaIr != null) {
      metricScores.push({
        metric: 'HOMA-IR',
        derived: `HOMA-IR = ${homaIr.toFixed(2)}`,
        score: score3(homaIr, 2.0, 3.0, true),
        label: toLabel(score3(homaIr, 2.0, 3.0, true)),
        included: true,
      })
    } else {
      missingInputs.push('Fasting Insulin (needed for HOMA-IR)')
      if (fastingGlucose == null) missingInputs.push('Fasting Glucose (needed for HOMA-IR)')
    }
  } else {
    if (insulinUnitsPerKg != null) {
      metricScores.push({
        metric: 'Insulin Units/kg',
        derived: `${insulinUnitsPerKg.toFixed(2)} units/kg`,
        score: score3(insulinUnitsPerKg, 0.6, 0.8, true),
        label: toLabel(score3(insulinUnitsPerKg, 0.6, 0.8, true)),
        included: true,
      })
    } else {
      missingInputs.push('Total Daily Insulin Units (needed for Insulin/kg scoring)')
    }
  }

  // 2. hs-CRP
  if (hsCrp != null) {
    metricScores.push({
      metric: 'hs-CRP',
      derived: `${hsCrp} mg/L`,
      score: score3(hsCrp, 1.0, 3.0, true),
      label: toLabel(score3(hsCrp, 1.0, 3.0, true)),
      included: true,
    })
  } else {
    missingInputs.push('hs-CRP')
  }

  // 3. TG/HDL Ratio
  if (tgHdlRatio != null) {
    metricScores.push({
      metric: 'TG/HDL Ratio',
      derived: `${tgHdlRatio.toFixed(2)} (TG ${triglycerides} / HDL ${hdl})`,
      score: score3(tgHdlRatio, 2.0, 3.0, true),
      label: toLabel(score3(tgHdlRatio, 2.0, 3.0, true)),
      included: true,
    })
  } else {
    if (triglycerides == null) missingInputs.push('Triglycerides (needed for TG/HDL)')
    if (hdl == null) missingInputs.push('HDL (needed for TG/HDL)')
  }

  // 4. Vitamin D (binary: >50 = 1, ≤50 = 0)
  if (vitaminD != null) {
    const vdScore: 0 | 1 = vitaminD > 50 ? 1 : 0
    metricScores.push({
      metric: 'Vitamin D',
      derived: `${vitaminD} ng/mL`,
      score: vdScore,
      label: vdScore === 1 ? 'Optimal' : 'Out of Range',
      included: true,
    })
  } else {
    missingInputs.push('Vitamin D')
  }

  // 5. Vitamin B12 (binary: >750 = 1, ≤750 = 0)
  if (vitaminB12 != null) {
    const b12Score: 0 | 1 = vitaminB12 > 750 ? 1 : 0
    metricScores.push({
      metric: 'Vitamin B12',
      derived: `${vitaminB12} pg/mL`,
      score: b12Score,
      label: b12Score === 1 ? 'Optimal' : 'Out of Range',
      included: true,
    })
  } else {
    missingInputs.push('Vitamin B12')
  }

  // 6. HbA1c — Optimal < 5.7%, Improvement 5.7–6.4%, Out of Range ≥ 6.5%
  if (hbA1c != null) {
    metricScores.push({
      metric: 'HbA1c',
      derived: `${hbA1c}%`,
      score: score3(hbA1c, 5.7, 6.5, true),
      label: toLabel(score3(hbA1c, 5.7, 6.5, true)),
      included: true,
    })
  } else {
    missingInputs.push('Hemoglobin A1c')
  }

  // 7. Waist-to-Height Ratio
  if (wthr != null) {
    metricScores.push({
      metric: 'Waist-to-Height Ratio',
      derived: `${wthr.toFixed(3)} (${waistCm} cm / ${heightCm} cm)`,
      score: score3(wthr, 0.50, 0.56, true),
      label: toLabel(score3(wthr, 0.50, 0.56, true)),
      included: true,
    })
  } else {
    if (waistCm == null) missingInputs.push('Waist Circumference in cm (needed for WtHR)')
    if (heightCm == null) missingInputs.push('Height (needed for WtHR)')
  }

  // 8. Advanced Care Planning (binary)
  metricScores.push({
    metric: 'Advance Care Plan',
    derived: hasAdvancedCarePlan ? 'Documented' : 'Not documented',
    score: hasAdvancedCarePlan ? 1 : 0,
    label: hasAdvancedCarePlan ? 'Optimal' : 'Out of Range',
    included: true,
  })

  // ── Totals ────────────────────────────────────────────────────────────────
  const scoredMetrics = metricScores.filter(m => m.included)
  const totalScore = scoredMetrics.reduce((sum, m) => sum + m.score, 0)

  // Require at least 4 of 8 scored metrics to show the panel
  const hasEnoughData = scoredMetrics.length >= 4

  return {
    metricScores,
    totalScore,
    maxPossible: 8,
    label: interpretTotal(totalScore),
    derived: { homaIr, tgHdlRatio, gripRatio, wthr, insulinUnitsPerKg },
    biometrics: {
      vo2MaxPercentile,
      gripStrengthKg,
      wthr,
    },
    tieBreaker: {
      vo2MaxPercentile,       // #1
      gripStrengthKg,         // #2 (was gripRatio)
      acuteVisits,            // #3
      hsCrp,                  // #4
    },
    hasEnoughData,
    missingInputs: [...new Set(missingInputs)],  // deduplicate
  }
}
