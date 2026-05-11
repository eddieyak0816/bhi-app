import React, { useState, useEffect } from 'react'

interface LabRow {
  id: string
  user_id: string
  username: string | null
  public_id: string | null
  marker_name: string
  value: number
  unit: string
  date: string
  min_normal: number | null
  max_normal: number | null
  verification_type: string | null
}

interface OrgOption { id: string; name: string }

interface Props { theme: any }

const BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
const BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
function apiUrl(path: string) { return BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${path}` : path }
function authHeaders() { return { 'x-backend-api-key': BACKEND_KEY } }

export default function AdminLabResultsTab({ theme }: Props) {
  const [results, setResults] = useState<LabRow[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [markers, setMarkers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [filterOrg, setFilterOrg] = useState('')
  const [filterMarker, setFilterMarker] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterUser, setFilterUser] = useState('')

  // Expanded row: "user_id|marker_name" key
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const params = new URLSearchParams()
      if (filterOrg)      params.set('org_id', filterOrg)
      if (filterMarker)   params.set('marker_name', filterMarker)
      if (filterDateFrom) params.set('date_from', filterDateFrom)
      if (filterDateTo)   params.set('date_to', filterDateTo)
      if (filterUser)     params.set('user_id', filterUser)

      const res = await fetch(apiUrl(`/api/admin/lab-results?${params}`), { headers: authHeaders() })
      if (!res.ok) { setError('Failed to load lab results.'); return }
      const data = await res.json()
      setResults(data.results || [])
      if (data.orgs?.length)    setOrgs(data.orgs)
      if (data.markers?.length) setMarkers(data.markers)
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  // Load orgs + markers on mount for filter dropdowns (empty search)
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load()
  }

  function toggleExpand(userId: string, markerName: string) {
    const key = `${userId}|${markerName}`
    setExpanded(prev => prev === key ? null : key)
  }

  // For expanded view: all rows for a given user+marker, sorted oldest→newest
  function getHistory(userId: string, markerName: string): LabRow[] {
    return results
      .filter(r => r.user_id === userId && r.marker_name === markerName)
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  // Deduplicate to show latest row per user+marker in the main table
  const latestByUserMarker = new Map<string, LabRow>()
  for (const r of results) {
    const key = `${r.user_id}|${r.marker_name}`
    if (!latestByUserMarker.has(key)) latestByUserMarker.set(key, r)
  }
  const tableRows = Array.from(latestByUserMarker.values())

  const s = {
    input: { padding: '6px 10px', border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bgSecondary, color: theme.text, width: '100%' } as React.CSSProperties,
    label: { display: 'block', marginBottom: 4, fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    th: { padding: '8px 10px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: `2px solid ${theme.borderColor}`, whiteSpace: 'nowrap' as const },
    td: { padding: '9px 10px', fontSize: 13, color: theme.text, borderBottom: `1px solid ${theme.borderColor}` },
  }

  function valueColor(r: LabRow) {
    if (r.min_normal == null || r.max_normal == null) return theme.text
    if (r.value >= r.min_normal && r.value <= r.max_normal) return '#16a34a'
    if (r.value < r.min_normal * 0.85 || r.value > r.max_normal * 1.15) return '#dc2626'
    return '#d97706'
  }

  return (
    <div>
      <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: theme.text }}>Lab Results Viewer</h3>

      {/* Filters */}
      <form onSubmit={handleSearch} style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={s.label}>Organization</label>
            <select value={filterOrg} onChange={e => setFilterOrg(e.target.value)} style={s.input}>
              <option value="">All orgs</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Marker</label>
            <select value={filterMarker} onChange={e => setFilterMarker(e.target.value)} style={s.input}>
              <option value="">All markers</option>
              {markers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={s.label}>Date From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>Date To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} style={s.input} />
          </div>
          <div>
            <label style={s.label}>User ID</label>
            <input type="text" placeholder="UUID..." value={filterUser} onChange={e => setFilterUser(e.target.value)} style={s.input} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="submit" disabled={loading} style={{ padding: '7px 18px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {loading ? 'Loading…' : 'Search'}
          </button>
          <button type="button" onClick={() => { setFilterOrg(''); setFilterMarker(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterUser('') }}
            style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, color: theme.textMuted, cursor: 'pointer' }}>
            Clear
          </button>
          <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: 'auto' }}>
            {tableRows.length} unique user/marker pairs · {results.length} total entries
          </span>
        </div>
      </form>

      {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}

      {/* Results table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={s.th}></th>
              <th style={s.th}>User</th>
              <th style={s.th}>Public ID</th>
              <th style={s.th}>Marker</th>
              <th style={s.th}>Latest Value</th>
              <th style={s.th}>Normal Range</th>
              <th style={s.th}>Date</th>
              <th style={s.th}>Source</th>
              <th style={s.th}>History</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 && !loading && (
              <tr><td colSpan={9} style={{ ...s.td, textAlign: 'center', color: theme.textMuted, padding: '32px 0' }}>No results. Run a search above.</td></tr>
            )}
            {tableRows.map(r => {
              const expandKey = `${r.user_id}|${r.marker_name}`
              const isOpen = expanded === expandKey
              const history = isOpen ? getHistory(r.user_id, r.marker_name) : []
              const histCount = results.filter(x => x.user_id === r.user_id && x.marker_name === r.marker_name).length

              return (
                <React.Fragment key={r.id}>
                  <tr style={{ background: isOpen ? `${theme.blue ?? '#3b82f6'}08` : undefined }}>
                    <td style={{ ...s.td, width: 28, paddingRight: 0 }}>
                      {histCount > 1 && (
                        <button onClick={() => toggleExpand(r.user_id, r.marker_name)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, fontSize: 14, padding: 0 }}>
                          {isOpen ? '▼' : '▶'}
                        </button>
                      )}
                    </td>
                    <td style={s.td}>
                      {r.username
                        ? <span style={{ fontWeight: 600 }}>{r.username}</span>
                        : <span style={{ color: theme.textMuted, fontStyle: 'italic' }}>no username</span>}
                    </td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 11, color: theme.textMuted }}>{r.public_id || '—'}</td>
                    <td style={{ ...s.td, fontWeight: 500 }}>{r.marker_name}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: valueColor(r) }}>
                      {r.value} {r.unit}
                    </td>
                    <td style={{ ...s.td, color: theme.textMuted }}>
                      {r.min_normal != null && r.max_normal != null ? `${r.min_normal}–${r.max_normal} ${r.unit}` : '—'}
                    </td>
                    <td style={{ ...s.td, color: theme.textMuted }}>{r.date}</td>
                    <td style={s.td}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: r.verification_type === 'provider' ? '#dbeafe' : '#f0fdf4',
                        color: r.verification_type === 'provider' ? '#1d4ed8' : '#15803d',
                      }}>
                        {r.verification_type || 'self'}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: theme.textMuted, fontSize: 12 }}>
                      {histCount > 1 ? `${histCount} entries` : '—'}
                    </td>
                  </tr>

                  {/* Expanded history rows */}
                  {isOpen && (
                    <tr>
                      <td colSpan={9} style={{ padding: '0 0 0 38px', background: `${theme.blue ?? '#3b82f6'}05`, borderBottom: `1px solid ${theme.borderColor}` }}>
                        <div style={{ padding: '10px 0 14px' }}>
                          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: theme.textMuted }}>
                            Full history — {r.username || r.public_id} · {r.marker_name}
                          </p>
                          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {(['Date', 'Value', 'Normal Range', 'Source'] as string[]).map(h => (
                                  <th key={h} style={{ ...s.th, fontSize: 10, paddingTop: 4, paddingBottom: 4 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {history.map(h => (
                                <tr key={h.id}>
                                  <td style={{ ...s.td, fontSize: 12, paddingTop: 5, paddingBottom: 5 }}>{h.date}</td>
                                  <td style={{ ...s.td, fontSize: 12, fontWeight: 700, color: valueColor(h), paddingTop: 5, paddingBottom: 5 }}>{h.value} {h.unit}</td>
                                  <td style={{ ...s.td, fontSize: 12, color: theme.textMuted, paddingTop: 5, paddingBottom: 5 }}>
                                    {h.min_normal != null && h.max_normal != null ? `${h.min_normal}–${h.max_normal}` : '—'}
                                  </td>
                                  <td style={{ ...s.td, fontSize: 12, paddingTop: 5, paddingBottom: 5 }}>{h.verification_type || 'self'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
