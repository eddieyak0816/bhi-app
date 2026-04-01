// ── VO2 Max Calculator Utility ────────────────────────────────────────────────
//
// Three estimation methods:
//   1. Rockport 1-Mile Walk Test (most accurate without lab equipment)
//   2. Resting Heart Rate method (quick estimate, no equipment)
//   3. Direct entry of a lab-measured VO2 Max
//
// All produce a VO2 Max in ml/kg/min, which is then converted to an
// age-and-sex-adjusted percentile using ACSM fitness classification norms.
//
// References:
//   - Rockport: Kline et al. (1987), Med Sci Sports Exerc 19(3):253-259
//   - Resting HR: Uth et al. (2004), Eur J Appl Physiol 91(1):111-115
//   - Percentile norms: ACSM Guidelines for Exercise Testing and Prescription, 11th ed.

// ── Rockport Walk Test ────────────────────────────────────────────────────────

export interface RockportInputs {
  ageYears: number       // years
  weightKg: number       // kg
  sex: 'male' | 'female'
  walkTimeMinutes: number  // total minutes (e.g. 14.5 for 14:30)
  heartRateBpm: number    // HR at end of walk
}

/**
 * Rockport 1-mile walk test equation (Kline et al. 1987).
 * Returns estimated VO2 Max in ml/kg/min.
 */
export function rockportVo2(inputs: RockportInputs): number {
  const { ageYears, weightKg, sex, walkTimeMinutes, heartRateBpm } = inputs
  const weightLbs = weightKg * 2.2046
  const genderCoeff = sex === 'male' ? 1 : 0

  const vo2 =
    132.853 -
    0.0769 * weightLbs -
    0.3877 * ageYears +
    6.315 * genderCoeff -
    3.2649 * walkTimeMinutes -
    0.1565 * heartRateBpm

  return Math.max(vo2, 10) // floor at 10 ml/kg/min
}

// ── Resting HR Method ─────────────────────────────────────────────────────────

export interface RestingHrInputs {
  ageYears: number
  restingHrBpm: number
}

/**
 * Uth et al. (2004) formula using max HR estimate and resting HR.
 * Returns estimated VO2 Max in ml/kg/min.
 */
export function restingHrVo2(inputs: RestingHrInputs): number {
  const { ageYears, restingHrBpm } = inputs
  const maxHr = 208 - 0.7 * ageYears  // Tanaka formula
  const vo2 = 15 * (maxHr / restingHrBpm)
  return Math.max(vo2, 10)
}

// ── Percentile Lookup ─────────────────────────────────────────────────────────
//
// ACSM norms: VO2 Max ml/kg/min thresholds for each percentile bucket.
// Organized as [ageMin, ageMax] → [female thresholds, male thresholds]
// where thresholds = [p10, p25, p50, p75, p90] (values at those percentiles).
//
// Source: ACSM Guidelines for Exercise Testing and Prescription, 11th ed., Table 4-8.

interface AgeBand {
  ageMin: number
  ageMax: number
  female: [number, number, number, number, number]  // p10, p25, p50, p75, p90
  male:   [number, number, number, number, number]
}

const ACSM_NORMS: AgeBand[] = [
  { ageMin: 20, ageMax: 29, female: [28.0, 32.0, 36.6, 41.0, 44.2], male: [36.4, 40.0, 44.2, 50.4, 54.0] },
  { ageMin: 30, ageMax: 39, female: [26.0, 29.0, 33.8, 38.0, 41.0], male: [34.0, 38.0, 42.5, 47.0, 51.4] },
  { ageMin: 40, ageMax: 49, female: [23.0, 26.0, 30.0, 35.0, 38.1], male: [31.0, 35.0, 39.5, 44.0, 48.0] },
  { ageMin: 50, ageMax: 59, female: [20.0, 22.8, 26.5, 31.5, 35.0], male: [26.0, 31.0, 35.2, 40.0, 44.0] },
  { ageMin: 60, ageMax: 69, female: [17.5, 20.0, 23.0, 27.5, 31.0], male: [22.0, 26.0, 30.2, 35.0, 39.0] },
  { ageMin: 70, ageMax: 99, female: [15.0, 17.0, 20.0, 23.5, 27.0], male: [19.0, 22.0, 25.5, 30.0, 34.0] },
]

/**
 * Converts a VO2 Max value (ml/kg/min) to an age/sex-adjusted percentile (0–100).
 * Uses linear interpolation between ACSM norm breakpoints.
 */
export function vo2ToPercentile(vo2: number, ageYears: number, sex: 'male' | 'female'): number {
  // Find the age band
  const band = ACSM_NORMS.find(b => ageYears >= b.ageMin && ageYears <= b.ageMax)
    ?? ACSM_NORMS[ACSM_NORMS.length - 1]

  const thresholds = sex === 'female' ? band.female : band.male
  const percentiles = [10, 25, 50, 75, 90]

  // Below p10
  if (vo2 <= thresholds[0]) {
    return Math.round(Math.max(1, 10 * (vo2 / thresholds[0])))
  }
  // Above p90
  if (vo2 >= thresholds[4]) {
    return Math.min(99, Math.round(90 + 9 * ((vo2 - thresholds[4]) / (thresholds[4] * 0.1))))
  }

  // Interpolate between breakpoints
  for (let i = 0; i < thresholds.length - 1; i++) {
    if (vo2 >= thresholds[i] && vo2 < thresholds[i + 1]) {
      const t = (vo2 - thresholds[i]) / (thresholds[i + 1] - thresholds[i])
      return Math.round(percentiles[i] + t * (percentiles[i + 1] - percentiles[i]))
    }
  }

  return 50
}

/** ACSM fitness category label for a VO2 Max percentile */
export function vo2PercentileLabel(percentile: number): string {
  if (percentile >= 90) return 'Superior'
  if (percentile >= 75) return 'Excellent'
  if (percentile >= 50) return 'Good'
  if (percentile >= 25) return 'Fair'
  if (percentile >= 10) return 'Poor'
  return 'Very Poor'
}

/** Color for the fitness category */
export function vo2PercentileColor(percentile: number): string {
  if (percentile >= 75) return '#15803d'
  if (percentile >= 50) return '#1d4ed8'
  if (percentile >= 25) return '#b45309'
  return '#b91c1c'
}
