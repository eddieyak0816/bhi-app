import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface LeagueEntry {
  org_id: string
  org_name: string
  org_slug: string
  participant_count: number
  avg_score: number | null
  member_count: number
}

interface League {
  id: string
  name: string
  slug: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

interface LeagueData {
  league: League
  entries: LeagueEntry[]
}

interface LeaguePageProps {
  leagueSlug: string
  onNavigate?: (page: string) => void
}

const LABEL_FOR_SCORE = (score: number | null): { label: string; bg: string; color: string } => {
  if (score === null) return { label: '—', bg: '#f3f4f6', color: '#6b7280' }
  if (score >= 6.0) return { label: 'Optimal',           bg: '#dcfce7', color: '#15803d' }
  if (score >= 5.0) return { label: 'Healthy',           bg: '#dbeafe', color: '#1d4ed8' }
  if (score >= 4.0) return { label: 'Needs Improvement', bg: '#fef3c7', color: '#b45309' }
  return                    { label: 'High Risk',         bg: '#fee2e2', color: '#b91c1c' }
}

export default function LeaguePage({ leagueSlug, onNavigate }: LeaguePageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [data, setData] = useState<LeagueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  useEffect(() => {
    if (!user?.id || !leagueSlug) return
    setLoading(true); setError(null)
    fetch(apiUrl(`/api/league/${encodeURIComponent(leagueSlug)}`), {
      headers: { 'x-user-id': user.id },
    })
      .then(async res => {
        if (res.status === 404) throw new Error('League not found.')
        if (!res.ok) throw new Error('Server error — try again.')
        return res.json()
      })
      .then(body => { setData(body); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [user?.id, leagueSlug])

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: theme.text }}>
        Loading league…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, color: '#b91c1c' }}>
          {error}
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('leagues')}
            style={{ marginTop: 16, background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', color: theme.text, fontSize: 14 }}
          >
            ← Back to Leagues
          </button>
        )}
      </div>
    )
  }

  if (!data) return null

  const { league, entries } = data
  const starts = new Date(league.starts_at).toLocaleDateString()
  const ends   = new Date(league.ends_at).toLocaleDateString()

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      {onNavigate && (
        <button
          onClick={() => onNavigate('leagues')}
          style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: theme.text, fontSize: 13, marginBottom: 16 }}
        >
          ← All Leagues
        </button>
      )}

      {/* PHI notice */}
      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '8px 14px', marginBottom: 20, fontSize: 12, color: '#713f12' }}>
        <strong>De-identified view:</strong> Only organization names and aggregate average BHAS scores are shown. No individual data is ever displayed.
      </div>

      <h2 style={{ margin: '0 0 4px 0', fontSize: 22, fontWeight: 700, color: theme.text }}>
        {league.name}
      </h2>
      <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: 13 }}>
        {starts} – {ends} · {entries.length} organization{entries.length !== 1 ? 's' : ''} competing
      </p>

      {entries.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 40, textAlign: 'center', color: theme.textMuted }}>
          No organizations with scored participants yet.
        </div>
      ) : (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.borderColor}`, background: theme.bgSecondary }}>
                {['Rank', 'Organization', 'Avg BHAS Score', 'Health Band', 'Scored Members', 'Total Members'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: theme.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const rank = i + 1
                const { label, bg, color } = LABEL_FOR_SCORE(e.avg_score)
                return (
                  <tr
                    key={e.org_id}
                    style={{ borderBottom: `1px solid ${theme.borderColor}`, background: rank === 1 ? 'rgba(16,185,129,0.04)' : 'transparent' }}
                  >
                    <td style={{ padding: '10px 14px', textAlign: 'center', minWidth: 48 }}>
                      {rank === 1 && <span style={{ fontSize: 18 }}>🥇</span>}
                      {rank === 2 && <span style={{ fontSize: 18 }}>🥈</span>}
                      {rank === 3 && <span style={{ fontSize: 18 }}>🥉</span>}
                      {rank > 3 && <span style={{ fontWeight: 700, color: '#6b7280', fontSize: 13 }}>#{rank}</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: theme.text }}>
                      {e.org_name}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: 15, color }}>
                      {e.avg_score !== null ? e.avg_score.toFixed(2) : '—'}
                      {e.avg_score !== null && <span style={{ fontSize: 11, fontWeight: 400, color: theme.textMuted }}> / 7.0</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {e.avg_score !== null && (
                        <span style={{ background: bg, color, borderRadius: 4, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>
                          {label}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: theme.textMuted }}>
                      {e.participant_count}
                    </td>
                    <td style={{ padding: '10px 14px', color: theme.textMuted }}>
                      {e.member_count}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${theme.borderColor}`, fontSize: 11, color: theme.textMuted }}>
            Ranked by average BHAS v2.3 score across all scored participants in each organization.
          </div>
        </div>
      )}
    </div>
  )
}
