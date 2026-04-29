import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

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

  // Load most recent assessment on mount
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('health_assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
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
  }, [user?.id])

  function setLifestyle(key: keyof Assessment, val: boolean) {
    setAssessment(a => ({ ...a, [key]: val }))
  }

  function toggleSymptom(key: keyof Assessment) {
    setAssessment(a => ({ ...a, [key]: !a[key] }))
  }

  async function handleSave() {
    if (!user?.id) return
    setSaving(true); setError(null)
    const payload = { ...assessment, user_id: user.id, completed_at: new Date().toISOString() }
    let err
    if (existingId) {
      ;({ error: err } = await supabase.from('health_assessments').update(payload).eq('id', existingId))
    } else {
      const { data, error: insertErr } = await supabase.from('health_assessments').insert(payload).select('id').single()
      err = insertErr
      if (data?.id) setExistingId(data.id)
    }
    setSaving(false)
    if (err) { setError('Failed to save. Please try again.'); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 1200)
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 16,
  }
  const modal: React.CSSProperties = {
    background: theme.card, borderRadius: 12, padding: '28px 28px 24px',
    width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: 13, fontWeight: 700, color: theme.textMuted,
    textTransform: 'uppercase', letterSpacing: '0.06em', margin: '20px 0 10px',
  }
  const yesNoRow: React.CSSProperties = {
    background: theme.bgSecondary, borderRadius: 8, padding: '12px 14px',
    marginBottom: 10, border: `1px solid ${theme.borderColor}`,
  }
  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: 6, padding: '5px 18px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 8,
  }

  if (loading) return (
    <div style={overlay}>
      <div style={modal}><p style={{ color: theme.textMuted }}>Loading…</p></div>
    </div>
  )

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>Health Check-In</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.textMuted }}>
              Tracked separately from your BHAS score — for your personal health awareness only.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: theme.textMuted, lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Lifestyle */}
        <p style={sectionTitle}>Lifestyle</p>
        {LIFESTYLE_QUESTIONS.map(q => {
          const val = assessment[q.key] as boolean | null
          return (
            <div key={q.key} style={yesNoRow}>
              <div style={{ fontSize: 14, color: theme.text, marginBottom: q.hint ? 4 : 8 }}>{q.label}</div>
              {q.hint && <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{q.hint}</div>}
              <div>
                <button
                  style={{ ...btnBase, background: val === true ? '#16a34a' : theme.bgSecondary, color: val === true ? '#fff' : theme.textMuted, border: `1px solid ${val === true ? '#16a34a' : theme.borderColor}` }}
                  onClick={() => setLifestyle(q.key, true)}
                >Yes</button>
                <button
                  style={{ ...btnBase, background: val === false ? '#dc2626' : theme.bgSecondary, color: val === false ? '#fff' : theme.textMuted, border: `1px solid ${val === false ? '#dc2626' : theme.borderColor}` }}
                  onClick={() => setLifestyle(q.key, false)}
                >No</button>
              </div>
            </div>
          )
        })}

        {/* Symptoms */}
        <p style={sectionTitle}>Symptoms — check any you are currently experiencing</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {SYMPTOMS.map(s => {
            const checked = assessment[s.key] as boolean
            return (
              <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: checked ? '#fef3c722' : theme.bgSecondary, border: `1px solid ${checked ? '#f59e0b' : theme.borderColor}`, borderRadius: 7, padding: '8px 10px', fontSize: 13, color: theme.text }}>
                <input type="checkbox" checked={checked} onChange={() => toggleSymptom(s.key)} style={{ accentColor: '#f59e0b', width: 15, height: 15 }} />
                {s.label}
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer', color: theme.text }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            style={{ background: saved ? '#16a34a' : theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}
