/**
 * Loads the admin-managed marker groups (Admin → Markers → Marker Groups).
 *
 * A group is one NHLS score slot that several interchangeable markers can fill —
 * HbA1c / fructosamine / c-peptide / HOMA-IR all measure glucose control, so a patient
 * shouldn't lose a point for having had one test rather than another.
 *
 * Any failure — table missing, offline, malformed rows — returns an empty array, and the
 * scoring engine then behaves exactly as it does today. A problem here can never break
 * or silently skew the score.
 *
 * Direct REST fetch rather than the Supabase JS client, matching the pattern used
 * elsewhere in this app to avoid the getSession() stall seen after several navigations.
 */
import { getStoredJwt } from '../lib/supabase'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string || ''
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string || ''

const CACHE_MS = 5 * 60 * 1000
let cache: { value: MarkerGroup[]; fetchedAt: number } | null = null

export interface MarkerGroup {
  groupKey: string
  label: string
  description: string | null
  /** Marker names in priority order — the first one the patient has is the one that scores. */
  markerNames: string[]
}

interface GroupRow {
  group_key: string
  label: string
  description: string | null
  sort_order: number
  is_active: boolean
}

interface MemberRow {
  group_key: string
  marker_name: string
  sort_order: number
}

export async function loadMarkerGroups(): Promise<MarkerGroup[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) return cache.value
  if (!SUPABASE_URL) return []

  try {
    const jwt = getStoredJwt()
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt || SUPABASE_ANON_KEY}` }

    const [groupsRes, membersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/marker_groups?select=group_key,label,description,sort_order,is_active&order=sort_order`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/marker_group_members?select=group_key,marker_name,sort_order&order=sort_order`, { headers }),
    ])
    if (!groupsRes.ok || !membersRes.ok) return []

    const groups = (await groupsRes.json()) as GroupRow[]
    const members = (await membersRes.json()) as MemberRow[]
    if (!Array.isArray(groups) || !Array.isArray(members)) return []

    const byGroup = new Map<string, MemberRow[]>()
    for (const m of members) {
      if (!m || !m.group_key || !m.marker_name) continue
      const list = byGroup.get(m.group_key) || []
      list.push(m)
      byGroup.set(m.group_key, list)
    }

    const result = groups
      .filter(g => g && g.is_active !== false)
      .map(g => ({
        groupKey: g.group_key,
        label: g.label,
        description: g.description ?? null,
        markerNames: (byGroup.get(g.group_key) || [])
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(m => m.marker_name),
      }))
      // A group with no members can't score anything — drop it rather than render an
      // empty slot that would drag the total down for everyone.
      .filter(g => g.markerNames.length > 0)

    cache = { value: result, fetchedAt: Date.now() }
    return result
  } catch {
    return []
  }
}

/** Call after an admin edits groups, so the next score uses them immediately. */
export function clearMarkerGroupCache(): void {
  cache = null
}
