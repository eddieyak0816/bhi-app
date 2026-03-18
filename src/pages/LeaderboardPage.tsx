import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface LeaderboardEntry {
  username: string | null
  public_id: string | null
  team: string | null
  total_score: number
  label: 'Optimal' | 'Healthy' | 'Needs Improvement' | 'High Risk'
  vo2_max_percentile: number | null
  wthr: number | null
  hs_crp: number | null
  acute_visits: number | null
  score_date: string
}

interface LeaderboardData {
  org: { name: string; slug: string }
  entries: LeaderboardEntry[]
}

interface LeaderboardPageProps {
  orgSlug: string
  onNavigate?: (page: string) => void
}

const LABEL_COLOR: Record<string, { bg: string; color: string }> = {
  'Optimal':           { bg: '#dcfce7', color: '#15803d' },
  'Healthy':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Needs Improvement': { bg: '#fef3c7', color: '#b45309' },
  'High Risk':         { bg: '#fee2e2', color: '#b91c1c' },
}

const TEAM_PALETTE: Array<{ bg: string; color: string }> = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef9c3', color: '#713f12' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#ffedd5', color: '#c2410c' },
]

function teamColor(teamName: string, teams: string[]) {
  const idx = teams.indexOf(teamName)
  return TEAM_PALETTE[(idx >= 0 ? idx : 0) % TEAM_PALETTE.length]
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: 20 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 20 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 20 }}>🥉</span>
  return <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>#{rank}</span>
}

export default function LeaderboardPage({ orgSlug, onNavigate }: LeaderboardPageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  useEffect(() => {
    if (!user?.id || !orgSlug) return
    setLoading(true); setError(null)
    fetch(apiUrl(`/api/leaderboard/${encodeURIComponent(orgSlug)}`), {
      headers: { 'x-user-id': user.id },
    })
      .then(async res => {
        if (res.status === 404) throw new Error('Organization not found.')
        if (res.status === 403) throw new Error('You do not have permission to view this leaderboard.')
        if (!res.ok) throw new Error('Server error — try again.')
        return res.json()
      })
      .then(body => { setData(body); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [user?.id, orgSlug])

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', color: theme.text }}>
        Loading leaderboard…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, color: '#b91c1c' }}>
          {error}
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('home')}
            style={{ marginTop: 16, background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', color: theme.text, fontSize: 14 }}
          >
            ← Back
          </button>
        )}
      </div>
    )
  }

  if (!data) return null

  const entries = data.entries
  const allTeams = [...new Set(entries.map(e => e.team).filter(Boolean) as string[])]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      {/* Back link */}
      {onNavigate && (
        <button
          onClick={() => onNavigate(`employer/${orgSlug}`)}
          style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', color: theme.text, fontSize: 13, marginBottom: 16 }}
        >
          ← Employer View
        </button>
      )}

      {/* PHI notice */}
      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '8px 14px', marginBottom: 20, fontSize: 12, color: '#713f12' }}>
        <strong>De-identified view:</strong> Real names, emails, and individual lab values are never shown. Only usernames, public IDs, teams, and BHAS scores are displayed.
      </div>

      {/* Header */}
      <h2 style={{ margin: '0 0 4px 0', fontSize: 22, fontWeight: 700, color: theme.text }}>
        {data.org.name} — BHAS Leaderboard
      </h2>
      <p style={{ margin: '0 0 24px 0', color: theme.textMuted, fontSize: 14 }}>
        {entries.length} participant{entries.length !== 1 ? 's' : ''} with a scored v2.3 result · Ranked by BHAS v2.3 score with tie-breaker logic
      </p>

      {entries.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 40, textAlign: 'center', color: theme.textMuted }}>
          No scored participants yet. Members need to log enough lab data for a BHAS v2.3 score to appear here.
        </div>
      ) : (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.borderColor}`, background: theme.bgSecondary }}>
                  {['Rank', 'Username', 'Public ID', 'Team', 'Score', 'Label', 'VO2 %ile', 'WtHR', 'hs-CRP', 'As of'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', color: theme.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const lc = LABEL_COLOR[e.label] ?? LABEL_COLOR['High Risk']
                  const tc = e.team ? teamColor(e.team, allTeams) : null
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: `1px solid ${theme.borderColor}`,
                        background: i === 0 ? 'rgba(16,185,129,0.04)' : 'transparent',
                      }}
                    >
                      {/* Rank */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', minWidth: 48 }}>
                        <RankBadge rank={i + 1} />
                      </td>
                      {/* Username */}
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: theme.text }}>
                        {e.username || <em style={{ color: theme.textMuted, fontWeight: 400 }}>not set</em>}
                      </td>
                      {/* Public ID */}
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, color: theme.textMuted }}>
                        {e.public_id || '—'}
                      </td>
                      {/* Team */}
                      <td style={{ padding: '10px 12px' }}>
                        {e.team && tc ? (
                          <span style={{ background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>
                            {e.team}
                          </span>
                        ) : <span style={{ color: theme.textMuted }}>—</span>}
                      </td>
                      {/* Score */}
                      <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 15, color: lc.color }}>
                        {e.total_score.toFixed(1)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: theme.textMuted }}> / 9</span>
                      </td>
                      {/* Label */}
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: lc.bg, color: lc.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>
                          {e.label}
                        </span>
                      </td>
                      {/* VO2 percentile */}
                      <td style={{ padding: '10px 12px', color: theme.textMuted }}>
                        {e.vo2_max_percentile != null ? `${e.vo2_max_percentile}th` : '—'}
                      </td>
                      {/* WtHR */}
                      <td style={{ padding: '10px 12px', color: theme.textMuted }}>
                        {e.wthr != null ? e.wthr.toFixed(3) : '—'}
                      </td>
                      {/* hs-CRP */}
                      <td style={{ padding: '10px 12px', color: theme.textMuted }}>
                        {e.hs_crp != null ? e.hs_crp.toFixed(2) : '—'}
                      </td>
                      {/* Score date */}
                      <td style={{ padding: '10px 12px', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                        {e.score_date ? new Date(e.score_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tie-breaker legend */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${theme.borderColor}`, fontSize: 11, color: theme.textMuted }}>
            Tie-breaker order: 1) Higher BHAS score · 2) Higher VO2 Max percentile · 3) Lower WtHR · 4) Lower hs-CRP · 5) Fewer acute care visits
          </div>
        </div>
      )}
    </div>
  )
}
