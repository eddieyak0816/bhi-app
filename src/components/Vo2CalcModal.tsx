import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getStoredJwt } from '../lib/supabase'
import {
  rockportVo2,
  restingHrVo2,
  vo2ToPercentile,
  vo2PercentileLabel,
  vo2PercentileColor,
} from '../utils/vo2calc'

// ── Types ─────────────────────────────────────────────────────────────────────

type Method = 'rockport' | 'resting_hr' | 'direct'

interface Profile {
  age: number | null
  sex: 'male' | 'female' | null
  weight_kg: number | null
}

interface Props {
  onClose: () => void
  /** Called with the computed percentile so LabsPage can save it */
  onSave: (percentile: number) => void
  theme: any
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(s: string): number | null {
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function fmtMin(totalMinutes: number): string {
  const m = Math.floor(totalMinutes)
  const s = Math.round((totalMinutes - m) * 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Vo2CalcModal({ onClose, onSave, theme }: Props) {
  const { user } = useAuth()
  const [method, setMethod] = useState<Method>('rockport')
  const [profile, setProfile] = useState<Profile>({ age: null, sex: null, weight_kg: null })
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileFailed, setProfileFailed] = useState(false)

  // Rockport inputs
  const [walkMinutes, setWalkMinutes] = useState('')   // whole minutes
  const [walkSeconds, setWalkSeconds] = useState('')   // seconds portion
  const [walkHr, setWalkHr] = useState('')

  // Resting HR inputs
  const [restHr, setRestHr] = useState('')

  // Direct entry
  const [directVo2, setDirectVo2] = useState('')

  // Results
  const [result, setResult] = useState<{ vo2: number; percentile: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load profile for age/sex/weight
  // Direct REST read, not the Supabase JS client. The client waits on its internal auth lock,
  // which can abort after a refresh — and this used to swallow that failure silently, leaving
  // age/sex/weight empty so the modal reported them as "missing" when the lookup had simply
  // failed. A failed lookup now says so instead of blaming the user's profile.
  useEffect(() => {
    if (!user?.id) { setProfileLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL as string
        const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
        const jwt = getStoredJwt()
        const res = await fetch(`${url}/rest/v1/profiles?select=age,sex,weight_kg&id=eq.${user.id}&limit=1`, {
          headers: { apikey: anon, Authorization: `Bearer ${jwt ?? anon}`, Accept: 'application/json' },
        })
        if (!res.ok) throw new Error(String(res.status))
        const rows = await res.json()
        const data = Array.isArray(rows) ? rows[0] : null
        if (!cancelled && data) setProfile({ age: data.age, sex: data.sex as any, weight_kg: data.weight_kg })
      } catch {
        if (!cancelled) setProfileFailed(true)
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  function validate(): string | null {
    if (!profile.age) return 'Age is required — please set it on your Profile page.'
    if (!profile.sex) return 'Biological sex is required — please set it on your Profile page.'

    if (method === 'rockport') {
      if (!profile.weight_kg) return 'Body weight is required — please set it on your Profile page.'
      if (!walkMinutes) return 'Enter your walk time (minutes).'
      if (!walkHr) return 'Enter your heart rate at the end of the walk.'
    }
    if (method === 'resting_hr') {
      if (!restHr) return 'Enter your resting heart rate.'
    }
    if (method === 'direct') {
      if (!directVo2) return 'Enter your measured VO2 Max value.'
    }
    return null
  }

  function calculate() {
    setError(null)
    setResult(null)

    const err = validate()
    if (err) { setError(err); return }

    const age = profile.age!
    const sex = profile.sex!
    let vo2: number

    if (method === 'rockport') {
      const totalMin = (parseNum(walkMinutes) ?? 0) + (parseNum(walkSeconds) ?? 0) / 60
      vo2 = rockportVo2({
        ageYears: age,
        weightKg: profile.weight_kg!,
        sex,
        walkTimeMinutes: totalMin,
        heartRateBpm: parseNum(walkHr)!,
      })
    } else if (method === 'resting_hr') {
      vo2 = restingHrVo2({ ageYears: age, restingHrBpm: parseNum(restHr)! })
    } else {
      vo2 = parseNum(directVo2)!
    }

    const percentile = vo2ToPercentile(vo2, age, sex)
    setResult({ vo2: Math.round(vo2 * 10) / 10, percentile })
  }

  const inputStyle: React.CSSProperties = {
    background: theme.bg,
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: 12,
    padding: '11px 13px',
    color: theme.text,
    fontSize: 14,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12.5,
    fontWeight: 700,
    color: theme.textMuted,
    marginBottom: 7,
    display: 'block',
  }

  const sectionStyle: React.CSSProperties = {
    background: theme.bg,
    border: `1px solid ${theme.borderLight}`,
    borderRadius: 16,
    padding: '16px 18px',
    marginBottom: 16,
  }

  const tabs: Array<{ id: Method; label: string; desc: string }> = [
    { id: 'rockport', label: 'Rockport Walk Test', desc: 'Walk 1 mile, record time + heart rate' },
    { id: 'resting_hr', label: 'Resting Heart Rate', desc: 'Quick estimate — no equipment needed' },
    { id: 'direct', label: 'Lab / Direct Entry', desc: 'Enter a measured VO2 Max value' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,14,23,0.55)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: theme.card, border: `1px solid ${theme.borderLight}`, borderRadius: 26, width: '100%', maxWidth: 560, boxShadow: '0 30px 70px -20px rgba(0,0,0,0.45)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 18px', borderBottom: `1px solid ${theme.borderLight}` }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.025em', color: theme.text }}>VO2 Max Calculator</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: theme.textMuted }}>Estimate your cardiorespiratory fitness percentile</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: theme.textMuted, padding: '2px 6px' }} aria-label="Close">×</button>
        </div>

        <div style={{ padding: 28 }}>

          {/* Profile data note */}
          {profileLoading ? (
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 16 }}>Loading your profile…</div>
          ) : profileFailed ? (
            <div style={{ ...sectionStyle, marginBottom: 16, fontSize: 13, color: theme.textMuted }}>
              We couldn&rsquo;t load your profile just now. Close this window and reopen it to try again.
            </div>
          ) : (
            <div style={{ ...sectionStyle, marginBottom: 16, fontSize: 13 }}>
              <strong style={{ color: theme.text }}>Your profile data:</strong>
              <span style={{ color: theme.textMuted, marginLeft: 8 }}>
                {profile.age ? `Age ${profile.age}` : <span style={{ color: '#b91c1c' }}>Age missing</span>}
                {' · '}
                {profile.sex ? (profile.sex === 'male' ? 'Male' : 'Female') : <span style={{ color: '#b91c1c' }}>Sex missing</span>}
                {' · '}
                {profile.weight_kg ? `${profile.weight_kg.toFixed(1)} kg` : <span style={{ color: '#b45309' }}>Weight missing (needed for Rockport)</span>}
              </span>
              {(!profile.age || !profile.sex) && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#b91c1c' }}>
                  Age and sex are required. Please update your Profile page first.
                </div>
              )}
            </div>
          )}

          {/* Method tabs */}
          <div style={{ display: 'flex', gap: 4, background: theme.bg, padding: 4, borderRadius: 999, marginBottom: 20, overflowX: 'auto' }}>
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setMethod(id); setResult(null); setError(null) }}
                style={{
                  background: method === id ? theme.card : 'transparent', border: 'none', cursor: 'pointer',
                  padding: '9px 16px', fontSize: 13, fontWeight: 700, borderRadius: 999,
                  color: method === id ? theme.text : theme.textMuted,
                  boxShadow: method === id ? '0 1px 3px rgba(16,26,22,0.14)' : 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <p style={{ margin: '0 0 16px 0', fontSize: 12, color: theme.textMuted, fontStyle: 'italic' }}>
            {tabs.find(t => t.id === method)?.desc}
          </p>

          {/* ── Rockport inputs ── */}
          {method === 'rockport' && (
            <div style={sectionStyle}>
              <p style={{ margin: '0 0 12px 0', fontSize: 12, color: theme.textMuted }}>
                Walk exactly 1 mile (1.6 km) as briskly as possible without running. Record your total time and heart rate immediately at the finish.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Walk time — minutes</label>
                  <input style={inputStyle} type="number" min="8" max="25" placeholder="e.g. 14" value={walkMinutes} onChange={e => setWalkMinutes(e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Walk time — seconds</label>
                  <input style={inputStyle} type="number" min="0" max="59" placeholder="e.g. 30" value={walkSeconds} onChange={e => setWalkSeconds(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Heart rate at finish (bpm)</label>
                <input style={inputStyle} type="number" min="60" max="200" placeholder="e.g. 145" value={walkHr} onChange={e => setWalkHr(e.target.value)} />
              </div>
            </div>
          )}

          {/* ── Resting HR inputs ── */}
          {method === 'resting_hr' && (
            <div style={sectionStyle}>
              <p style={{ margin: '0 0 12px 0', fontSize: 12, color: theme.textMuted }}>
                Measure your resting heart rate first thing in the morning before getting out of bed. Count beats for 60 seconds or use a wearable device.
              </p>
              <div>
                <label style={labelStyle}>Resting heart rate (bpm)</label>
                <input style={inputStyle} type="number" min="30" max="120" placeholder="e.g. 58" value={restHr} onChange={e => setRestHr(e.target.value)} />
              </div>
              <p style={{ margin: '10px 0 0 0', fontSize: 11, color: theme.textMuted }}>
                Note: This method is less precise than the Rockport walk test. Use it as a quick estimate only.
              </p>
            </div>
          )}

          {/* ── Direct entry ── */}
          {method === 'direct' && (
            <div style={sectionStyle}>
              <p style={{ margin: '0 0 12px 0', fontSize: 12, color: theme.textMuted }}>
                Enter a VO2 Max value measured by a lab, metabolic cart, or calibrated fitness test (e.g., CPET, graded treadmill test).
              </p>
              <div>
                <label style={labelStyle}>VO2 Max (ml/kg/min)</label>
                <input style={inputStyle} type="number" min="10" max="90" step="0.1" placeholder="e.g. 42.5" value={directVo2} onChange={e => setDirectVo2(e.target.value)} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
              {error}
            </div>
          )}

          {/* Calculate button */}
          <button
            onClick={calculate}
            disabled={profileLoading}
            style={{ background: theme.blue ?? '#12332A', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: result ? 20 : 0 }}
          >
            Calculate
          </button>

          {/* Results */}
          {result && (
            <div style={{ ...sectionStyle, marginBottom: 0 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 700, color: theme.text }}>Your Result</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: theme.text }}>{result.vo2}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>ml/kg/min</div>
                </div>
                <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 14, padding: '14px 16px' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: vo2PercentileColor(result.percentile) }}>{result.percentile}<span style={{ fontSize: 16 }}>th %ile</span></div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{vo2PercentileLabel(result.percentile)} (ACSM norms)</div>
                </div>
              </div>

              {/* Percentile bar */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>
                  <span>Very Poor</span><span>Poor</span><span>Fair</span><span>Good</span><span>Excellent</span><span>Superior</span>
                </div>
                <div style={{ height: 12, background: theme.borderColor, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${result.percentile}%`, height: '100%', background: vo2PercentileColor(result.percentile), borderRadius: 6, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: theme.textMuted, marginTop: 2 }}>
                  <span>0</span><span>10</span><span>25</span><span>50</span><span>75</span><span>90</span><span>99</span>
                </div>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: 12, color: theme.textMuted }}>
                Your VO2 Max percentile will be saved as the <strong>VO2 Max Percentile</strong> lab marker and tracked in your health profile.
                {result.percentile >= 60
                  ? ' This score meets the Optimal threshold (≥60th percentile).'
                  : result.percentile >= 40
                  ? ' This score is in the Improvement range (40–59th percentile).'
                  : ' This score is below the Improvement threshold (<40th percentile).'}
              </p>

              <button
                onClick={() => onSave(result.percentile)}
                style={{ background: '#15803d', color: '#fff', border: 'none', borderRadius: 999, padding: '12px 26px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Save to Lab Results
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px', borderTop: `1px solid ${theme.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 11, color: theme.textMuted }}>
            Estimates use validated exercise science formulas. For clinical precision, use a laboratory metabolic test.
          </p>
          <button onClick={onClose} style={{ background: 'none', border: `1.5px solid ${theme.borderColor}`, borderRadius: 999, padding: '9px 20px', fontSize: 13, fontWeight: 700, color: theme.text, cursor: 'pointer', flexShrink: 0, marginLeft: 12 }}>Close</button>
        </div>
      </div>
    </div>
  )
}
