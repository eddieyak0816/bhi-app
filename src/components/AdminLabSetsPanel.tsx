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

  return (
    <div>
      <h3 className="adm-panel-h" style={{ marginBottom: 4 }}>Lab Sets</h3>
      <p className="adm-hint" style={{ marginBottom: 20 }}>
        Manage timeframe labels for lab result sets (e.g. Initial, 3 Month Follow-Up). The Initial set is the comparison baseline.
      </p>

      {loading ? <div>Loading…</div> : (
        <div style={{ maxWidth: 560 }}>
          {sets.map((s, i) => (
            <div key={s.id} className="adm-setrow">
              <div className="adm-move">
                <button onClick={() => handleMove(s.id, -1)} disabled={i === 0}
                  className="adm-mv" style={{ cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => handleMove(s.id, 1)} disabled={i === sets.length - 1}
                  className="adm-mv" style={{ cursor: i === sets.length - 1 ? 'default' : 'pointer', opacity: i === sets.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>

              <div className="adm-item-main">
                {editId === s.id ? (
                  <div className="adm-urlrow">
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveEdit(s.id)}
                      className="adm-in adm-in-compact" style={{ flex: 1 }} autoFocus />
                    <button onClick={() => handleSaveEdit(s.id)}
                      className="adm-sbtn pri">Save</button>
                    <button onClick={() => setEditId(null)}
                      className="adm-sbtn">✕</button>
                  </div>
                ) : (
                  <span className="adm-item-n">{s.label}</span>
                )}
              </div>

              <button onClick={() => handleSetInitial(s.id)} title="Set as initial baseline"
                className={`adm-initbtn${s.is_initial ? ' on' : ''}`}>
                {s.is_initial ? 'Initial ✓' : 'Set initial'}
              </button>

              {editId !== s.id && (
                <button onClick={() => { setEditId(s.id); setEditLabel(s.label) }}
                  className="adm-iconbtn">✏️</button>
              )}

              <button onClick={() => handleDelete(s.id)}
                className="adm-iconbtn del">🗑️</button>
            </div>
          ))}

          <div className="adm-urlrow" style={{ marginTop: 16 }}>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="New lab set label…"
              className="adm-in adm-in-grow" />
            <button onClick={handleAdd}
              className="btn-primary">
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
