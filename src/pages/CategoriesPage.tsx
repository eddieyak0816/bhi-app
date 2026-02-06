import React, { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { directFetch } from '../lib/supabase'
import { debug } from '../lib/debug'

interface Category {
  id: number
  name: string
  description?: string
}

export default function CategoriesPage() {
  const { theme } = useTheme()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await directFetch<Category>('categories', { timeout: 8000 })
        if (!mounted) return
        if (err) throw err
        setCategories(data || [])
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        debug.error('CategoriesPage', 'Failed to load categories', e instanceof Error ? e : new Error(msg))
        if (mounted) setError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const openLibrary = (name: string) => {
    try {
      localStorage.setItem('bhi-filter-category', name)
    } catch {}
    window.location.hash = '#/library'
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Categories</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>Browse categories used to match lab results and discover related content.</p>
      </div>

      {loading && <div style={{ color: theme.textMuted }}>Loading categories…</div>}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.06)', padding: 12, borderRadius: 6, color: '#b91c1c' }}>
          Error loading categories: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {categories.map(cat => (
            <div key={cat.id} style={{ background: theme.card, border: `1.5px solid ${theme.borderColor}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{cat.name}</div>
              <div style={{ color: theme.textMuted, fontSize: 13, marginBottom: 12 }}>{cat.description || ''}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openLibrary(cat.name)} style={{ background: theme.blue, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Browse</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
