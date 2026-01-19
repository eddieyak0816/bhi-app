import React, { useState } from 'react'
import type { LabMarker, LogicRule } from '../sample-data'

export default function LabInput({ labMarkers, logicRules, onComputeTags }: { labMarkers: LabMarker[]; logicRules: LogicRule[]; onComputeTags: (tags: string[]) => void }) {
  const [markerId, setMarkerId] = useState<string>(labMarkers[0]?.id || '')
  const [value, setValue] = useState<string>('')

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
    // This is an opt-in client call that SHOULD be handled by a trusted backend.
    // The repo includes a DB function scaffold; do NOT expose service_role in the browser.
    try {
      await fetch('/api/save-lab', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ marker_id: markerId, value })
      })
    } catch (err) {
      // swallow network errors in POC — backend not required for demo
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

