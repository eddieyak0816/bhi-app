import React, { useState, useEffect } from 'react'
import { clearMarkerGroupCache } from '../utils/markerGroups'

interface Member { id: string; group_key: string; marker_name: string; sort_order: number }
interface Group {
  group_key: string
  label: string
  description: string | null
  sort_order: number
  is_active: boolean
  members: Member[]
}

interface Props { theme: any; availableMarkers?: string[] }

export default function AdminMarkerGroupsTab({ theme, availableMarkers = [] }: Props) {
  const [groups, setGroups] = useState<Group[]>([])
  const [drafts, setDrafts] = useState<Record<string, string[]>>({})
  const [adding, setAdding] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  const DEV_BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
  const apiUrl = (path: string) => DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/marker-groups'), {
        headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {},
      })
      const data = res.ok ? await res.json() : { groups: [] }
      const list: Group[] = data.groups || []
      setGroups(list)
      setDrafts(Object.fromEntries(list.map(g => [g.group_key, g.members.map(m => m.marker_name)])))
    } catch {
      setError('Failed to load marker groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function save(groupKey: string) {
    setSavingKey(groupKey); setError(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (DEV_BACKEND_KEY) headers['x-backend-api-key'] = DEV_BACKEND_KEY
      const res = await fetch(apiUrl(`/api/admin/marker-groups/${groupKey}/members`), {
        method: 'PUT',
        headers,
        body: JSON.stringify({ markerNames: drafts[groupKey] || [] }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || body.error || 'Save failed')
      }
      // Drop both caches so the next score uses the new order straight away.
      clearMarkerGroupCache()
      try { sessionStorage.removeItem('nhl-bhas-v23-result') } catch {}
      setSavedKey(groupKey)
      setTimeout(() => setSavedKey(null), 2000)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingKey(null)
    }
  }

  const move = (groupKey: string, idx: number, dir: -1 | 1) => {
    setDrafts(d => {
      const list = [...(d[groupKey] || [])]
      const to = idx + dir
      if (to < 0 || to >= list.length) return d
      ;[list[idx], list[to]] = [list[to], list[idx]]
      return { ...d, [groupKey]: list }
    })
  }

  const remove = (groupKey: string, idx: number) =>
    setDrafts(d => ({ ...d, [groupKey]: (d[groupKey] || []).filter((_, i) => i !== idx) }))

  const add = (groupKey: string) => {
    const name = (adding[groupKey] || '').trim()
    if (!name) return
    const list = drafts[groupKey] || []
    if (list.some(n => n.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" is already in this group.`)
      return
    }
    setDrafts(d => ({ ...d, [groupKey]: [...list, name] }))
    setAdding(a => ({ ...a, [groupKey]: '' }))
  }

  if (loading) return <div className="adm-hint" style={{ padding: 32 }}>Loading...</div>

  return (
    <div>
      <div className="adm-field">
        <h3 className="adm-panel-h" style={{ margin: 0 }}>Marker Groups</h3>
        <p className="adm-hint" style={{ margin: '6px 0 0', maxWidth: 780 }}>
          Markers in a group share <strong>one</strong> point in the NHLS score, because they
          measure the same thing. Whichever test the patient has is the one that counts &mdash; so
          nobody loses a point for a test their doctor didn&rsquo;t order.
          <br />
          Order matters: the app uses the <strong>highest one in the list</strong> that the patient
          has a result for. Each group counts once toward the total, so two markers in a group
          takes the score from 8 to 7.
        </p>
      </div>

      {error && (
        <div className="adm-err">
          {error}
          <button onClick={() => setError(null)} className="adm-err-x">&#10005;</button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="adm-empty">
          No marker groups found &mdash; the migration may not have been run yet.
          Scoring is still working, using its built-in metrics.
        </div>
      ) : (
        <div className="adm-orglist">
          {groups.map(g => {
            const list = drafts[g.group_key] || []
            const original = g.members.map(m => m.marker_name)
            const dirty = JSON.stringify(list) !== JSON.stringify(original)
            return (
              <div key={g.group_key} className="adm-broker">
                <div className="adm-item-n">{g.label}</div>
                {g.description && (
                  <div className="adm-hint" style={{ marginTop: 4 }}>{g.description}</div>
                )}

                <div className="adm-teamlist" style={{ marginTop: 14, marginBottom: 0 }}>
                  {list.length === 0 && (
                    <div className="adm-hint" style={{ fontStyle: 'italic' }}>
                      No markers yet &mdash; this group is ignored until you add one.
                    </div>
                  )}
                  {list.map((name, i) => (
                    <div key={name + i} className="adm-mrow">
                      <span className="adm-ord">
                        {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`}
                      </span>
                      <span className="adm-team-n">{name}</span>
                      <button onClick={() => move(g.group_key, i, -1)} disabled={i === 0} className="adm-mv" title="Move up">&#9650;</button>
                      <button onClick={() => move(g.group_key, i, 1)} disabled={i === list.length - 1} className="adm-mv" title="Move down">&#9660;</button>
                      <button onClick={() => remove(g.group_key, i)} className="adm-mv del" title="Remove from group">&#10005;</button>
                    </div>
                  ))}
                </div>

                <div className="adm-urlrow" style={{ marginTop: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    list={`markers-${g.group_key}`}
                    placeholder="Add a marker by name..."
                    value={adding[g.group_key] || ''}
                    onChange={e => setAdding(a => ({ ...a, [g.group_key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(g.group_key) } }}
                    className="adm-in adm-in-grow" style={{ flex: '1 1 220px' }}
                  />
                  <datalist id={`markers-${g.group_key}`}>
                    {availableMarkers.map(m => <option key={m} value={m} />)}
                  </datalist>
                  <button onClick={() => add(g.group_key)} className="adm-sbtn">Add</button>
                  <button
                    onClick={() => save(g.group_key)}
                    disabled={!dirty || savingKey === g.group_key}
                    className={`adm-sbtn${dirty ? ' pri' : ''}`} style={{ marginLeft: 'auto' }}
                  >
                    {savingKey === g.group_key ? 'Saving...' : savedKey === g.group_key ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
