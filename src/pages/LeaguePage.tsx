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

type BandTone = 'optimal' | 'healthy' | 'needs' | 'risk' | 'none'
const LABEL_FOR_SCORE = (score: number | null): { label: string; tone: BandTone } => {
  if (score === null) return { label: '—', tone: 'none' }
  if (score >= 6.0) return { label: 'Optimal',           tone: 'optimal' }
  if (score >= 5.0) return { label: 'Healthy',           tone: 'healthy' }
  if (score >= 4.0) return { label: 'Needs Improvement', tone: 'needs' }
  return                    { label: 'High Risk',         tone: 'risk' }
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

  // Presentation only below this line — same data, same two navigation handlers.
  if (loading) {
    return <div className="lg-root"><div className="lg-loading">Loading league…</div></div>
  }

  if (error) {
    return (
      <div className="lg-root">
        <div className="lg-err">{error}</div>
        {onNavigate && (
          <button className="lg-back" onClick={() => onNavigate('leagues')}>← Back to Leagues</button>
        )}
      </div>
    )
  }

  if (!data) return null

  const { league, entries } = data
  const starts = new Date(league.starts_at).toLocaleDateString()
  const ends   = new Date(league.ends_at).toLocaleDateString()
  const medal = (rank: number) => rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'

  return (
    <div className="lg-root">
      {onNavigate && (
        <button className="lg-back" onClick={() => onNavigate('leagues')}>← All Leagues</button>
      )}

      {/* PHI notice — wording unchanged */}
      <div className="lg-note">
        <span aria-hidden="true">🔒</span>
        <div>
          <b>De-identified view:</b> Only organization names and aggregate average NHLS scores are shown. No individual data is ever displayed.
        </div>
      </div>

      <div className="lg-head">
        <h2>{league.name}</h2>
        <div className="lg-meta">
          <span className="lg-chip">{starts} – {ends}</span>
          <span className="lg-chip">{entries.length} organization{entries.length !== 1 ? 's' : ''} competing</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="lg-empty">No organizations with scored participants yet.</div>
      ) : (
        <>
          {/* Top three — same entries, same order, shown as cards */}
          <div className="lg-podium">
            {entries.slice(0, 3).map((e, i) => {
              const rank = i + 1
              const { label, tone } = LABEL_FOR_SCORE(e.avg_score)
              return (
                <div key={e.org_id} className={`lg-pod${rank === 1 ? ' first' : ''}`}>
                  <div className="lg-medal" aria-label={`Rank ${rank}`}>{medal(rank)}</div>
                  <div className="lg-pod-name">{e.org_name}</div>
                  <div className="lg-pod-score">
                    {e.avg_score !== null ? e.avg_score.toFixed(2) : '—'}
                    {e.avg_score !== null && <small>/ 7.0</small>}
                  </div>
                  {e.avg_score !== null && <span className={`lg-band ${tone}`}>{label}</span>}
                  <div className="lg-pod-sub">{e.participant_count} of {e.member_count} members scored</div>
                </div>
              )
            })}
          </div>

          {/* Full standings — every organization, every column, as before */}
          <div className="lg-tablewrap">
            <table className="lg-table">
              <thead>
                <tr>
                  {['Rank', 'Organization', 'Avg NHLS Score', 'Health Band', 'Scored Members', 'Total Members'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const rank = i + 1
                  const { label, tone } = LABEL_FOR_SCORE(e.avg_score)
                  return (
                    <tr key={e.org_id} className={rank === 1 ? 'top' : undefined}>
                      <td className="lg-rank">{rank <= 3 ? medal(rank) : `#${rank}`}</td>
                      <td className="lg-org">{e.org_name}</td>
                      <td className="lg-score">
                        {e.avg_score !== null ? e.avg_score.toFixed(2) : '—'}
                        {e.avg_score !== null && <small>/ 7.0</small>}
                      </td>
                      <td>
                        {e.avg_score !== null && (
                          <span className={`lg-band ${tone}`} style={{ marginTop: 0 }}>{label}</span>
                        )}
                      </td>
                      <td className="muted">{e.participant_count}</td>
                      <td className="muted">{e.member_count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="lg-foot">
              Ranked by average NHLS score across all scored participants in each organization.
            </div>
          </div>
        </>
      )}
    </div>
  )
}
