import React, { useState } from 'react'
import type { LabMarker, LogicRule } from '../sample-data'

export default function LabInput({ labMarkers, logicRules, onComputeTags }: { labMarkers: LabMarker[]; logicRules: LogicRule[]; onComputeTags: (tags: string[]) => void }) {
  const [markerId, setMarkerId] = useState<string>(labMarkers[0]?.id || '')
  const [value, setValue] = useState<string>('')
  const [consent, setConsent] = useState<boolean>(false)

  const DEV_BACKEND_KEY = (import.meta.env.VITE_BACKEND_API_KEY as string) || ''
  const DEV_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || ''

  function computeTags() {
    const num = parseFloat(value)
    if (Number.isNaN(num)) return onComputeTags([])

    const matching = logicRules.filter(r => r.marker_id === markerId && num >= Number(r.min_value) && num <= Number(r.max_value))
    const tags = matching.map(m => m.tag_to_apply)
    // IMPORTANT: do NOT save `value` anywhere — stateless processing only
    onComputeTags(tags)
  }

  async function saveResult() {
    if (!consent) return

    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      // For local dev testing only: include a short-lived backend key when provided via VITE_BACKEND_API_KEY
      if (DEV_BACKEND_KEY) {
        headers['x-backend-api-key'] = DEV_BACKEND_KEY
      }

      const url = DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}/api/save-lab` : '/api/save-lab'
      await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ user_id: 'demo-user-1', marker_id: markerId, value })
      })
    } catch (err) {
      console.warn('saveResult failed (expected in POC)', err)
    }
  }

  return (
    <div className="card">
      <label>Test name</label>
      <select value={markerId} onChange={(e) => setMarkerId(e.target.value)}>
        {labMarkers.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <label>Result number (optional)</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g., 25" />

      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:12}}>
        <label style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span style={{fontSize:13}}>Save result for later (optional)</span>
        </label>
        <button className="btn-primary" onClick={computeTags}>See resources</button>
        <button className="btn-ghost" onClick={saveResult} disabled={!consent}>Save</button>
      </div>

      <div className="row">
        <small className="muted">Your number stays on your device unless you choose to save it. Saving requires consent and backend support.</small>
      </div>
    </div>
  )
}

