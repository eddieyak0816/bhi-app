import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useEvaluation } from '../context/EvaluationContext'
import { directFetch } from '../lib/supabase'
import { debug } from '../lib/debug'
import { recordView } from '../utils/recentlyViewed'

interface Resource {
  id: string
  title: string
  type: string
  description?: string
  tags: string[]
  link_url?: string
  thumbnail_url?: string
}

export default function Resources() {
  const { theme } = useTheme()
  const { applicableTags } = useEvaluation()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriesList, setCategoriesList] = useState<Array<{ id: number; name: string }>>([])
  const [categoryTagMap, setCategoryTagMap] = useState<Record<string, string[]>>({})
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const mountedRef = useRef(true)
  const loadControllerRef = useRef<AbortController | null>(null)
  const loadingTimerRef = useRef<number | null>(null)
  const [showRetryOverlay, setShowRetryOverlay] = useState(false)

  // Load resources using direct fetch (more reliable than Supabase client after window switches)
  const loadResources = async (retryCount = 0) => {
    if (!mountedRef.current) return
    // cancel previous in-flight load if any
    try { loadControllerRef.current?.abort() } catch {};
    const controller = new AbortController()
    loadControllerRef.current = controller
    setShowRetryOverlay(false)
    setLoading(true)
    setError(null)

    debug.info('ResourcesPage', `Starting to load resources (attempt ${retryCount + 1})`)

    try {
      // Always use direct fetch - it's more reliable than the Supabase client
      // The Supabase JS client can get stuck after window/tab switches
      const { data, error: err } = await directFetch<Resource>('resources', { timeout: 8000 })

      // If the controller was aborted while waiting, stop here
      if (controller.signal.aborted) return

      if (err) throw err

      // Validate schema
      const schemaValidation = debug.validateSchema(
        'ResourcesPage',
        data || [],
        ['id', 'type', 'title', 'tags', 'link_url'],
        'resources'
      )

      if (!schemaValidation.valid) {
        throw new Error(`Schema mismatch: ${schemaValidation.issues.join('; ')}`)
      }

      // Check data integrity
      const integrityCheck = debug.checkDataIntegrity(
        'ResourcesPage',
        data || [],
        ['id', 'type', 'title', 'tags'],
        'resources'
      )

      if (!integrityCheck.healthy) {
        debug.warn('ResourcesPage', 'Data integrity issues found', {
          issueCount: integrityCheck.issues.length
        })
      }

      if (mountedRef.current && !controller.signal.aborted) setResources(data || [])
      if (mountedRef.current && !controller.signal.aborted) setError(null)
      debug.info('ResourcesPage', `Successfully loaded ${(data || []).length} resources`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      debug.error('ResourcesPage', `Resources error: ${errorMsg}`, err instanceof Error ? err : new Error(String(err)))

      // Auto-retry on timeout
      if (errorMsg.includes('timeout') && retryCount < 2 && mountedRef.current && !controller.signal.aborted) {
        debug.info('ResourcesPage', `Timeout detected, auto-retrying (attempt ${retryCount + 2})...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        if (mountedRef.current && !controller.signal.aborted) {
          loadResources(retryCount + 1)
          return
        }
      }

      if (mountedRef.current && !controller.signal.aborted) setError(errorMsg)
    } finally {
        if (mountedRef.current && !controller.signal.aborted) setLoading(false)
        // clear controller when done
        if (loadControllerRef.current === controller) loadControllerRef.current = null
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadResources()

    // If navigated from Categories page, a category name may be stored in localStorage
    try {
      const cat = localStorage.getItem('nhl-filter-category') ?? localStorage.getItem('bhi-filter-category')
      if (cat) {
        setFilterCategory(cat)
        localStorage.removeItem('nhl-filter-category')
        localStorage.removeItem('bhi-filter-category')
      }
    } catch {}

    return () => {
      mountedRef.current = false
      try { loadControllerRef.current?.abort() } catch {}
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
      }
    }
  }, [])

  // Show retry overlay if a normal load gets stuck
  useEffect(() => {
    if (loading) {
      if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current)
      loadingTimerRef.current = window.setTimeout(() => {
        if (loading) setShowRetryOverlay(true)
      }, 5000)
    } else {
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
      setShowRetryOverlay(false)
    }
    return () => {
      if (loadingTimerRef.current) window.clearTimeout(loadingTimerRef.current)
    }
  }, [loading])

  // Load bookmarks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nhl-bookmarks') ?? localStorage.getItem('bhi-bookmarks')
    if (saved) {
      setBookmarks(new Set(JSON.parse(saved)))
    }
  }, [])

  // Load categories and tag->category mapping for client-side filtering
  useEffect(() => {
    let mounted = true
    async function loadCategories() {
      try {
        const { data: cats, error: catsErr } = await directFetch<{ id: number; name: string }>('categories', { timeout: 8000 })
        if (catsErr) throw catsErr
        if (!mounted) return
        const catsArr = cats || []
        setCategoriesList(catsArr)

        // Load tag_categories join rows
        const { data: tcs, error: tcErr } = await directFetch<{ tag_name: string; category_id: number }>('tag_categories', { timeout: 8000 })
        if (tcErr) throw tcErr
        const tcRows = tcs || []

        const idToName: Record<number, string> = {}
        for (const c of catsArr) idToName[c.id] = c.name

        const map: Record<string, string[]> = {}
        for (const row of tcRows) {
          const cname = idToName[row.category_id]
          if (!cname) continue
          map[cname] = map[cname] || []
          if (!map[cname].includes(row.tag_name)) map[cname].push(row.tag_name)
        }
        if (mounted) setCategoryTagMap(map)
      } catch (err) {
        debug.warn('ResourcesPage', 'Failed to load categories or tag mappings', err)
      }
    }
    loadCategories()
    return () => { mounted = false }
  }, [])

  // Save bookmarks to localStorage
  const toggleBookmark = (id: string) => {
    const newBookmarks = new Set(bookmarks)
    if (newBookmarks.has(id)) {
      newBookmarks.delete(id)
    } else {
      newBookmarks.add(id)
    }
    setBookmarks(newBookmarks)
    localStorage.setItem('nhl-bookmarks', JSON.stringify(Array.from(newBookmarks)))
  }

  const uniqueTypes = Array.from(new Set(resources.map(r => r.type))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const uniqueTags = Array.from(new Set(resources.flatMap(r => r.tags))).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  const uniqueCategories = categoriesList.map(c => c.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

  const filtered = resources.filter(r => {
    const matchType = !filterType || r.type === filterType
    const matchTag = !filterTag || r.tags.includes(filterTag)

    // match category filter: check resource.tags intersection with tags assigned to selected category
    let matchCategory = true
    if (filterCategory) {
      const tagsForCategory = categoryTagMap[filterCategory] || []
      const resourceTags = r.tags || []
      matchCategory = resourceTags.some(t => tagsForCategory.includes(t)) || (Array.isArray((r as any).categories) && (r as any).categories.includes(filterCategory))
    }

    const q = searchTerm.trim().toLowerCase()
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)) || (Array.isArray((r as any).categories) && (r as any).categories.join(' ').toLowerCase().includes(q))

    return matchType && matchTag && matchCategory && matchSearch
  })

  // Prioritize resources matching user's tags
  const prioritized = [...filtered].sort((a, b) => {
    const aMatches = a.tags.filter(t => applicableTags.includes(t)).length
    const bMatches = b.tags.filter(t => applicableTags.includes(t)).length
    if (bMatches !== aMatches) return bMatches - aMatches
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  })

  // ── Presentation only below this line ───────────────────────────────────────
  // Every handler is the one that was here before: setFilter*/setSearchTerm, setViewMode,
  // toggleBookmark, setSelectedResource, recordView, loadResources. Only markup and styling changed.

  // Cards show the first few tags (the user's recommended ones first, so the ones that matter
  // to them are always visible) and "+N more"; View Details lists every tag.
  const MAX_TAGS = 6

  const starIcon = (filled: boolean) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  )

  return (
    <div className="lib-root">
      <div className="lib-head">
        <h2>Library</h2>
        <p>Explore health articles, guides, and recommendations</p>
      </div>

      {error && <div className="lib-err">Error loading resources: {error}</div>}

      {loading ? (
        <div className="lib-grid" aria-busy="true" aria-label="Loading resources">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="lib-skel" />)}
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="lib-filters">
            <div className="lib-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                className="lib-input"
                type="text"
                placeholder="Search library..."
                aria-label="Search library"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="lib-selects">
              <div>
                <label className="lib-label" htmlFor="lib-type">Type</label>
                <select id="lib-type" className="lib-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">All Types</option>
                  {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="lib-label" htmlFor="lib-tag">Tag</label>
                <select id="lib-tag" className="lib-select" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                  <option value="">All Tags</option>
                  {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="lib-label" htmlFor="lib-cat">Category</label>
                <select id="lib-cat" className="lib-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="lib-bar">
            <p className="lib-count">
              {prioritized.length} resource{prioritized.length !== 1 ? 's' : ''} found
            </p>
            <div className="lib-segs" role="group" aria-label="View mode">
              <button className={viewMode === 'grid' ? 'on' : ''} onClick={() => setViewMode('grid')} aria-pressed={viewMode === 'grid'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
                <span>Grid</span>
              </button>
              <button className={viewMode === 'list' ? 'on' : ''} onClick={() => setViewMode('list')} aria-pressed={viewMode === 'list'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
                <span>List</span>
              </button>
            </div>
          </div>

          {/* Resources Display */}
          {prioritized.length > 0 ? (
            <div className={viewMode === 'grid' ? 'lib-grid' : 'lib-list'}>
              {prioritized.map(resource => {
                const isBookmarked = bookmarks.has(resource.id)
                const orderedTags = [...resource.tags].sort(
                  (x, y) => Number(applicableTags.includes(y)) - Number(applicableTags.includes(x))
                )
                const shownTags = orderedTags.slice(0, MAX_TAGS)
                const hiddenCount = orderedTags.length - shownTags.length
                return (
                  <article key={resource.id} className={`lib-card${viewMode === 'list' ? ' row' : ''}`}>
                    <button
                      className={`lib-bm${isBookmarked ? ' on' : ''}`}
                      onClick={() => toggleBookmark(resource.id)}
                      aria-pressed={isBookmarked}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this resource'}
                      title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
                    >
                      {starIcon(isBookmarked)}
                    </button>

                    {resource.thumbnail_url && (
                      <img className="lib-thumb" src={resource.thumbnail_url} alt="" loading="lazy" />
                    )}

                    <div className="lib-body">
                      <div className="lib-main">
                        <div className="lib-kicker">{resource.type}</div>
                        <h3 className="lib-title">{resource.title}</h3>
                        {resource.description && <p className="lib-desc">{resource.description}</p>}
                        {resource.tags.length > 0 && (
                          <div className="lib-tags">
                            {shownTags.map(tag => {
                              const isRecommended = applicableTags.includes(tag)
                              return (
                                <span key={tag} className={`lib-tag${isRecommended ? ' rec' : ''}`}>
                                  {isRecommended ? '✓ ' : ''}{tag}
                                </span>
                              )
                            })}
                            {hiddenCount > 0 && <span className="lib-tag more">+{hiddenCount} more</span>}
                          </div>
                        )}
                      </div>

                      <div className="lib-actions">
                        {resource.link_url && (
                          <a
                            className="lib-btn primary"
                            href={resource.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => recordView(resource)}
                          >
                            Open →
                          </a>
                        )}
                        <button
                          className="lib-btn ghost"
                          onClick={() => { setSelectedResource(resource); recordView(resource) }}
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="lib-empty">
              <p style={{ margin: 0 }}>No resources found. Try adjusting your filters.</p>
            </div>
          )}

          {/* Detail Panel Modal */}
          {selectedResource && (
            <div className="lib-modal-bg" onClick={() => setSelectedResource(null)}>
              <div
                className="lib-modal"
                role="dialog"
                aria-modal="true"
                aria-label={selectedResource.title}
                onClick={e => e.stopPropagation()}
              >
                {selectedResource.thumbnail_url && (
                  <img className="lib-modal-img" src={selectedResource.thumbnail_url} alt="" />
                )}
                <div className="lib-modal-in">
                  <div className="lib-kicker" style={{ paddingRight: 0 }}>{selectedResource.type}</div>
                  <div className="lib-modal-top">
                    <h2>{selectedResource.title}</h2>
                    <button className="lib-x" onClick={() => setSelectedResource(null)} aria-label="Close">
                      <svg width="16" height="16" viewBox="0 0 17 17" fill="none" aria-hidden="true">
                        <path d="M1 1l15 15M16 1L1 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  {selectedResource.description && <p className="lib-modal-desc">{selectedResource.description}</p>}

                  {selectedResource.tags.length > 0 && (
                    <div>
                      <div className="lib-modal-tags-h">Tags</div>
                      <div className="lib-tags" style={{ flex: 'none', marginBottom: 0 }}>
                        {selectedResource.tags.map(tag => (
                          <span key={tag} className="lib-tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="lib-modal-actions">
                    <button
                      className="lib-btn ghost"
                      onClick={() => { toggleBookmark(selectedResource.id) }}
                      aria-pressed={bookmarks.has(selectedResource.id)}
                    >
                      <span style={{ display: 'inline-flex', marginRight: 8 }}>{starIcon(bookmarks.has(selectedResource.id))}</span>
                      {bookmarks.has(selectedResource.id) ? 'Bookmarked' : 'Bookmark'}
                    </button>
                    {selectedResource.link_url && (
                      <a
                        className="lib-btn primary"
                        href={selectedResource.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn More →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Retry overlay when loading stalls */}
          {showRetryOverlay && (
            <div className="lib-retry">
              <div className="lib-retry-card">
                <h3>Still loading?</h3>
                <p>The data load appears to be taking longer than expected. You can retry manually.</p>
                <div className="row">
                  <button className="lib-btn primary" style={{ flex: 'none', padding: '11px 22px' }} onClick={() => { setShowRetryOverlay(false); loadResources() }}>Retry</button>
                  <button className="lib-btn ghost" style={{ flex: 'none', padding: '11px 22px' }} onClick={() => setShowRetryOverlay(false)}>Dismiss</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
