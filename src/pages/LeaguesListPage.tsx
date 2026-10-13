import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface League {
  id: string
  name: string
  slug: string
  starts_at: string
  ends_at: string
  is_active: boolean
}

interface LeaguesListPageProps {
  onNavigate?: (page: string) => void
}

export default function LeaguesListPage({ onNavigate }: LeaguesListPageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/leagues'), { headers: { 'x-user-id': user.id } })
      .then(res => res.ok ? res.json() : Promise.reject('Server error'))
      .then(body => { setLeagues(body.leagues || []); setLoading(false) })
      .catch(() => { setError('Could not load leagues.'); setLoading(false) })
  }, [user?.id])

  // Presentation only below this line — same data, same click target (league/<slug>).
  if (loading) {
    return <div className="lg-root"><div className="lg-loading">Loading leagues…</div></div>
  }

  return (
    <div className="lg-root">
      <div className="lg-head">
        <h2>National Health League — Leagues</h2>
        <p>Cross-organization health competitions. Click a league to view the standings.</p>
      </div>

      {error && <div className="lg-err">{error}</div>}

      {leagues.length === 0 && !error ? (
        <div className="lg-empty">No active leagues at this time.</div>
      ) : (
        <div className="lg-list">
          {leagues.map(league => (
            <button
              key={league.id}
              className="lg-card"
              onClick={() => onNavigate?.(`league/${league.slug}`)}
            >
              <span className="lg-ic" aria-hidden="true">🏆</span>
              <span className="lg-card-main">
                <span className="lg-name" style={{ display: 'block' }}>{league.name}</span>
                <span className="lg-dates" style={{ display: 'block' }}>
                  {new Date(league.starts_at).toLocaleDateString()} – {new Date(league.ends_at).toLocaleDateString()}
                </span>
              </span>
              <span className="lg-go">
                <span>View standings</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
