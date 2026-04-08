import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Detect session in URL (for OAuth redirects)
    detectSessionInUrl: true,
    // Persist session to localStorage
    persistSession: true,
    // Auto-refresh token before it expires
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-client-info': 'nhl-app',
    },
  },
})

// Track if we recently returned from being hidden
// This helps pages know they should retry failed requests
let wasHidden = false
let lastVisibleTime = Date.now()

export function wasRecentlyHidden(): boolean {
  return wasHidden && (Date.now() - lastVisibleTime < 2000)
}

export function markConnectionReady(): void {
  wasHidden = false
}

// Refresh Supabase connection when window regains focus
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      wasHidden = true
      console.log('[Supabase] Tab hidden')
    } else {
      lastVisibleTime = Date.now()
    }
  })
}

/**
 * Wraps a Supabase query with a timeout
 * If the query takes longer than timeoutMs, it will reject with a timeout error
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

/**
 * Gets the current JWT from localStorage — does NOT call supabase.auth.getSession().
 * Safe to call at any time without risk of deadlocking the auth client.
 */
export function getStoredJwt(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          return parsed?.access_token ?? null
        }
      }
    }
  } catch {}
  return null
}

/**
 * Gets both access_token and refresh_token from localStorage.
 * Used to hydrate the Supabase JS client session without calling getSession().
 */
export function getStoredSession(): { access_token: string; refresh_token: string } | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed?.access_token && parsed?.refresh_token) {
            return { access_token: parsed.access_token, refresh_token: parsed.refresh_token }
          }
        }
      }
    }
  } catch {}
  return null
}

/**
 * Makes a direct fetch to Supabase REST API, bypassing the JS client
 * This is more reliable when the client connection is stale
 */
export async function directFetch<T>(table: string, options?: {
  select?: string
  eq?: { column: string; value: string | boolean }
  order?: { column: string; ascending?: boolean }
  timeout?: number
}): Promise<{ data: T[] | null; error: Error | null }> {
  const timeoutMs = options?.timeout || 8000

  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}`
    const params = new URLSearchParams()

    if (options?.select) {
      params.set('select', options.select)
    } else {
      params.set('select', '*')
    }

    if (options?.eq) {
      params.set(options.eq.column, `eq.${options.eq.value}`)
    }

    if (options?.order) {
      params.set('order', `${options.order.column}.${options.order.ascending ? 'asc' : 'desc'}`)
    }

    const queryString = params.toString()
    if (queryString) {
      url += `?${queryString}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    console.log('[Supabase] Direct fetch:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[Supabase] Direct fetch success:', data?.length, 'rows')
    return { data, error: null }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { data: null, error: new Error(`Query timeout after ${timeoutMs}ms`) }
    }
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}
