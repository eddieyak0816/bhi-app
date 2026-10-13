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
      localStorage.setItem('nhl-filter-category', name)
    } catch {}
    window.location.hash = '#/library'
  }

  // Presentation only below this line. Each card is one button that does what the old
  // "Browse" button did: openLibrary(name) — set the Library category filter and jump there.
  return (
    <div className="cat-root">
      <div className="cat-head">
        <h2>Categories</h2>
        <p>Browse categories used to match lab results and discover related content.</p>
        {!loading && !error && categories.length > 0 && (
          <span className="cat-count">{categories.length} {categories.length === 1 ? 'category' : 'categories'}</span>
        )}
      </div>

      {loading && (
        <div className="cat-grid" aria-busy="true" aria-label="Loading categories">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="cat-skel" />)}
        </div>
      )}

      {error && <div className="cat-err">Error loading categories: {error}</div>}

      {!loading && !error && categories.length === 0 && (
        <div className="cat-empty">No categories have been set up yet.</div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="cat-grid">
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              className="cat-card"
              onClick={() => openLibrary(cat.name)}
              aria-label={`Browse ${cat.name}`}
            >
              <span className={`cat-badge t${i % 4}`} aria-hidden="true">
                {(cat.name || '?').trim().charAt(0).toUpperCase()}
              </span>
              <span className="cat-name">{cat.name}</span>
              {cat.description && <span className="cat-desc">{cat.description}</span>}
              <span className="cat-go">
                Browse
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
