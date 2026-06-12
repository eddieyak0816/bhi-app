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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    color: theme.text,
    fontSize: 13,
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Warning & Alert Thresholds</h2>
          <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 13 }}>
            Edit the values that trigger popup warnings after lab entry. Changes take effect immediately.
          </p>
        </div>
        {saveMsg && (
          <div style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: saveMsg.startsWith('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color: saveMsg.startsWith('Error') ? '#EF4444' : '#10B981',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {saveMsg}
          </div>
        )}
      </div>

      {loading && <div style={{ color: theme.textMuted }}>Loading...</div>}
      {error && <div style={{ color: '#EF4444' }}>Error: {error}</div>}

      {Object.entries(grouped).map(([markerName, rows]) => (
        <div
          key={markerName}
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 10,
            marginBottom: 16,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '12px 18px',
            borderBottom: `1px solid ${theme.borderColor}`,
            fontWeight: 700,
            fontSize: 15,
            color: theme.text,
          }}>
            {markerName}
          </div>

          {rows.map(t => (
            <div
              key={t.id}
              style={{
                padding: '14px 18px',
                borderBottom: `1px solid ${theme.borderColor}`,
              }}
            >
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: editingId === t.id ? 14 : 0 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 20,
                  background: levelBg(t.level),
                  color: levelColor(t.level),
                  textTransform: 'uppercase',
                }}>
                  {t.level}
                </span>
                {t.sex !== 'both' && (
                  <span style={{ fontSize: 11, color: theme.textMuted, fontWeight: 600 }}>({t.sex})</span>
                )}
                <span style={{ fontSize: 12, color: theme.textMuted, fontFamily: 'monospace' }}>
                  {t.condition}{' '}
                  {t.min_value != null && t.max_value != null
                    ? `${t.min_value} – ${t.max_value}`
                    : t.min_value != null
                    ? t.min_value
                    : t.max_value != null
                    ? t.max_value
                    : '—'}
                </span>
                <span style={{ flex: 1, fontSize: 13, color: theme.text }}>{t.headline}</span>
                {editingId !== t.id && (
                  <button
                    onClick={() => startEdit(t)}
                    style={{
                      background: 'none',
                      border: `1px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      padding: '4px 12px',
                      fontSize: 12,
                      color: theme.textMuted,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>

              {/* Edit form */}
              {editingId === t.id && editState && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Threshold values row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 120px 120px', gap: 10, alignItems: 'end' }}>
                    <div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Condition</div>
                      <select
                        value={editState.condition}
                        onChange={e => setEditState(s => s ? { ...s, condition: e.target.value } : s)}
                        style={inputStyle}
                      >
                        {['between', '>=', '>', '<=', '<', '='].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>
                        {editState.condition === 'between' ? 'Min value' : 'Value'}
                      </div>
                      <input
                        type="number"
                        value={editState.min_value}
                        onChange={e => setEditState(s => s ? { ...s, min_value: e.target.value } : s)}
                        style={inputStyle}
                        placeholder="—"
                      />
                    </div>
                    {editState.condition === 'between' && (
                      <div>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Max value</div>
                        <input
                          type="number"
                          value={editState.max_value}
                          onChange={e => setEditState(s => s ? { ...s, max_value: e.target.value } : s)}
                          style={inputStyle}
                          placeholder="—"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Headline</div>
                    <input
                      type="text"
                      value={editState.headline}
                      onChange={e => setEditState(s => s ? { ...s, headline: e.target.value } : s)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Body text</div>
                    <textarea
                      value={editState.body}
                      onChange={e => setEditState(s => s ? { ...s, body: e.target.value } : s)}
                      rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>
                      Action items <span style={{ fontWeight: 400 }}>(one per line)</span>
                    </div>
                    <textarea
                      value={editState.actions}
                      onChange={e => setEditState(s => s ? { ...s, actions: e.target.value } : s)}
                      rows={4}
                      style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>
                      Escalation note <span style={{ fontWeight: 400 }}>(leave blank to hide)</span>
                    </div>
                    <input
                      type="text"
                      value={editState.escalate}
                      onChange={e => setEditState(s => s ? { ...s, escalate: e.target.value } : s)}
                      style={inputStyle}
                      placeholder="e.g. We recommend reviewing this with a healthcare provider."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => saveEdit(t.id)}
                      disabled={saving}
                      style={{
                        background: theme.blue,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 20px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      style={{
                        background: 'none',
                        border: `1px solid ${theme.borderColor}`,
                        borderRadius: 6,
                        padding: '8px 20px',
                        fontSize: 13,
                        color: theme.textMuted,
                        cursor: 'pointer',
                      }}
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
