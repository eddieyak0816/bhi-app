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

  const btn = (active: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 4, padding: '2px 8px', fontSize: 12,
    color: active ? theme.text : theme.borderColor,
    cursor: active ? 'pointer' : 'default', lineHeight: 1.4,
  })

  if (loading) return <div style={{ padding: 32, color: theme.textMuted }}>Loading...</div>

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>Marker Groups</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted, maxWidth: 780 }}>
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
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>&#10005;</button>
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No marker groups found &mdash; the migration may not have been run yet.
          Scoring is still working, using its built-in metrics.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {groups.map(g => {
            const list = drafts[g.group_key] || []
            const original = g.members.map(m => m.marker_name)
            const dirty = JSON.stringify(list) !== JSON.stringify(original)
            return (
              <div key={g.group_key} style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{g.label}</div>
                {g.description && (
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{g.description}</div>
                )}

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {list.length === 0 && (
                    <div style={{ fontSize: 12, color: theme.textMuted, fontStyle: 'italic' }}>
                      No markers yet &mdash; this group is ignored until you add one.
                    </div>
                  )}
                  {list.map((name, i) => (
                    <div key={name + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: `1px solid ${theme.borderColor}`, borderRadius: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: theme.textMuted, minWidth: 54 }}>
                        {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : `${i + 1}th`}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, color: theme.text }}>{name}</span>
                      <button onClick={() => move(g.group_key, i, -1)} disabled={i === 0} style={btn(i > 0)} title="Move up">&#9650;</button>
                      <button onClick={() => move(g.group_key, i, 1)} disabled={i === list.length - 1} style={btn(i < list.length - 1)} title="Move down">&#9660;</button>
                      <button onClick={() => remove(g.group_key, i)} style={{ ...btn(true), color: '#dc2626', borderColor: '#fca5a5' }} title="Remove from group">&#10005;</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    list={`markers-${g.group_key}`}
                    placeholder="Add a marker by name..."
                    value={adding[g.group_key] || ''}
                    onChange={e => setAdding(a => ({ ...a, [g.group_key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(g.group_key) } }}
                    style={{ flex: '1 1 220px', minWidth: 0, background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 13 }}
                  />
                  <datalist id={`markers-${g.group_key}`}>
                    {availableMarkers.map(m => <option key={m} value={m} />)}
                  </datalist>
                  <button onClick={() => add(g.group_key)} style={{ ...btn(true), padding: '7px 14px', fontWeight: 600 }}>Add</button>
                  <button
                    onClick={() => save(g.group_key)}
                    disabled={!dirty || savingKey === g.group_key}
                    style={{
                      background: dirty ? (theme.blue || '#3B82F6') : 'transparent',
                      color: dirty ? '#fff' : theme.textMuted,
                      border: dirty ? 'none' : `1px solid ${theme.borderColor}`,
                      borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 13,
                      cursor: dirty ? 'pointer' : 'default', whiteSpace: 'nowrap', marginLeft: 'auto',
                    }}
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
