import React, { useState, useEffect } from 'react'
import { clearScoreThresholdCache } from '../utils/scoreThresholds'

interface Threshold {
  metric_key: string
  label: string
  unit: string | null
  optimal_value: number
  improvement_value: number
  lower_is_better: boolean
  description: string | null
}

interface Props { theme: any }

export default function AdminScoreThresholdsTab({ theme }: Props) {
  const [rows, setRows] = useState<Threshold[]>([])
  const [drafts, setDrafts] = useState<Record<string, { optimal: string; improvement: string }>>({})
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
      const res = await fetch(apiUrl('/api/admin/score-thresholds'), {
        headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {},
      })
      const data = res.ok ? await res.json() : { thresholds: [] }
      const list: Threshold[] = data.thresholds || []
      setRows(list)
      setDrafts(Object.fromEntries(list.map(r => [
        r.metric_key,
        { optimal: String(r.optimal_value), improvement: String(r.improvement_value) },
      ])))
    } catch {
      setError('Failed to load score thresholds.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function save(row: Threshold) {
    const draft = drafts[row.metric_key]
    if (!draft) return
    const optimal = parseFloat(draft.optimal)
    const improvement = parseFloat(draft.improvement)
    if (!Number.isFinite(optimal) || !Number.isFinite(improvement)) {
      setError(row.label + ': both values must be numbers.')
      return
    }
    setSavingKey(row.metric_key)
    setError(null)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (DEV_BACKEND_KEY) headers['x-backend-api-key'] = DEV_BACKEND_KEY
      const res = await fetch(apiUrl('/api/admin/score-thresholds/' + row.metric_key), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ optimal_value: optimal, improvement_value: improvement }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Save failed')
      }
      // Drop the cached copy so the next score calculation picks up the new numbers.
      clearScoreThresholdCache()
      setSavedKey(row.metric_key)
      setTimeout(() => setSavedKey(null), 2000)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSavingKey(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: theme.card, border: '1px solid ' + theme.borderColor,
    borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 13, boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: 4,
  }

  if (loading) return <div style={{ padding: 32, color: theme.textMuted }}>Loading...</div>

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>Score Thresholds</h3>
        <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted, maxWidth: 760 }}>
          The cutoffs that decide whether each NHLS metric reads as Optimal, Improvement, or Out of Range.
          Changes apply to everyone&rsquo;s score the next time it is calculated. Advance Care Plan is not
          listed &mdash; it is a yes/no item with no cutoffs.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>
          {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>&#10005;</button>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ background: theme.card, border: '1px solid ' + theme.borderColor, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No thresholds found &mdash; the score_thresholds migration may not have been run yet.
          Scoring is still working, using its built-in defaults.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map(row => {
            const draft = drafts[row.metric_key] || { optimal: '', improvement: '' }
            const dirty = draft.optimal !== String(row.optimal_value) || draft.improvement !== String(row.improvement_value)
            const unit = row.unit ? ' ' + row.unit : ''
            // Spell the live rule out in words so the direction is never ambiguous.
            const rule = row.lower_is_better
              ? 'Optimal: below ' + row.optimal_value + unit + '  |  Improvement: ' + row.optimal_value + ' to ' + row.improvement_value + unit + '  |  Out of Range: above ' + row.improvement_value + unit
              : 'Optimal: above ' + row.optimal_value + unit + '  |  Improvement: ' + row.improvement_value + ' to ' + row.optimal_value + unit + '  |  Out of Range: below ' + row.improvement_value + unit

            return (
              <div key={row.metric_key} style={{ background: theme.card, border: '1px solid ' + theme.borderColor, borderRadius: 10, padding: '14px 18px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>
                  {row.label}
                  {row.unit ? <span style={{ fontWeight: 400, color: theme.textMuted }}> ({row.unit})</span> : null}
                </div>
                {row.description && (
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{row.description}</div>
                )}
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 6, fontStyle: 'italic' }}>{rule}</div>

                <div className="admin-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px 16px', alignItems: 'end', marginTop: 12 }}>
                  <div>
                    <label style={labelStyle}>
                      Optimal cutoff {row.lower_is_better ? '(optimal is below this)' : '(optimal is above this)'}
                    </label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="any"
                      value={draft.optimal}
                      onChange={e => setDrafts(d => ({ ...d, [row.metric_key]: { ...d[row.metric_key], optimal: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>
                      Improvement cutoff {row.lower_is_better ? '(out of range above this)' : '(out of range below this)'}
                    </label>
                    <input
                      style={inputStyle}
                      type="number"
                      step="any"
                      value={draft.improvement}
                      onChange={e => setDrafts(d => ({ ...d, [row.metric_key]: { ...d[row.metric_key], improvement: e.target.value } }))}
                    />
                  </div>
                  <button
                    onClick={() => save(row)}
                    disabled={!dirty || savingKey === row.metric_key}
                    style={{
                      background: dirty ? (theme.blue || '#3B82F6') : 'transparent',
                      color: dirty ? '#fff' : theme.textMuted,
                      border: dirty ? 'none' : '1px solid ' + theme.borderColor,
                      borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 13,
                      cursor: dirty ? 'pointer' : 'default', whiteSpace: 'nowrap',
                    }}
                  >
                    {savingKey === row.metric_key ? 'Saving...' : savedKey === row.metric_key ? 'Saved' : 'Save'}
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
