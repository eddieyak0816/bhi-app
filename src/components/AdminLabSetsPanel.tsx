import React, { useState, useEffect } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4242'
const BACKEND_KEY = import.meta.env.VITE_BACKEND_API_KEY || ''

interface LabSet { id: string; label: string; sort_order: number; is_initial: boolean }

export default function AdminLabSetsPanel({ theme }: { theme: any }) {
  const [sets, setSets] = useState<LabSet[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  const headers = { 'content-type': 'application/json', 'x-backend-api-key': BACKEND_KEY }

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/lab-sets`, { headers })
      if (res.ok) {
        setSets(await res.json())
      } else {
        console.error('GET /api/admin/lab-sets failed:', res.status, await res.text())
      }
    } catch (e) {
      console.error('GET /api/admin/lab-sets error:', e)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!newLabel.trim()) return
    const res = await fetch(`${BACKEND_URL}/api/admin/lab-sets`, {
      method: 'POST', headers,
      body: JSON.stringify({ label: newLabel.trim(), sort_order: sets.length }),
    })
    if (res.ok) { setNewLabel(''); load() }
  }

  const handleSaveEdit = async (id: string) => {
    if (!editLabel.trim()) return
    await fetch(`${BACKEND_URL}/api/admin/lab-sets/${id}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ label: editLabel.trim() }),
    })
    setEditId(null); load()
  }

  const handleSetInitial = async (id: string) => {
    await Promise.all(sets.map(s =>
      fetch(`${BACKEND_URL}/api/admin/lab-sets/${s.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ is_initial: s.id === id }),
      })
    ))
    load()
  }

  const handleMove = async (id: string, dir: -1 | 1) => {
    const idx = sets.findIndex(s => s.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sets.length) return
    const a = sets[idx], b = sets[swapIdx]
    await Promise.all([
      fetch(`${BACKEND_URL}/api/admin/lab-sets/${a.id}`, { method: 'PATCH', headers, body: JSON.stringify({ sort_order: b.sort_order }) }),
      fetch(`${BACKEND_URL}/api/admin/lab-sets/${b.id}`, { method: 'PATCH', headers, body: JSON.stringify({ sort_order: a.sort_order }) }),
    ])
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lab set? Results assigned to it will be unlinked.')) return
    const res = await fetch(`${BACKEND_URL}/api/admin/lab-sets/${id}`, { method: 'DELETE', headers })
    if (!res.ok) { const j = await res.json(); alert(j.error || 'Delete failed'); return }
    load()
  }

  const inputStyle: React.CSSProperties = {
    background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`,
    borderRadius: 6, padding: '7px 10px', fontSize: 13, color: theme.text,
    width: '100%', boxSizing: 'border-box',
  }

  return (
    <div>
      <h3 style={{ marginBottom: 4, fontSize: 18 }}>Lab Sets</h3>
      <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 20 }}>
        Manage timeframe labels for lab result sets (e.g. Initial, 3 Month Follow-Up). The Initial set is the comparison baseline.
      </p>

      {loading ? <div>Loading…</div> : (
        <div style={{ maxWidth: 560 }}>
          {sets.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: theme.card, border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 8, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => handleMove(s.id, -1)} disabled={i === 0}
                  style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: theme.textMuted, fontSize: 11, padding: 0, opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => handleMove(s.id, 1)} disabled={i === sets.length - 1}
                  style={{ background: 'none', border: 'none', cursor: i === sets.length - 1 ? 'default' : 'pointer', color: theme.textMuted, fontSize: 11, padding: 0, opacity: i === sets.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>

              <div style={{ flex: 1 }}>
                {editId === s.id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(s.id)}
                      style={{ ...inputStyle, width: 'auto', flex: 1 }} autoFocus />
                    <button onClick={() => handleSaveEdit(s.id)}
                      style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditId(null)}
                      style={{ background: 'none', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, color: theme.textMuted, cursor: 'pointer' }}>✕</button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 600, color: theme.text }}>{s.label}</span>
                )}
              </div>

              <button onClick={() => handleSetInitial(s.id)} title="Set as initial baseline"
                style={{
                  padding: '3px 10px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
                  border: `1.5px solid ${s.is_initial ? '#10B981' : theme.borderColor}`,
                  background: s.is_initial ? 'rgba(16,185,129,0.1)' : 'transparent',
                  color: s.is_initial ? '#10B981' : theme.textMuted,
                }}>
                {s.is_initial ? 'Initial ✓' : 'Set initial'}
              </button>

              {editId !== s.id && (
                <button onClick={() => { setEditId(s.id); setEditLabel(s.label) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.textMuted, fontSize: 14 }}>✏️</button>
              )}

              <button onClick={() => handleDelete(s.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14 }}>🗑️</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="New lab set label…"
              style={{ ...inputStyle, flex: 1 }} />
            <button onClick={handleAdd}
              style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
