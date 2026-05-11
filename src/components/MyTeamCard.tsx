import { useState, useEffect } from 'react'
import { getStoredJwt } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface TeamRow {
  team: string
  member_count: number
  avg_bhas_pct: number | null
}

interface MyTeamData {
  member: boolean
  org_name: string
  user_team: string | null
  user_rank: number | null
  user_team_size: number | null
  team_leaderboard: TeamRow[]
}

interface Props {
  theme: any
}

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL as string || ''

function backendUrl(path: string) {
  return BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${path}` : path
}

function medalColor(rank: number) {
  if (rank === 1) return '#F59E0B'
  if (rank === 2) return '#94A3B8'
  if (rank === 3) return '#B45309'
  return '#6B7280'
}

function bhasColor(pct: number | null) {
  if (pct === null) return '#6B7280'
  if (pct >= 80) return '#10B981'
  if (pct >= 60) return '#3B82F6'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

export default function MyTeamCard({ theme }: Props) {
  const { user } = useAuth()
  const [data, setData] = useState<MyTeamData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    async function load() {
      setLoading(true)
      try {
        const jwt = getStoredJwt()
        if (!jwt) return
        const res = await fetch(backendUrl('/api/my-team'), {
          headers: { 'x-user-id': user!.id, 'Authorization': `Bearer ${jwt}` },
        })
        if (!res.ok) return
        const body = await res.json()
        setData(body)
      } catch {
        // silently hide card on error
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id])

  if (loading || !data || !data.member || !data.user_team) return null

  const { org_name, user_team, user_rank, user_team_size, team_leaderboard } = data
  const userTeamRank = team_leaderboard.findIndex(t => t.team === user_team) + 1

  return (
    <div style={{
      background: theme.card ?? theme.bgSecondary,
      border: `1.5px solid ${theme.borderColor}`,
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: theme.textMuted, textTransform: 'uppercase', marginBottom: 4 }}>
            {org_name}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>
            Team {user_team}
          </div>
        </div>
        {/* User's rank badge */}
        {user_rank !== null && user_team_size !== null && (
          <div style={{ textAlign: 'center', background: theme.bg ?? theme.bgSecondary, border: `1.5px solid ${theme.borderColor}`, borderRadius: 8, padding: '8px 14px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.text }}>#{user_rank}</div>
            <div style={{ fontSize: 11, color: theme.textMuted }}>of {user_team_size} on your team</div>
          </div>
        )}
      </div>

      {/* Team leaderboard */}
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
        Team Rankings
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {team_leaderboard.map((t, i) => {
          const isMyTeam = t.team === user_team
          const rank = i + 1
          return (
            <div key={t.team} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 8,
              background: isMyTeam ? `${theme.blue}18` : (theme.bg ?? theme.bgSecondary),
              border: `1.5px solid ${isMyTeam ? theme.blue : theme.borderColor}`,
              transition: 'all 0.15s',
            }}>
              {/* Rank */}
              <div style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: 14, color: medalColor(rank) }}>
                {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
              </div>

              {/* Team name */}
              <div style={{ flex: 1, fontWeight: isMyTeam ? 700 : 500, fontSize: 14, color: theme.text }}>
                {t.team}
                {isMyTeam && <span style={{ marginLeft: 8, fontSize: 11, color: theme.blue, fontWeight: 600 }}>← you</span>}
              </div>

              {/* Member count */}
              <div style={{ fontSize: 12, color: theme.textMuted, minWidth: 60, textAlign: 'right' }}>
                {t.member_count} member{t.member_count !== 1 ? 's' : ''}
              </div>

              {/* BHAS bar */}
              <div style={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, background: theme.borderColor, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${t.avg_bhas_pct ?? 0}%`,
                    background: bhasColor(t.avg_bhas_pct),
                    borderRadius: 3,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: bhasColor(t.avg_bhas_pct), minWidth: 36, textAlign: 'right' }}>
                  {t.avg_bhas_pct !== null ? `${t.avg_bhas_pct}%` : '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {team_leaderboard.length === 0 && (
        <div style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>
          No teams have been set up for this organization yet.
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: theme.textMuted }}>
        Scores shown are team averages. Individual data is never shared.
      </div>
    </div>
  )
}
