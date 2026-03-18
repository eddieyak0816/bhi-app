import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface Member {
  username: string | null
  public_id: string | null
  role: string
  team: string | null
  joined_at: string
  bhas_pct: number | null
  result_count: number
}

interface TeamBreakdown {
  team: string
  member_count: number
  avg_bhas_pct: number | null
  optimal_pct: number | null
}

interface OrgData {
  org: { name: string; slug: string }
  members: Member[]
  team_breakdown: TeamBreakdown[]
}

interface EmployerPageProps {
  /** org slug taken from the URL hash, e.g. "acme-corp" from #/employer/acme-corp */
  orgSlug: string
  onNavigate?: (page: string) => void
}

// Cycling palette for dynamic team names (no hardcoded fire/water/wind/earth)
const TEAM_COLOR_PALETTE: Array<{ bg: string; color: string }> = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef9c3', color: '#713f12' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#e0f2fe', color: '#0369a1' },
  { bg: '#fce7f3', color: '#be185d' },
]

function teamColor(teamName: string, index: number): { bg: string; color: string } {
  return TEAM_COLOR_PALETTE[index % TEAM_COLOR_PALETTE.length]
}

function BhasBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: '#9ca3af', fontSize: 13 }}>No data</span>
  const color = pct >= 80 ? '#15803d' : pct >= 50 ? '#b45309' : '#b91c1c'
  const bg    = pct >= 80 ? '#dcfce7'  : pct >= 50 ? '#fef3c7'  : '#fee2e2'
  return (
    <span style={{ background: bg, color, borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: 14 }}>
      {pct}%
    </span>
  )
}

export default function EmployerPage({ orgSlug, onNavigate }: EmployerPageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  useEffect(() => {
    if (!user?.id || !orgSlug) return
    setLoading(true); setError(null)
    fetch(apiUrl(`/api/employer/${encodeURIComponent(orgSlug)}`), {
      headers: { 'x-user-id': user.id },
    })
      .then(async res => {
        if (res.status === 404) throw new Error('Organization not found.')
        if (res.status === 403) throw new Error('You do not have permission to view this organization.')
        if (!res.ok) throw new Error('Server error — try again.')
        return res.json()
      })
      .then(body => { setData(body); setLoading(false) })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [user?.id, orgSlug])

  const sectionStyle: React.CSSProperties = {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', color: theme.text }}>
        Loading organization…
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
          <button onClick={() => onNavigate('home')} style={{ marginTop: 16, background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '7px 16px', cursor: 'pointer', color: theme.text, fontSize: 14 }}>
            ← Back
          </button>
        )}
      </div>
    )
  }

  if (!data) return null

  const members = data.members
  const teamBreakdown = data.team_breakdown || []

  // Aggregate stats
  const withScores = members.filter(m => m.bhas_pct !== null)
  const avgBhas = withScores.length > 0
    ? Math.round(withScores.reduce((s, m) => s + (m.bhas_pct ?? 0), 0) / withScores.length)
    : null

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      {/* PHI notice */}
      <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, padding: '8px 14px', marginBottom: 20, fontSize: 12, color: '#713f12' }}>
        <strong>De-identified view:</strong> Real names, emails, and individual lab values are never shown here. Only usernames, public IDs, teams, and aggregate BHAS scores are displayed.
      </div>

      {/* Org header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: theme.text }}>
          {data.org.name}
        </h2>
        {onNavigate && (
          <button
            onClick={() => onNavigate(`leaderboard/${orgSlug}`)}
            style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            View Leaderboard
          </button>
        )}
      </div>
      <p style={{ margin: '0 0 24px 0', color: theme.textMuted, fontSize: 14 }}>
        {members.length} member{members.length !== 1 ? 's' : ''}{avgBhas !== null ? ` · Org avg BHAS: ${avgBhas}%` : ''}
      </p>

      {/* Team summary cards — Feature 18: dynamic teams with color cycling */}
      {teamBreakdown.filter(t => t.member_count > 0).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {teamBreakdown.filter(t => t.member_count > 0).map(({ team, member_count, avg_bhas_pct, optimal_pct }, idx) => {
            const tc = teamColor(team, idx)
            return (
              <div key={team} style={{ background: tc.bg, borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: tc.color, marginBottom: 4 }}>{team}</div>
                <div style={{ fontSize: 12, color: tc.color, marginBottom: 8 }}>{member_count} member{member_count !== 1 ? 's' : ''}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: tc.color }}>{avg_bhas_pct !== null ? `${avg_bhas_pct}%` : '—'}</div>
                <div style={{ fontSize: 11, color: tc.color, opacity: 0.8 }}>avg BHAS</div>
                {optimal_pct !== null && (
                  <div style={{ fontSize: 11, color: tc.color, opacity: 0.7, marginTop: 4 }}>{optimal_pct}% at optimal</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Member table */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 600, color: theme.text }}>
          Members
        </h3>
        {members.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 14 }}>No members in this organization yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.borderColor}` }}>
                  {['Username', 'Public ID', 'Team', 'BHAS Score', 'Results', 'Role', 'Joined'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: theme.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members
                  .slice()
                  .sort((a, b) => (b.bhas_pct ?? -1) - (a.bhas_pct ?? -1))
                  .map((m, i) => {
                    const teamIdx = m.team ? teamBreakdown.findIndex(t => t.team === m.team) : -1
                    const tc = teamIdx >= 0 ? teamColor(m.team!, teamIdx) : null
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${theme.borderColor}` }}>
                        <td style={{ padding: '8px 10px', color: theme.text, fontWeight: 500 }}>
                          {m.username || <em style={{ color: theme.textMuted }}>not set</em>}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: 12, color: theme.textMuted }}>
                          {m.public_id || '—'}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {m.team && tc ? (
                            <span style={{ background: tc.bg, color: tc.color, borderRadius: 4, padding: '2px 8px', fontWeight: 600, fontSize: 12 }}>{m.team}</span>
                          ) : <span style={{ color: theme.textMuted }}>—</span>}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <BhasBadge pct={m.bhas_pct} />
                        </td>
                        <td style={{ padding: '8px 10px', color: theme.textMuted }}>{m.result_count}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ background: m.role === 'admin' ? '#dbeafe' : '#f3f4f6', color: m.role === 'admin' ? '#1d4ed8' : '#374151', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{m.role}</span>
                        </td>
                        <td style={{ padding: '8px 10px', color: theme.textMuted, whiteSpace: 'nowrap' }}>
                          {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
