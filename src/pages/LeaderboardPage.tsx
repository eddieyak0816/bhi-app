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

const TEAM_PALETTE_LIGHT: Array<{ bg: string; color: string }> = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef9c3', color: '#713f12' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#ffedd5', color: '#c2410c' },
]

const TEAM_PALETTE_DARK: Array<{ bg: string; color: string }> = [
  { bg: 'rgba(59,130,246,0.18)',  color: '#93c5fd' },
  { bg: 'rgba(34,197,94,0.15)',   color: '#86efac' },
  { bg: 'rgba(234,179,8,0.15)',   color: '#fde047' },
  { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5' },
  { bg: 'rgba(168,85,247,0.15)',  color: '#d8b4fe' },
  { bg: 'rgba(249,115,22,0.15)',  color: '#fdba74' },
]

function teamColor(teamName: string, teams: string[], darkMode: boolean) {
  const idx = teams.indexOf(teamName)
  const palette = darkMode ? TEAM_PALETTE_DARK : TEAM_PALETTE_LIGHT
  return palette[(idx >= 0 ? idx : 0) % palette.length]
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ fontSize: 20 }}>🥇</span>
  if (rank === 2) return <span style={{ fontSize: 20 }}>🥈</span>
  if (rank === 3) return <span style={{ fontSize: 20 }}>🥉</span>
  return <span style={{ fontSize: 13, fontWeight: 700, color: '#6b7280' }}>#{rank}</span>
}

const LABELS = ['Optimal', 'Healthy', 'Needs Improvement', 'High Risk'] as const

export default function LeaderboardPage({ orgSlug, onNavigate }: LeaderboardPageProps) {
  const { theme, darkMode } = useTheme()
  const { user } = useAuth()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchUsername, setSearchUsername] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterLabel, setFilterLabel] = useState('')
  const [minScore, setMinScore] = useState(0)

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

  // Apply filters — rank index is always based on the unfiltered sorted list
  const filtered = entries
    .map((e, i) => ({ entry: e, rank: i + 1 }))
    .filter(({ entry: e }) => {
      if (searchUsername && !(e.username ?? '').toLowerCase().includes(searchUsername.toLowerCase()) &&
          !(e.public_id ?? '').toLowerCase().includes(searchUsername.toLowerCase())) return false
      if (filterTeam && e.team !== filterTeam) return false
      if (filterLabel && e.label !== filterLabel) return false
      if (e.total_score < minScore) return false
      return true
    })

  const hasFilters = searchUsername || filterTeam || filterLabel || minScore > 0

  const inputStyle: React.CSSProperties = {
    background: theme.card,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    padding: '6px 10px',
    color: theme.text,
    fontSize: 13,
    outline: 'none',
  }

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
      <p style={{ margin: '0 0 20px 0', color: theme.textMuted, fontSize: 14 }}>
        {entries.length} participant{entries.length !== 1 ? 's' : ''} with a scored v2.3 result · Ranked by BHAS v2.3 score with tie-breaker logic
      </p>

      {entries.length > 0 && (
        <>
          {/* Filter bar */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
            background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`,
            borderRadius: 8, padding: '12px 14px', marginBottom: 16,
          }}>
            {/* Username / Public ID search */}
            <input
              type="text"
              placeholder="Search username or public ID…"
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
              style={{ ...inputStyle, minWidth: 200, flexGrow: 1 }}
            />

            {/* Team filter */}
            {allTeams.length > 0 && (
              <select
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">All teams</option>
                {allTeams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}

            {/* Health label filter */}
            <select
              value={filterLabel}
              onChange={e => setFilterLabel(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">All labels</option>
              {LABELS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            {/* Minimum score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: theme.textMuted, whiteSpace: 'nowrap' }}>
                Min score: <strong style={{ color: theme.text }}>{minScore.toFixed(1)}</strong>
              </span>
              <input
                type="range"
                min={0} max={9} step={0.5}
                value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
                style={{ width: 90, cursor: 'pointer', accentColor: theme.blue }}
              />
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setSearchUsername(''); setFilterTeam(''); setFilterLabel(''); setMinScore(0) }}
                style={{ ...inputStyle, cursor: 'pointer', color: theme.textMuted, fontSize: 12 }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Result count when filtered */}
          {hasFilters && (
            <p style={{ margin: '0 0 10px 0', fontSize: 12, color: theme.textMuted }}>
              Showing {filtered.length} of {entries.length} participants
            </p>
          )}
        </>
      )}

      {entries.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 40, textAlign: 'center', color: theme.textMuted }}>
          No scored participants yet. Members need to log enough lab data for a BHAS v2.3 score to appear here.
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 40, textAlign: 'center', color: theme.textMuted }}>
          No participants match the current filters.
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
                {filtered.map(({ entry: e, rank }) => {
                  const lc = LABEL_COLOR[e.label] ?? LABEL_COLOR['High Risk']
                  const tc = e.team ? teamColor(e.team, allTeams, darkMode) : null
                  return (
                    <tr
                      key={rank}
                      style={{
                        borderBottom: `1px solid ${theme.borderColor}`,
                        background: rank === 1 ? 'rgba(16,185,129,0.04)' : 'transparent',
                      }}
                    >
                      {/* Rank — always reflects position in full unfiltered list */}
                      <td style={{ padding: '10px 12px', textAlign: 'center', minWidth: 48 }}>
                        <RankBadge rank={rank} />
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
