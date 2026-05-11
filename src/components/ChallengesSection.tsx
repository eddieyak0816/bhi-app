import React, { useState, useEffect } from 'react'

interface Challenge {
  id: string
  name: string
  slug: string
  starts_at: string
  ends_at: string
  baseline_at: string
  midpoint_at: string
  is_active: boolean
}

interface Props { theme: any; userId: string }

const BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
const BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
function apiUrl(path: string) { return BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${path}` : path }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ChallengesSection({ theme, userId }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(apiUrl('/api/challenges'), {
      headers: { 'x-user-id': userId, 'x-backend-api-key': BACKEND_KEY },
    })
      .then(r => r.json())
      .then(data => setChallenges(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  if (loading || challenges.length === 0) return null

  const t = theme

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, margin: '0 0 12px' }}>Active Challenges</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {challenges.map(c => {
          const now = new Date()
          const start = new Date(c.starts_at)
          const end = new Date(c.ends_at)
          const total = end.getTime() - start.getTime()
          const elapsed = Math.max(0, now.getTime() - start.getTime())
          const pct = Math.min(100, Math.round((elapsed / total) * 100))

          return (
            <div key={c.id} style={{
              background: t.cardBackground,
              border: `1px solid ${t.borderColor}`,
              borderRadius: 10,
              padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                    {formatDate(c.starts_at)} – {formatDate(c.ends_at)}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
                  background: '#22c55e22', color: '#22c55e', flexShrink: 0,
                }}>Active</span>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted, marginBottom: 4 }}>
                  <span>Challenge progress</span>
                  <span>{pct}%</span>
                </div>
                <div style={{ height: 6, background: t.borderColor, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: t.blue ?? '#3b82f6', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>

              {/* Key dates */}
              <div style={{ display: 'flex', gap: 16, fontSize: 11, color: t.textMuted }}>
                <span>Baseline: <strong style={{ color: t.text }}>{formatDate(c.baseline_at)}</strong></span>
                <span>Midpoint: <strong style={{ color: t.text }}>{formatDate(c.midpoint_at)}</strong></span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
