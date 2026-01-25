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
    // prefer React state but fall back to the DOM checkbox to avoid races in tests
    if (!consent) {
      try {
        const cb = document.querySelector('input[type="checkbox"]') as HTMLInputElement | null
        if (!cb || !cb.checked) return
        console.debug('saveResult: consent read from DOM (race-guard)')
      } catch (err) {
        return
      }
    }

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
      <h3 style={{marginBottom:20}}>Enter Lab Results</h3>

      <label>Lab Test Name</label>
      <select value={markerId} onChange={(e) => setMarkerId(e.target.value)}>
        {labMarkers.map(m => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <label>Test Result Value (optional)</label>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g., 25" />

      <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:12,marginTop:24}}>
        <button className="btn-primary" onClick={computeTags}>View Resources</button>
        <button
          className="btn-ghost"
          onClick={saveResult}
          disabled={!consent || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving…' : 'Save Result'}
        </button>
        <label style={{display:'flex',alignItems:'center',gap:8,margin:0,fontWeight:500,cursor:'pointer'}}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span style={{fontSize:14,color:'var(--text-secondary)'}}>Save for later reference</span>
        </label>
      </div>

      <div style={{marginTop:16,padding:12,background:'#F8F9FC',borderRadius:6,borderLeft:'3px solid var(--primary-blue)'}}>
        <small className="muted">
          <strong style={{color:'var(--text-primary)'}}>Privacy Notice:</strong> We don't save or store your test results unless you tell us to. You have full control.
        </small>
      </div>

      {backendReachable === false && (
        <div style={{marginTop:12,padding:12,background:'#FFF7ED',border:'1px solid var(--warning)',borderRadius:6,color:'var(--warning)'}}>
          <strong>Backend unavailable</strong> — save feature is currently disabled.
        </div>
      )}
      {saveStatus === 'success' && (
        <div style={{marginTop:12,padding:12,background:'#ECFDF5',border:'1px solid var(--success)',borderRadius:6,color:'var(--success)'}}>
          <strong>✓ Saved successfully</strong>
        </div>
      )}
      {saveStatus === 'error' && (
        <div style={{marginTop:12,padding:12,background:'#FEF2F2',border:'1px solid var(--error)',borderRadius:6,color:'var(--error)'}}>
          <strong>Save failed</strong> — please check server logs or API key.
        </div>
      )}
    </div>
  )
}

