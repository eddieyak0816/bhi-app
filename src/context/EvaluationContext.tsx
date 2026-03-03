import React, { createContext, useContext, useState, useEffect } from 'react'
import { useResults } from './ResultsContext'
import { evaluateUserTags, getRecommendedResources, calculateBhasScore, type LogicRule, type Resource, type BhasResult } from '../utils/evaluateRules'
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

      // Fetch logic rules with marker names (joined)
      const rulesResponse = await supabase
        .from('logic_rules')
        .select(`
          id,
          marker_id,
          min_value,
          max_value,
          operator,
          tag_to_apply,
          lab_markers (name)
        `)

      // Fetch resources
      const resourcesResponse = await supabase.from('resources').select('*')

      if (rulesResponse.error) throw rulesResponse.error
      if (resourcesResponse.error) throw resourcesResponse.error

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

      const resources = resourcesResponse.data as Resource[]

      // Evaluate which tags apply to this user
      const tags = evaluateUserTags(results, rules)
      setApplicableTags(tags)

      // Calculate BHAS score
      setBhasResult(calculateBhasScore(results, rules))

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
