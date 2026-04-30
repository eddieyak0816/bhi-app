/**
 * Evaluation logic for matching user lab values against logic rules
 * Used to determine which tags/resources apply to each user
 */

export interface LogicRule {
  id: string
  marker_id: string
  marker_name: string
  min_value: number
  max_value: number
  operator: 'between' | '<' | '>' | '=' | '<=' | '>='
  tag_to_apply: string
}

/**
 * Map of tag name → scoring tier, loaded from the tags table (F47).
 * Replaces the hardcoded OPTIMAL_TAGS / IMPROVEMENT_TAGS sets at runtime.
 */
export type TagTierMap = Map<string, 'optimal' | 'improvement' | 'out_of_range'>

/**
 * BHAS (Balanced Health Assessment Score) per-marker score
 * 1 = Optimal, 0.5 = Improvement range, 0 = Out of range
 */
export type BhasScore = 0 | 0.5 | 1

/**
 * Per-marker BHAS result returned by calculateBhasScore
 */
export interface MarkerScore {
  markerName: string
  score: BhasScore
  tag: string        // the tag that fired for this marker
  label: 'Optimal' | 'Improvement' | 'Out of Range'
}

/**
 * Full BHAS result for a user
 */
export interface BhasResult {
  markerScores: MarkerScore[]
  totalScore: number       // sum of all marker scores
  maxPossible: number      // number of markers with results (each worth 1.0)
  percentage: number       // 0–100
}

/**
 * Tags that indicate an OPTIMAL result (score = 1)
 */
const OPTIMAL_TAGS = new Set([
  'Adequate_VitD',
  'Normal_Glucose',
  'Desirable_Cholesterol',
  'Good_HDL',
  'Optimal_LDL',
  'Normal_Triglycerides',
  'Normal_BP_Systolic',
  'Normal_BP_Diastolic',
  'Normal D',
  // B12 (added in migration)
  'Adequate_B12',
  'Normal_B12',
  // Biometrics (added in migration)
  'Optimal_Waist_Male',
  'Optimal_Waist_Female',
  // hs-CRP (added in 20260320 migration)
  'Low_CRP',
  // Fasting Insulin (added in 20260320 migration)
  'Optimal_Insulin',
  // Note: Optimal_Grip and Excellent_VO2 removed from scoring (BHAS v2.3) — biometric tracking only
])

/**
 * Tags that indicate an IMPROVEMENT RANGE result (score = 0.5)
 */
const IMPROVEMENT_TAGS = new Set([
  'Insufficient_VitD',
  'Prediabetic_Glucose',
  'Borderline_High_Cholesterol',
  'Fair_HDL',
  'Near_Optimal_LDL',
  'Borderline_High_LDL',
  'Borderline_High_Triglycerides',
  'Elevated_BP_Systolic',
  'Elevated_BP_Diastolic',
  'Stage1_Hypertension_Systolic',
  'Stage1_Hypertension_Diastolic',
  // B12
  'Low_Normal_B12',
  // Biometrics
  'Borderline_Waist_Male',
  'Borderline_Waist_Female',
  // hs-CRP (added in 20260320 migration)
  'Average_CRP',
  // Fasting Insulin (added in 20260320 migration)
  'Acceptable_Insulin',
  // Note: Low_Normal_Grip and Average_VO2 removed from scoring (BHAS v2.3) — biometric tracking only
])

function tagToScore(tag: string, tagTierMap?: TagTierMap): BhasScore {
  // F47: prefer DB-driven tier; fall back to hardcoded sets for legacy tags
  if (tagTierMap) {
    const tier = tagTierMap.get(tag)
    if (tier === 'optimal') return 1
    if (tier === 'improvement') return 0.5
    if (tier === 'out_of_range') return 0
    // tier is null/undefined — fall through to hardcoded fallback below
  }
  if (OPTIMAL_TAGS.has(tag)) return 1
  if (IMPROVEMENT_TAGS.has(tag)) return 0.5
  return 0
}

function scoreToLabel(score: BhasScore): 'Optimal' | 'Improvement' | 'Out of Range' {
  if (score === 1) return 'Optimal'
  if (score === 0.5) return 'Improvement'
  return 'Out of Range'
}

export interface UserLabResult {
  id: string
  markerName: string
  value: number
  unit: string
  date: string
  minNormal: number
  maxNormal: number
}

/**
 * Evaluate a single user value against a rule
 */
function evaluateRule(userValue: number, rule: LogicRule): boolean {
  switch (rule.operator) {
    case 'between':
      return userValue >= rule.min_value && userValue <= rule.max_value
    case '<':
      return userValue < rule.min_value
    case '>':
      return userValue > rule.max_value
    case '=':
      return userValue === rule.min_value
    case '<=':
      return userValue <= rule.min_value
    case '>=':
      return userValue >= rule.max_value
    default:
      return false
  }
}

/**
 * Find all tags that apply to a user based on their lab results
 * @param userResults - Array of user lab values
 * @param rules - Array of logic rules from database
 * @returns Array of applicable tags
 */
export function evaluateUserTags(
  userResults: UserLabResult[],
  rules: LogicRule[]
): string[] {
  const applicableTags = new Set<string>()

  // For each rule, check if the user has a matching lab value
  for (const rule of rules) {
    const userResult = userResults.find(
      r => r.markerName.toLowerCase() === rule.marker_name.toLowerCase()
    )

    if (userResult && evaluateRule(userResult.value, rule)) {
      applicableTags.add(rule.tag_to_apply)
    }
  }

  return Array.from(applicableTags)
}

/**
 * Get recommendations (resources) based on user tags
 * @param tags - Array of applicable tags
 * @param resources - All available resources from database
 * @returns Filtered resources that match user tags
 */
export interface Resource {
  id: string
  type: string
  title: string
  description: string
  tags: string[]
  link_url?: string
}

export function getRecommendedResources(
  tags: string[],
  resources: Resource[]
): Resource[] {
  if (tags.length === 0) return []

  // Return resources that have at least one matching tag
  return resources.filter(resource =>
    resource.tags.some(tag => tags.includes(tag))
  )
}

/**
 * Get a summary of user's health status based on their tags
 */
export function getHealthSummary(tags: string[]): {
  areas: string[]
  recommendations: number
} {
  return {
    areas: tags,
    recommendations: tags.length,
  }
}

/**
 * Calculate the BHAS score for a user based on their lab results and the fired logic rules.
 *
 * For each marker the user has entered, we find which tag fired (from evaluateUserTags),
 * classify it as Optimal (1), Improvement (0.5), or Out of Range (0), and roll it up.
 *
 * @param userResults - The user's lab results
 * @param rules       - All logic rules from the database (with marker_name joined)
 * @returns BhasResult containing per-marker scores and totals
 */
export function calculateBhasScore(
  userResults: UserLabResult[],
  rules: LogicRule[],
  tagTierMap?: TagTierMap
): BhasResult {
  // Deduplicate to the latest result per marker before scoring.
  // Without this, multiple historical entries for the same marker produce
  // duplicate chips (and inflate maxPossible).
  const latestByMarker = new Map<string, UserLabResult>()
  for (const r of userResults) {
    const key = r.markerName.toLowerCase()
    const existing = latestByMarker.get(key)
    if (!existing || new Date(r.date) > new Date(existing.date)) {
      latestByMarker.set(key, r)
    }
  }
  const dedupedResults = Array.from(latestByMarker.values())

  const markerScores: MarkerScore[] = []

  for (const result of dedupedResults) {
    // Find all rules for this marker
    const markerRules = rules.filter(
      r => r.marker_name.toLowerCase() === result.markerName.toLowerCase()
    )

    // Find the rule that fires for this user's value
    const firedRule = markerRules.find(r => evaluateRule(result.value, r))

    const tag = firedRule?.tag_to_apply ?? ''
    const score = tagToScore(tag, tagTierMap)

    markerScores.push({
      markerName: result.markerName,
      score,
      tag,
      label: scoreToLabel(score),
    })
  }

  const totalScore = markerScores.reduce((sum, m) => sum + m.score, 0)
  const maxPossible = markerScores.length
  const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0

  return { markerScores, totalScore, maxPossible, percentage }
}
