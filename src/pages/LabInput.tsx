import React, { useState } from 'react'
import type { LabMarker, LogicRule } from '../sample-data'

export default function LabInput({ labMarkers, logicRules, onComputeTags }: { labMarkers: LabMarker[]; logicRules: LogicRule[]; onComputeTags: (tags: string[]) => void }) {
  const [markerId, setMarkerId] = useState<string>(labMarkers[0]?.id || '')
  const [value, setValue] = useState<string>('')
  const [consent, setConsent] = useState<boolean>(false)

  const DEV_BACKEND_KEY = (import.meta.env.VITE_BACKEND_API_KEY as string) || ''
  const DEV_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || ''
  const [sessionUserId] = useState<string>(() => {
    try {
      const existing = localStorage.getItem('bhi_demo_user_id')
      if (existing) return existing
      const id = (crypto && typeof crypto.randomUUID === 'function') ? crypto.randomUUID() : '00000000-0000-0000-0000-000000000000'
      localStorage.setItem('bhi_demo_user_id', id)
      return id
    } catch (err) {
      return '00000000-0000-0000-0000-000000000000'
    }
  })

  const [backendReachable, setBackendReachable] = useState<boolean | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')

  // Quick health check for local dev backend so the UI can show helpful feedback
  React.useEffect(() => {
    let mounted = true
    async function probe() {
      if (!DEV_BACKEND_URL) {
        if (mounted) setBackendReachable(null)
        return
      }
      const url = `${DEV_BACKEND_URL.replace(/\/$/, '')}/api/health`
      try {
        const res = await fetch(url, { method: 'GET' })
        if (!mounted) return
        setBackendReachable(res.ok)
        console.debug('backend health probe', { url, ok: res.ok, status: res.status })
      } catch (err) {
        if (!mounted) return
        setBackendReachable(false)
        console.debug('backend health probe failed', err)
      }
    }
    probe()
    return () => { mounted = false }
  }, [DEV_BACKEND_URL])

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

    // ensure marker_id is a UUID when sending to the backend (prevents 22P02 errors for sample ids)
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    const sampleUuid = '11111111-1111-4111-8111-111111111111'
    const safeMarkerId = isUuid(markerId) ? markerId : sampleUuid

    const payload = { user_id: sessionUserId, marker_id: safeMarkerId, value }
    setSaveStatus('saving')
    console.debug('saveResult called', { payload, DEV_BACKEND_URL, DEV_BACKEND_KEY, substituted: safeMarkerId !== markerId })

    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' }
      // For local dev testing only: include a short-lived backend key when provided via VITE_BACKEND_API_KEY
      if (DEV_BACKEND_KEY) {
        headers['x-backend-api-key'] = DEV_BACKEND_KEY
      }

      const url = DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}/api/save-lab` : '/api/save-lab'
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      let body = null
      try { body = await res.json() } catch (err) { /* ignore parse errors */ }
      console.debug('saveResult response', { status: res.status, ok: res.ok, body })

      if (!res.ok) {
        setSaveStatus('error')
        return
      }

      setSaveStatus('success')
      // keep UI message for a moment
      setTimeout(() => setSaveStatus('idle'), 1500)
    } catch (err) {
      console.warn('saveResult failed', err)
      setSaveStatus('error')
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
        <button
          className="btn-ghost"
          onClick={saveResult}
          disabled={!consent || (backendReachable === false) || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="row" style={{marginTop:8}}>
        <small className="muted">Your number stays on your device unless you choose to save it. Saving requires consent and backend support.</small>
      </div>

      <div className="row" style={{marginTop:8}}>
        {backendReachable === false && (
          <div style={{color:'#b45309'}}><strong>Backend unavailable — save disabled locally.</strong></div>
        )}
        {saveStatus === 'success' && (
          <div style={{color:'#065f46'}}><strong>Saved (demo).</strong></div>
        )}
        {saveStatus === 'error' && (
          <div style={{color:'#991b1b'}}><strong>Save failed — check server logs or API key.</strong></div>
        )}
      </div>
    </div>
  )
}

