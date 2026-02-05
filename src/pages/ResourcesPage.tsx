import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useEvaluation } from '../context/EvaluationContext'
import { supabase, withTimeout } from '../lib/supabase'
import { debug } from '../lib/debug'
import { useVisibilityRefresh } from '../hooks/useVisibilityRefresh'

interface Resource {
  id: string
  title: string
  type: string
  description?: string
  tags: string[]
  link_url?: string
}

export default function Resources() {
  const { theme } = useTheme()
  const { applicableTags } = useEvaluation()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const mountedRef = useRef(true)
  const loadControllerRef = useRef<AbortController | null>(null)
  const loadingTimerRef = useRef<number | null>(null)
  const [showRetryOverlay, setShowRetryOverlay] = useState(false)

  // Load resources from Supabase
  const loadResources = async () => {
    if (!mountedRef.current) return
    // cancel previous in-flight load if any
    try { loadControllerRef.current?.abort() } catch {};
    const controller = new AbortController()
    loadControllerRef.current = controller
    setShowRetryOverlay(false)
    setLoading(true)
    setError(null)
    debug.info('ResourcesPage', 'Starting to load resources')

    try {
      const queryPromise = supabase.from('resources').select('*')
      const { data, error: err } = await withTimeout(queryPromise as any, 8000)

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

    return () => {
      mountedRef.current = false
      try { loadControllerRef.current?.abort() } catch {}
      if (loadingTimerRef.current) {
        window.clearTimeout(loadingTimerRef.current)
      }
    }
  }, [])

  // Refresh data when tab becomes visible again after being hidden
  useVisibilityRefresh()

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
    const saved = localStorage.getItem('bhi-bookmarks')
    if (saved) {
      setBookmarks(new Set(JSON.parse(saved)))
    }
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
    localStorage.setItem('bhi-bookmarks', JSON.stringify(Array.from(newBookmarks)))
  }

  const uniqueTypes = Array.from(new Set(resources.map(r => r.type)))
  const uniqueTags = Array.from(new Set(resources.flatMap(r => r.tags)))

  const filtered = resources.filter(r => {
    const matchType = !filterType || r.type === filterType
    const matchTag = !filterTag || r.tags.includes(filterTag)
    const matchSearch = !searchTerm || r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchType && matchTag && matchSearch
  })

  // Prioritize resources matching user's tags
  const prioritized = [...filtered].sort((a, b) => {
    const aMatches = a.tags.filter(t => applicableTags.includes(t)).length
    const bMatches = b.tags.filter(t => applicableTags.includes(t)).length
    return bMatches - aMatches
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Resources</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>Explore health articles, guides, and recommendations</p>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1.5px solid #FCA5A5',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            color: '#DC2626',
          }}
        >
          Error loading resources: {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: theme.textMuted }}>
          Loading resources...
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div
            style={{
              background: theme.card,
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1.5px solid ${theme.borderColor}`,
                  borderRadius: 6,
                  fontSize: 14,
                  background: theme.bg,
                  color: theme.text,
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Type</label>
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: `1.5px solid ${theme.borderColor}`,
                    borderRadius: 6,
                    fontSize: 14,
                    background: theme.bg,
                    color: theme.text,
                  }}
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Tag</label>
                <select
                  value={filterTag}
                  onChange={e => setFilterTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: `1.5px solid ${theme.borderColor}`,
                    borderRadius: 6,
                    fontSize: 14,
                    background: theme.bg,
                    color: theme.text,
                  }}
                >
                  <option value="">All Tags</option>
                  {uniqueTags.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ color: theme.textMuted, margin: 0 }}>
              {prioritized.length} resource{prioritized.length !== 1 ? 's' : ''} found
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  background: viewMode === 'grid' ? theme.blue : theme.card,
                  color: viewMode === 'grid' ? '#fff' : theme.text,
                  border: viewMode === 'grid' ? 'none' : `1.5px solid ${theme.borderColor}`,
                  borderRadius: 6,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📊 Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  background: viewMode === 'list' ? theme.blue : theme.card,
                  color: viewMode === 'list' ? '#fff' : theme.text,
                  border: viewMode === 'list' ? 'none' : `1.5px solid ${theme.borderColor}`,
                  borderRadius: 6,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                📋 List
              </button>
            </div>
          </div>

          {/* Resources Display */}
          {prioritized.length > 0 ? (
            <div
              style={{
                display: viewMode === 'grid' ? 'grid' : 'flex',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : 'auto',
                flexDirection: viewMode === 'list' ? 'column' : 'row',
                gap: 16,
              }}
            >
              {prioritized.map(resource => {
                const isBookmarked = bookmarks.has(resource.id)
                const matchingTags = resource.tags.filter(t => applicableTags.includes(t))
                return (
                  <div
                    key={resource.id}
                    style={{
                      background: theme.card,
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 8,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: viewMode === 'list' ? 'row' : 'column',
                      gap: viewMode === 'list' ? 16 : 0,
                      justifyContent: viewMode === 'list' ? 'space-between' : 'flex-start',
                      alignItems: viewMode === 'list' ? 'flex-end' : 'stretch',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.borderColor = theme.blue
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.borderColor = theme.borderColor
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {resource.type}
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: theme.text }}>{resource.title}</h3>
                      <p style={{ margin: '0 0 12px 0', color: theme.textMuted, fontSize: 14 }}>{resource.description}</p>
                      {resource.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {resource.tags.map(tag => {
                            const isRecommended = applicableTags.includes(tag)
                            return (
                              <span
                                key={tag}
                                style={{
                                  background: isRecommended ? 'rgba(59, 130, 246, 0.15)' : theme.bgSecondary,
                                  border: `1px solid ${isRecommended ? '#93C5FD' : theme.borderColor}`,
                                  borderRadius: 4,
                                  padding: '4px 8px',
                                  fontSize: 12,
                                  color: isRecommended ? theme.blue : theme.textMuted,
                                  fontWeight: isRecommended ? 500 : 400,
                                }}
                              >
                                {isRecommended ? '✓ ' : ''}{tag}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexDirection: viewMode === 'list' ? 'row' : 'column', marginTop: viewMode === 'list' ? 0 : 12 }}>
                      <button
                        onClick={() => toggleBookmark(resource.id)}
                        style={{
                          background: isBookmarked ? theme.blue : 'transparent',
                          color: isBookmarked ? '#fff' : theme.text,
                          border: `1.5px solid ${theme.borderColor}`,
                          borderRadius: 6,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark'}
                      </button>
                      {resource.link_url && (
                        <a
                          href={resource.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: 'none',
                            textAlign: 'center',
                          }}
                        >
                          Open →
                        </a>
                      )}
                      <button
                        onClick={() => setSelectedResource(resource)}
                        style={{
                          background: theme.blue,
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div
              style={{
                background: theme.card,
                border: `1.5px solid ${theme.borderColor}`,
                borderRadius: 8,
                padding: 48,
                textAlign: 'center',
                color: theme.textMuted,
              }}
            >
              <p style={{ margin: 0 }}>No resources found. Try adjusting your filters.</p>
            </div>
          )}

          {/* Detail Panel Modal */}
          {selectedResource && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
              onClick={() => setSelectedResource(null)}
            >
              <div
                style={{
                  background: theme.bg,
                  border: `1.5px solid ${theme.borderColor}`,
                  borderRadius: 8,
                  padding: 32,
                  maxWidth: 600,
                  maxHeight: '80vh',
                  overflow: 'auto',
                  color: theme.text,
                }}
                onClick={e => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{selectedResource.title}</h2>
                  <button
                    onClick={() => setSelectedResource(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: 24,
                      cursor: 'pointer',
                      color: theme.text,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16, textTransform: 'uppercase', fontWeight: 600 }}>
                  {selectedResource.type}
                </div>

                <p style={{ color: theme.textMuted, marginBottom: 16, fontSize: 15, lineHeight: 1.6 }}>
                  {selectedResource.description}
                </p>

                {selectedResource.tags.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: theme.textMuted }}>TAGS</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {selectedResource.tags.map(tag => (
                        <span
                          key={tag}
                          style={{
                            background: theme.bgSecondary,
                            border: `1px solid ${theme.borderColor}`,
                            borderRadius: 4,
                            padding: '6px 12px',
                            fontSize: 13,
                            color: theme.text,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => {
                      toggleBookmark(selectedResource.id)
                    }}
                    style={{
                      background: bookmarks.has(selectedResource.id) ? theme.blue : 'transparent',
                      color: bookmarks.has(selectedResource.id) ? '#fff' : theme.text,
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      flex: 1,
                    }}
                  >
                    {bookmarks.has(selectedResource.id) ? '⭐ Bookmarked' : '☆ Bookmark'}
                  </button>
                  {selectedResource.link_url && (
                    <a
                      href={selectedResource.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: theme.blue,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: 'none',
                        flex: 1,
                        textAlign: 'center',
                      }}
                    >
                      Learn More →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

            {/* Retry overlay when loading stalls */}
            {showRetryOverlay && (
              <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000}}>
                <div style={{background:theme.card,padding:24,borderRadius:8,maxWidth:420,textAlign:'center',color:theme.text}}>
                  <h3 style={{marginTop:0}}>Still loading?</h3>
                  <p style={{color:theme.textMuted,marginBottom:12}}>The data load appears to be taking longer than expected. You can retry manually.</p>
                  <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                    <button onClick={() => { setShowRetryOverlay(false); loadResources() }} style={{background:'#16a34a',border:'none',borderRadius:6,padding:'10px 14px',color:'#fff',cursor:'pointer'}}>Retry</button>
                    <button onClick={() => setShowRetryOverlay(false)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'10px 14px',color:theme.text,cursor:'pointer'}}>Dismiss</button>
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  )
}
