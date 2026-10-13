import React, { useState, useEffect } from 'react'
import { getStoredJwt } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string || ''
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string || ''

interface Assessment {
  sleep_ok: boolean | null
  stress_ok: boolean | null
  exercise_ok: boolean | null
  alcohol_ok: boolean | null
  smoking_ok: boolean | null
  diet_ok: boolean | null
  sym_sob: boolean
  sym_chest: boolean
  sym_fatigue: boolean
  sym_headache: boolean
  sym_nausea: boolean
  sym_diarrhea: boolean
  sym_swallow: boolean
  sym_joint: boolean
  sym_back: boolean
  sym_depressed: boolean
  sym_anxious: boolean
  sym_heartburn: boolean
}

const EMPTY: Assessment = {
  sleep_ok: null, stress_ok: null, exercise_ok: null,
  alcohol_ok: null, smoking_ok: null, diet_ok: null,
  sym_sob: false, sym_chest: false, sym_fatigue: false,
  sym_headache: false, sym_nausea: false, sym_diarrhea: false,
  sym_swallow: false, sym_joint: false, sym_back: false,
  sym_depressed: false, sym_anxious: false, sym_heartburn: false,
}

const LIFESTYLE_QUESTIONS: { key: keyof Assessment; label: string; hint?: string }[] = [
  { key: 'sleep_ok', label: 'Do you get 7–9 hours of sleep most nights?' },
  { key: 'stress_ok', label: 'Is your stress generally manageable day to day?' },
  { key: 'exercise_ok', label: 'Do you exercise at least 150 minutes per week? Is your job sedentary?' },
  {
    key: 'alcohol_ok',
    label: 'Do you drink more than one alcoholic beverage daily?',
    hint: 'Answer "Yes" if you do drink more than one daily — this is tracked as a potential health factor.',
  },
  { key: 'smoking_ok', label: 'Do you currently smoke or use tobacco?' },
  {
    key: 'diet_ok',
    label: 'Do 80% or more of your meals come from whole or minimally processed foods?',
    hint: 'e.g., vegetables, fruits, legumes, whole grains, lean proteins, nuts',
  },
]

const SYMPTOMS: { key: keyof Assessment; label: string }[] = [
  { key: 'sym_sob', label: 'Shortness of breath' },
  { key: 'sym_chest', label: 'Chest pain or palpitations' },
  { key: 'sym_fatigue', label: 'Fatigue' },
  { key: 'sym_headache', label: 'Headache' },
  { key: 'sym_nausea', label: 'Nausea' },
  { key: 'sym_diarrhea', label: 'Diarrhea' },
  { key: 'sym_swallow', label: 'Difficulty swallowing' },
  { key: 'sym_joint', label: 'Joint pain' },
  { key: 'sym_back', label: 'Back pain' },
  { key: 'sym_depressed', label: 'Depressed' },
  { key: 'sym_anxious', label: 'Anxious' },
  { key: 'sym_heartburn', label: 'Heartburn or GERD' },
]

interface Props {
  onClose: () => void
}

export default function HealthAssessmentModal({ onClose }: Props) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [assessment, setAssessment] = useState<Assessment>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)

  // Load most recent assessment on mount.
  // Uses a direct REST fetch instead of the Supabase JS client — the client's own session
  // check (getSession()) can stall after navigating through several pages in one session
  // (same class of bug already fixed elsewhere: Admin thumbnail upload, LabsPage marker
  // loading), which is why this modal was still hanging on "Loading…" sometimes even after
  // fixing the earlier zero-rows crash. A plain fetch with the JWT read straight from
  // localStorage can't get stuck that way. A REST query like this also just returns an
  // array (0 or more items) — no special "zero rows" handling needed at all.
  useEffect(() => {
    if (!user?.id) return
    const jwt = getStoredJwt()
    if (!jwt) { setLoading(false); return }
    fetch(
      `${SUPABASE_URL}/rest/v1/health_assessments?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=completed_at.desc&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}` } }
    )
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then((rows: any[]) => {
        const data = rows?.[0]
        if (data) {
          setExistingId(data.id)
          setAssessment({
            sleep_ok: data.sleep_ok, stress_ok: data.stress_ok,
            exercise_ok: data.exercise_ok, alcohol_ok: data.alcohol_ok,
            smoking_ok: data.smoking_ok, diet_ok: data.diet_ok,
            sym_sob: data.sym_sob ?? false, sym_chest: data.sym_chest ?? false,
            sym_fatigue: data.sym_fatigue ?? false, sym_headache: data.sym_headache ?? false,
            sym_nausea: data.sym_nausea ?? false, sym_diarrhea: data.sym_diarrhea ?? false,
            sym_swallow: data.sym_swallow ?? false, sym_joint: data.sym_joint ?? false,
            sym_back: data.sym_back ?? false, sym_depressed: data.sym_depressed ?? false,
            sym_anxious: data.sym_anxious ?? false, sym_heartburn: data.sym_heartburn ?? false,
          })
        }
        setLoading(false)
      })
      .catch(err => {
        // Belt-and-suspenders: even if something throws instead of resolving, never leave
        // the modal stuck on "Loading…" forever.
        console.error('[HealthAssessment] Unexpected load error:', err)
        setError('Could not load your previous check-in — starting fresh.')
        setLoading(false)
      })
  }, [user?.id])

  function setLifestyle(key: keyof Assessment, val: boolean) {
    setAssessment(a => ({ ...a, [key]: val }))
  }

  function toggleSymptom(key: keyof Assessment) {
    setAssessment(a => ({ ...a, [key]: !a[key] }))
  }

  // Save via direct REST fetch — same reasoning as the load above: avoids the Supabase JS
  // client's internal session check, which is what was making this feel slow (and could
  // stall entirely) after navigating through a few pages first.
  async function handleSave() {
    if (!user?.id) return
    setSaving(true); setError(null)
    const jwt = getStoredJwt()
    if (!jwt) { setSaving(false); setError('Not authenticated — please log in again.'); return }
    const payload = { ...assessment, user_id: user.id, completed_at: new Date().toISOString() }
    try {
      const res = existingId
        ? await fetch(`${SUPABASE_URL}/rest/v1/health_assessments?id=eq.${existingId}`, {
            method: 'PATCH',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${SUPABASE_URL}/rest/v1/health_assessments`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
            body: JSON.stringify(payload),
          })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      if (!existingId) {
        const rows = await res.json().catch(() => [])
        if (rows?.[0]?.id) setExistingId(rows[0].id)
      }
      setSaving(false)
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 1200)
    } catch (err) {
      console.error('[HealthAssessment] Save error:', err)
      setSaving(false)
      setError('Failed to save. Please try again.')
    }
  }

  // ── Presentation only below this line ───────────────────────────────────────
  // Same load / save (direct REST) logic above; same Yes/No + symptom handlers.
  if (loading) return (
    <div className="md-bg">
      <div className="md"><div className="md-loading">Loading…</div></div>
    </div>
  )

  return (
    <div className="md-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="md" role="dialog" aria-modal="true" aria-label="Health Check-In">
        <div className="md-head">
          <div>
            <h2>Health Check-In</h2>
            <p>Tracked separately from your NHLS score — for your personal health awareness only.</p>
          </div>
          <button className="md-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="md-body">
          {error && <div className="md-err">{error}</div>}

          {/* Lifestyle */}
          <p className="md-sec">Lifestyle</p>
          {LIFESTYLE_QUESTIONS.map(q => {
            const val = assessment[q.key] as boolean | null
            return (
              <div key={q.key} className="md-q">
                <div className="md-q-t">{q.label}</div>
                {q.hint && <div className="md-q-h">{q.hint}</div>}
                <div className="md-yn">
                  <button
                    className={`yes${val === true ? ' on' : ''}`}
                    aria-pressed={val === true}
                    onClick={() => setLifestyle(q.key, true)}
                  >Yes</button>
                  <button
                    className={`no${val === false ? ' on' : ''}`}
                    aria-pressed={val === false}
                    onClick={() => setLifestyle(q.key, false)}
                  >No</button>
                </div>
              </div>
            )
          })}

          {/* Symptoms */}
          <p className="md-sec">Symptoms — check any you are currently experiencing</p>
          <div className="md-sym">
            {SYMPTOMS.map(s => {
              const checked = assessment[s.key] as boolean
              return (
                <label key={s.key} className={checked ? 'on' : ''}>
                  <input type="checkbox" checked={checked} onChange={() => toggleSymptom(s.key)} />
                  <span>{s.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="md-foot">
          <button className="md-btn ghost" onClick={onClose}>Cancel</button>
          <button
            className={`md-btn ${saved ? 'done' : 'primary'}`}
            onClick={handleSave}
            disabled={saving || saved}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}
