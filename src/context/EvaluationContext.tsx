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
