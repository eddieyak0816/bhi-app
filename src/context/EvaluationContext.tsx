import React, { createContext, useContext, useState, useEffect } from 'react'
import { useResults } from './ResultsContext'
import { evaluateUserTags, getRecommendedResources, calculateBhasScore, type LogicRule, type Resource, type BhasResult, type TagTierMap } from '../utils/evaluateRules'
import { supabase } from '../lib/supabase'

interface EvaluationContextType {
  applicableTags: string[]
  recommendedResources: Resource[]
  bhasResult: BhasResult | null
  loading: boolean
  error: string | null
  reevaluate: () => Promise<void>
}

const EvaluationContext = createContext<EvaluationContextType | undefined>(undefined)

// Rules, resources, and tags are shared content managed in Admin — the same data for every
// user, not specific to whoever is currently logged in. Previously, reevaluate() re-downloaded
// all three of these full tables from scratch every single time a user changed even one lab
// value, which is what made things feel slow after entering results (especially as Damon's
// content library grows — a fresh full download of every resource, every time, regardless of
// what actually changed). Caching them here for a short window means editing your own lab
// values only re-runs the fast local matching logic, not three full database downloads —
// while still picking up new/edited Admin content within a few minutes without needing a
// full page reload.
const SHARED_DATA_CACHE_MS = 5 * 60 * 1000 // 5 minutes
let sharedDataCache: { rules: LogicRule[]; resources: Resource[]; tagTierMap: TagTierMap; fetchedAt: number } | null = null

async function loadSharedData(): Promise<{ rules: LogicRule[]; resources: Resource[]; tagTierMap: TagTierMap }> {
  if (sharedDataCache && Date.now() - sharedDataCache.fetchedAt < SHARED_DATA_CACHE_MS) {
    return sharedDataCache
  }

  // Fetch logic rules with marker names (joined), resources, and tag tiers in parallel
  const [rulesResponse, resourcesResponse, tagsResponse] = await Promise.all([
    supabase.from('logic_rules').select(`
      id,
      marker_id,
      min_value,
      max_value,
      operator,
      tag_to_apply,
      lab_markers (name)
    `),
    supabase.from('resources').select('*'),
    supabase.from('tags').select('name, scoring_tier'),
  ])

  if (rulesResponse.error) throw rulesResponse.error
  if (resourcesResponse.error) throw resourcesResponse.error
  // tag tier fetch is best-effort — non-fatal if it fails

  // Transform rules to include marker_name from joined data
  const rulesData = rulesResponse.data as any[]
  const rules: LogicRule[] = rulesData.map(r => ({
    id: r.id,
    marker_id: r.marker_id,
    marker_name: r.lab_markers?.name || '',
    min_value: r.min_value,
    max_value: r.max_value,
    operator: r.operator || 'between',
    tag_to_apply: r.tag_to_apply,
  }))

  // Build tag tier map from DB (F47)
  const tagTierMap: TagTierMap = new Map(
    ((tagsResponse.data as any[]) ?? [])
      .filter(t => t.scoring_tier)
      .map(t => [t.name, t.scoring_tier])
  )

  const resources = resourcesResponse.data as Resource[]

  sharedDataCache = { rules, resources, tagTierMap, fetchedAt: Date.now() }
  return sharedDataCache
}

export function EvaluationProvider({ children }: { children: React.ReactNode }) {
  const { results } = useResults()
  const [applicableTags, setApplicableTags] = useState<string[]>([])
  const [recommendedResources, setRecommendedResources] = useState<Resource[]>([])
  const [bhasResult, setBhasResult] = useState<BhasResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reevaluate = async () => {
    if (results.length === 0) {
      setApplicableTags([])
      setRecommendedResources([])
      setBhasResult(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { rules, resources, tagTierMap } = await loadSharedData()

      // Evaluate which tags apply to this user
      const tags = evaluateUserTags(results, rules)
      setApplicableTags(tags)

      // Calculate BHAS score using DB-driven tier map
      setBhasResult(calculateBhasScore(results, rules, tagTierMap))

      // Get recommended resources
      const recommended = getRecommendedResources(tags, resources)
      setRecommendedResources(recommended)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('Evaluation error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Re-evaluate whenever results change
  useEffect(() => {
    reevaluate()
  }, [results])

  return (
    <EvaluationContext.Provider
      value={{
        applicableTags,
        recommendedResources,
        bhasResult,
        loading,
        error,
        reevaluate,
      }}
    >
      {children}
    </EvaluationContext.Provider>
  )
}

export function useEvaluation() {
  const context = useContext(EvaluationContext)
  if (!context) {
    throw new Error('useEvaluation must be used within EvaluationProvider')
  }
  return context
}
