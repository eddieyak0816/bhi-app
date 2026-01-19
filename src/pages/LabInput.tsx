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

      <div className="row">
        <button className="btn-primary" onClick={computeTags}>See resources</button>
        <small className="muted">Your number stays on your device. It is not saved.</small>
      </div>
    </div>
  )
}
