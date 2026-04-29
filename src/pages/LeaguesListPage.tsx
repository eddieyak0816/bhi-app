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

  if (loading) {
    return <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px', color: theme.text }}>Loading leagues…</div>
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>
      <h2 style={{ margin: '0 0 6px 0', fontSize: 22, fontWeight: 700, color: theme.text }}>
        National Health League — Leagues
      </h2>
      <p style={{ margin: '0 0 24px 0', fontSize: 14, color: theme.textMuted }}>
        Cross-organization health competitions. Click a league to view the standings.
      </p>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: 14, color: '#b91c1c', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {leagues.length === 0 && !error ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 40, textAlign: 'center', color: theme.textMuted }}>
          No active leagues at this time.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leagues.map(league => (
            <div
              key={league.id}
              style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onClick={() => onNavigate?.(`league/${league.slug}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: theme.text }}>{league.name}</div>
                  <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 3 }}>
                    {new Date(league.starts_at).toLocaleDateString()} – {new Date(league.ends_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{ fontSize: 13, color: theme.blue ?? '#3B82F6', fontWeight: 600 }}>
                  View standings →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
