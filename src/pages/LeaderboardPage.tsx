import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { buildCsvString, downloadCsv, todayIso } from '../utils/csvExport'

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

const LABEL_TONE: Record<string, string> = {
  'Optimal':           'optimal',
  'Healthy':           'healthy',
  'Needs Improvement': 'needs',
  'High Risk':         'risk',
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
  if (rank === 1) return <span className="medal">🥇</span>
  if (rank === 2) return <span className="medal">🥈</span>
  if (rank === 3) return <span className="medal">🥉</span>
  return <span>#{rank}</span>
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
      <div className="em-root">
        <div className="em-loading">Loading leaderboard…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="em-root">
        <div className="em-err">{error}</div>
        {onNavigate && (
          <button className="em-back" onClick={() => onNavigate('home')}>← Back</button>
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

  function handleExportLeaderboard() {
    const headers = ['Rank', 'Username', 'Public ID', 'Team', 'NHLS Score', 'Health Label', 'VO2 Max Percentile', 'Waist-to-Height Ratio', 'hs-CRP', 'Acute Visits', 'Score Date']
    const rows = filtered.map(({ entry: e, rank }) => [
      rank,
      e.username ?? '',
      e.public_id ?? '',
      e.team ?? '',
      e.total_score.toFixed(1),
      e.label,
      e.vo2_max_percentile ?? '',
      e.wthr != null ? e.wthr.toFixed(3) : '',
      e.hs_crp ?? '',
      e.acute_visits ?? '',
      e.score_date ? e.score_date.slice(0, 10) : '',
    ])
    downloadCsv(buildCsvString(headers, rows), `nhl-leaderboard-${orgSlug}-${todayIso()}.csv`)
  }

  // ── Presentation only below this line ───────────────────────────────────────
  // Same data, same filters, same rank logic and CSV export as before.
  return (
    <div className="em-root">
      {/* Back link */}
      {onNavigate && (
        <button className="em-back" onClick={() => onNavigate(`employer/${orgSlug}`)}>
          ← Employer View
        </button>
      )}

      {/* PHI notice */}
      <div className="em-note">
        <span aria-hidden="true">🔒</span>
        <div>
          <b>De-identified view:</b> Real names, emails, and individual lab values are never shown. Only usernames, public IDs, teams, and NHLS scores are displayed.
        </div>
      </div>

      {/* Header */}
      <div className="em-head">
        <div>
          <h2>{data.org.name} — NHLS Leaderboard</h2>
          <div className="em-meta">
            <span className="em-chip">{entries.length} participant{entries.length !== 1 ? 's' : ''} with a scored result</span>
            <span className="em-chip">Ranked by NHLS score with tie-breaker logic</span>
          </div>
        </div>
      </div>

      {filtered.length > 0 && (
        <div className="lb-export">
          <button className="em-btn primary sm" onClick={handleExportLeaderboard}>
            Export CSV
          </button>
        </div>
      )}

      {entries.length > 0 && (
        <>
          {/* Filter bar */}
          <div className="em-filters">
            <input
              className="em-input grow"
              type="text"
              placeholder="Search username or public ID…"
              aria-label="Search username or public ID"
              value={searchUsername}
              onChange={e => setSearchUsername(e.target.value)}
            />

            <select
              className="em-select"
              aria-label="Filter by team"
              value={filterTeam}
              onChange={e => setFilterTeam(e.target.value)}
            >
              <option value="">All teams</option>
              {allTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              className="em-select"
              aria-label="Filter by label"
              value={filterLabel}
              onChange={e => setFilterLabel(e.target.value)}
            >
              <option value="">All labels</option>
              {LABELS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <div className="em-range">
              <span>Min: <strong>{minScore.toFixed(1)}</strong></span>
              <input
                type="range"
                aria-label="Minimum NHLS score"
                min={0} max={9} step={0.5}
                value={minScore}
                onChange={e => setMinScore(Number(e.target.value))}
              />
            </div>

            {hasFilters && (
              <button
                className="em-btn ghost sm"
                onClick={() => { setSearchUsername(''); setFilterTeam(''); setFilterLabel(''); setMinScore(0) }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Result count when filtered */}
          {hasFilters && (
            <p className="em-showing">
              Showing {filtered.length} of {entries.length} participants
            </p>
          )}
        </>
      )}

      {entries.length === 0 ? (
        <div className="lb-empty">
          No scored participants yet. Members need to log enough lab data for an NHLS score to appear here.
        </div>
      ) : filtered.length === 0 ? (
        <div className="lb-empty">
          No participants match the current filters.
        </div>
      ) : (
        <div className="lb-card">
          <div className="em-tablewrap">
            <table className="em-table lb">
              <thead>
                <tr>
                  {['Rank', 'Username', 'Public ID', 'Team', 'Score', 'Label', 'VO2 %ile', 'WtHR', 'hs-CRP', 'As of'].map(h => (
                    <th key={h} style={{ cursor: 'default' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ entry: e, rank }) => {
                  const tone = LABEL_TONE[e.label] ?? 'risk'
                  const tc = e.team ? teamColor(e.team, allTeams, darkMode) : null
                  return (
                    <tr key={rank} className={rank === 1 ? 'lb-top' : undefined}>
                      {/* Rank — always reflects position in full unfiltered list */}
                      <td className="lb-rank"><RankBadge rank={rank} /></td>
                      {/* Username */}
                      <td className="em-user">
                        {e.username || <em className="em-nodata">not set</em>}
                      </td>
                      {/* Public ID */}
                      <td className="em-mono">{e.public_id || '—'}</td>
                      {/* Team */}
                      <td>
                        {e.team && tc ? (
                          <span className="em-pill" style={{ background: tc.bg, color: tc.color }}>{e.team}</span>
                        ) : <span className="em-nodata">—</span>}
                      </td>
                      {/* Score */}
                      <td className={`lb-score ${tone}`}>
                        {e.total_score.toFixed(1)}
                        <small>/ 9</small>
                      </td>
                      {/* Label */}
                      <td><span className={`lb-lab ${tone}`}>{e.label}</span></td>
                      {/* VO2 percentile */}
                      <td className="muted">
                        {e.vo2_max_percentile != null ? `${e.vo2_max_percentile}th` : '—'}
                      </td>
                      {/* WtHR */}
                      <td className="muted">
                        {e.wthr != null ? e.wthr.toFixed(3) : '—'}
                      </td>
                      {/* hs-CRP */}
                      <td className="muted">
                        {e.hs_crp != null ? e.hs_crp.toFixed(2) : '—'}
                      </td>
                      {/* Score date */}
                      <td className="muted nw">
                        {e.score_date ? new Date(e.score_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Tie-breaker legend */}
          <div className="lb-foot">
            Tie-breaker order: 1) Higher NHLS score · 2) Higher VO2 Max percentile · 3) Lower WtHR · 4) Lower hs-CRP · 5) Fewer acute care visits
          </div>
        </div>
      )}
    </div>
  )
}
