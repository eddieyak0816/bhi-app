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

  function valueColor(r: LabRow) {
    if (r.min_normal == null || r.max_normal == null) return theme.text
    if (r.value >= r.min_normal && r.value <= r.max_normal) return '#16a34a'
    if (r.value < r.min_normal * 0.85 || r.value > r.max_normal * 1.15) return '#dc2626'
    return '#d97706'
  }

  return (
    <div>
      <h3 className="adm-panel-h">Lab Results Viewer</h3>

      {/* Filters */}
      <form onSubmit={handleSearch} className="adm-panel">
        <div className="adm-autogrid">
          <div>
            <label className="adm-lbl">Organization</label>
            <select value={filterOrg} onChange={e => setFilterOrg(e.target.value)} className="adm-in adm-in-full">
              <option value="">All orgs</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="adm-lbl">Marker</label>
            <select value={filterMarker} onChange={e => setFilterMarker(e.target.value)} className="adm-in adm-in-full">
              <option value="">All markers</option>
              {markers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="adm-lbl">Date From</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="adm-in adm-in-full" />
          </div>
          <div>
            <label className="adm-lbl">Date To</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="adm-in adm-in-full" />
          </div>
          <div>
            <label className="adm-lbl">User ID</label>
            <input type="text" placeholder="UUID..." value={filterUser} onChange={e => setFilterUser(e.target.value)} className="adm-in adm-in-full" />
          </div>
        </div>
        <div className="adm-urlrow" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Loading…' : 'Search'}
          </button>
          <button type="button" onClick={() => { setFilterOrg(''); setFilterMarker(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterUser('') }}
            className="btn-ghost">
            Clear
          </button>
          <span className="adm-hint" style={{ marginLeft: 'auto' }}>
            {tableRows.length} unique user/marker pairs · {results.length} total entries
          </span>
        </div>
      </form>

      {error && <p className="adm-errtxt adm-mb12">{error}</p>}

      {/* Results table */}
      <div className="adm-tablewrap">
        <table className="adm-table dense labdata">
          <thead>
            <tr>
              <th></th>
              <th>User</th>
              <th>Public ID</th>
              <th>Marker</th>
              <th>Latest Value</th>
              <th>Normal Range</th>
              <th>Date</th>
              <th>Source</th>
              <th>History</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 && !loading && (
              <tr><td colSpan={9} className="adm-dim" style={{ textAlign: 'center', padding: '32px 0' }}>No results. Run a search above.</td></tr>
            )}
            {tableRows.map(r => {
              const expandKey = `${r.user_id}|${r.marker_name}`
              const isOpen = expanded === expandKey
              const history = isOpen ? getHistory(r.user_id, r.marker_name) : []
              const histCount = results.filter(x => x.user_id === r.user_id && x.marker_name === r.marker_name).length

              return (
                <React.Fragment key={r.id}>
                  <tr className={isOpen ? 'adm-open' : undefined}>
                    <td style={{ width: 28, paddingRight: 0 }}>
                      {histCount > 1 && (
                        <button onClick={() => toggleExpand(r.user_id, r.marker_name)}
                          className="adm-mv">
                          {isOpen ? '▼' : '▶'}
                        </button>
                      )}
                    </td>
                    <td>
                      {r.username
                        ? <span style={{ fontWeight: 600 }}>{r.username}</span>
                        : <span className="adm-dim" style={{ fontStyle: 'italic' }}>no username</span>}
                    </td>
                    <td className="adm-mono">{r.public_id || '—'}</td>
                    <td className="adm-strong">{r.marker_name}</td>
                    <td style={{ fontWeight: 700, color: valueColor(r) }}>
                      {r.value} {r.unit}
                    </td>
                    <td className="adm-dim">
                      {r.min_normal != null && r.max_normal != null ? `${r.min_normal}–${r.max_normal} ${r.unit}` : '—'}
                    </td>
                    <td className="adm-dim">{r.date}</td>
                    <td>
                      <span className={`adm-urole ${r.verification_type === 'provider' ? 'broker' : 'member'}`}>
                        {r.verification_type || 'self'}
                      </span>
                    </td>
                    <td className="adm-dim">
                      {histCount > 1 ? `${histCount} entries` : '—'}
                    </td>
                  </tr>

                  {/* Expanded history rows */}
                  {isOpen && (
                    <tr>
                      <td colSpan={9} className="adm-sub-row">
                        <div style={{ padding: '10px 0 14px' }}>
                          <p className="adm-k" style={{ margin: '0 0 8px' }}>
                            Full history — {r.username || r.public_id} · {r.marker_name}
                          </p>
                          <table className="adm-table dense">
                            <thead>
                              <tr>
                                {(['Date', 'Value', 'Normal Range', 'Source'] as string[]).map(h => (
                                  <th key={h}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {history.map(h => (
                                <tr key={h.id}>
                                  <td>{h.date}</td>
                                  <td style={{ fontWeight: 700, color: valueColor(h) }}>{h.value} {h.unit}</td>
                                  <td className="adm-dim">
                                    {h.min_normal != null && h.max_normal != null ? `${h.min_normal}–${h.max_normal}` : '—'}
                                  </td>
                                  <td>{h.verification_type || 'self'}</td>
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
