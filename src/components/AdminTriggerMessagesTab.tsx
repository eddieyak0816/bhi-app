import React, { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
const BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
function apiUrl(path: string) { return BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${path}` : path }
function authHeaders() { return { 'Content-Type': 'application/json', 'x-backend-api-key': BACKEND_KEY } }

interface Threshold {
  id: string
  marker_name: string
  sex: 'male' | 'female' | 'both'
  level: 'warning' | 'danger'
  condition: string
  min_value: number | null
  max_value: number | null
  headline: string
  body: string
  actions: string[]
  escalate: string | null
  sort_order: number
  updated_at: string
}

interface EditState {
  min_value: string
  max_value: string
  condition: string
  headline: string
  body: string
  actions: string   // newline-separated for textarea
  escalate: string
}

function levelColor(level: string) {
  return level === 'warning' ? '#D97706' : '#EF4444'
}
function levelBg(level: string) {
  return level === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
}

export default function AdminTriggerMessagesTab() {
  const { theme } = useTheme()
  const [thresholds, setThresholds] = useState<Threshold[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/trigger-thresholds'), { headers: authHeaders() })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'fetch failed')
      setThresholds(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function startEdit(t: Threshold) {
    setEditingId(t.id)
    setEditState({
      min_value: t.min_value != null ? String(t.min_value) : '',
      max_value: t.max_value != null ? String(t.max_value) : '',
      condition: t.condition,
      headline: t.headline,
      body: t.body,
      actions: t.actions.join('\n'),
      escalate: t.escalate || '',
    })
    setSaveMsg(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditState(null)
  }

  async function saveEdit(id: string) {
    if (!editState) return
    setSaving(true); setSaveMsg(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/trigger-thresholds/${id}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          min_value: editState.min_value,
          max_value: editState.max_value,
          condition: editState.condition,
          headline: editState.headline,
          body: editState.body,
          actions: editState.actions.split('\n').map(s => s.trim()).filter(Boolean),
          escalate: editState.escalate.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'save failed')
      setThresholds(prev => prev.map(t => t.id === id ? data : t))
      setEditingId(null)
      setEditState(null)
      setSaveMsg('Saved.')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch (e: any) {
      setSaveMsg(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Group thresholds by marker name
  const grouped = thresholds.reduce<Record<string, Threshold[]>>((acc, t) => {
    if (!acc[t.marker_name]) acc[t.marker_name] = []
    acc[t.marker_name].push(t)
    return acc
  }, {})

  return (
    <div>
      <div className="adm-bar">
        <div>
          <h2 className="adm-panel-h" style={{ margin: 0 }}>Warning & Alert Thresholds</h2>
          <p className="adm-hint" style={{ margin: '6px 0 0' }}>
            Edit the values that trigger popup warnings after lab entry. Changes take effect immediately.
          </p>
        </div>
        {saveMsg && (
          <div className={`adm-status${saveMsg.startsWith('Error') ? ' bad' : ' ok'}`}>
            {saveMsg}
          </div>
        )}
      </div>

      {loading && <div className="adm-hint">Loading...</div>}
      {error && <div className="adm-errtxt">Error: {error}</div>}

      {Object.entries(grouped).map(([markerName, rows]) => (
        <div key={markerName} className="adm-org" style={{ marginBottom: 16 }}>
          <div className="adm-trig-h">
            {markerName}
          </div>

          {rows.map(t => (
            <div key={t.id} className="adm-trig-row">
              {/* Row header */}
              <div className="adm-trig-top" style={{ marginBottom: editingId === t.id ? 14 : 0 }}>
                <span className={`adm-lvl ${t.level}`}>
                  {t.level}
                </span>
                {t.sex !== 'both' && (
                  <span className="adm-hint">({t.sex})</span>
                )}
                <span className="adm-mono">
                  {t.condition}{' '}
                  {t.min_value != null && t.max_value != null
                    ? `${t.min_value} – ${t.max_value}`
                    : t.min_value != null
                    ? t.min_value
                    : t.max_value != null
                    ? t.max_value
                    : '—'}
                </span>
                <span className="adm-team-n">{t.headline}</span>
                {editingId !== t.id && (
                  <button
                    onClick={() => startEdit(t)}
                    className="adm-sbtn"
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Edit form */}
              {editingId === t.id && editState && (
                <div className="adm-teamlist" style={{ marginBottom: 0 }}>
                  {/* Threshold values row */}
                  <div className="adm-trig-grid">
                    <div>
                      <div className="adm-lbl">Condition</div>
                      <select
                        value={editState.condition}
                        onChange={e => setEditState(s => s ? { ...s, condition: e.target.value } : s)}
                        className="adm-in adm-in-full"
                      >
                        {['between', '>=', '>', '<=', '<', '='].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div className="adm-lbl">
                        {editState.condition === 'between' ? 'Min value' : 'Value'}
                      </div>
                      <input
                        type="number"
                        value={editState.min_value}
                        onChange={e => setEditState(s => s ? { ...s, min_value: e.target.value } : s)}
                        className="adm-in adm-in-full"
                        placeholder="—"
                      />
                    </div>
                    {editState.condition === 'between' && (
                      <div>
                        <div className="adm-lbl">Max value</div>
                        <input
                          type="number"
                          value={editState.max_value}
                          onChange={e => setEditState(s => s ? { ...s, max_value: e.target.value } : s)}
                          className="adm-in adm-in-full"
                          placeholder="—"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="adm-lbl">Headline</div>
                    <input
                      type="text"
                      value={editState.headline}
                      onChange={e => setEditState(s => s ? { ...s, headline: e.target.value } : s)}
                      className="adm-in adm-in-full"
                    />
                  </div>

                  <div>
                    <div className="adm-lbl">Body text</div>
                    <textarea
                      value={editState.body}
                      onChange={e => setEditState(s => s ? { ...s, body: e.target.value } : s)}
                      rows={2}
                      className="adm-in adm-in-full adm-ta adm-ta-sm"
                    />
                  </div>

                  <div>
                    <div className="adm-lbl">
                      Action items <span className="adm-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(one per line)</span>
                    </div>
                    <textarea
                      value={editState.actions}
                      onChange={e => setEditState(s => s ? { ...s, actions: e.target.value } : s)}
                      rows={4}
                      className="adm-in adm-in-full adm-ta"
                    />
                  </div>

                  <div>
                    <div className="adm-lbl">
                      Escalation note <span className="adm-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(leave blank to hide)</span>
                    </div>
                    <input
                      type="text"
                      value={editState.escalate}
                      onChange={e => setEditState(s => s ? { ...s, escalate: e.target.value } : s)}
                      className="adm-in adm-in-full"
                      placeholder="e.g. We recommend reviewing this with a healthcare provider."
                    />
                  </div>

                  <div className="adm-urlrow">
                    <button
                      onClick={() => saveEdit(t.id)}
                      disabled={saving}
                      className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
