/**
 * Loads the admin-editable NHLS v2.3 score cutoffs (Admin → Score Thresholds).
 *
 * Cached for the session because thresholds change rarely but the score is recalculated
 * often. Any failure — table missing, offline, partial data — falls back to
 * DEFAULT_THRESHOLDS, so a problem here can never break or silently skew scoring.
 *
 * Direct REST fetch rather than the Supabase JS client, matching the pattern used
 * elsewhere in this app to avoid the getSession() stall seen after several navigations.
 */
import { DEFAULT_THRESHOLDS, type ScoreThresholds, type ThresholdKey, type MetricThreshold } from './bhasV2'
import { getStoredJwt } from '../lib/supabase'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string || ''
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string || ''

const CACHE_MS = 5 * 60 * 1000
let cache: { value: ScoreThresholds; fetchedAt: number } | null = null

interface ThresholdRow {
  metric_key: string
  optimal_value: number | string
  improvement_value: number | string
  lower_is_better: boolean
}

export async function loadScoreThresholds(): Promise<ScoreThresholds> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.value
  if (!SUPABASE_URL) return DEFAULT_THRESHOLDS

  try {
    const jwt = getStoredJwt()
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/score_thresholds?select=metric_key,optimal_value,improvement_value,lower_is_better`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt || SUPABASE_ANON_KEY}` } }
    )
    if (!res.ok) return DEFAULT_THRESHOLDS

    const rows = (await res.json()) as ThresholdRow[]
    if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_THRESHOLDS

    // Start from defaults so an incomplete table still yields a full, valid set.
    const merged: ScoreThresholds = { ...DEFAULT_THRESHOLDS }
    for (const row of rows) {
      const key = row.metric_key as ThresholdKey
      if (!(key in merged)) continue // ignore unknown keys rather than crashing
      const optimal = Number(row.optimal_value)
      const improvement = Number(row.improvement_value)
      if (!Number.isFinite(optimal) || !Number.isFinite(improvement)) continue
      merged[key] = { optimal, improvement, lowerIsBetter: !!row.lower_is_better } as MetricThreshold
    }

    cache = { value: merged, fetchedAt: Date.now() }
    return merged
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

/** Call after an admin saves, so the next score uses the new numbers immediately. */
export function clearScoreThresholdCache(): void {
  cache = null
}
