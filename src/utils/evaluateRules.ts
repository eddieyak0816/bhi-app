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
