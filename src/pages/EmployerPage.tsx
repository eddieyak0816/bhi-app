import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts'
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

interface AnalyticsData {
  org: { name: string; slug: string }
  kpis: {
    total_members: number
    members_with_data: number
    avg_bhas_pct: number | null
    pct_at_optimal: number | null
  }
  score_distribution: Array<{ label: string; count: number }>
  label_distribution: Array<{ label: string; count: number }>
  trend: Array<{ week: string; avg_score: number; member_count: number }>
  metric_breakdown: Array<{ metric: string; optimal_pct: number; member_count: number }>
}

interface EmployerPageProps {
  /** org slug taken from the URL hash, e.g. "acme-corp" from #/employer/acme-corp */
  orgSlug: string
  onNavigate?: (page: string) => void
}

const TEAM_COLOR_PALETTE_LIGHT: Array<{ bg: string; color: string }> = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef9c3', color: '#713f12' },
  { bg: '#fee2e2', color: '#b91c1c' },
  { bg: '#f3e8ff', color: '#7c3aed' },
  { bg: '#ffedd5', color: '#c2410c' },
  { bg: '#e0f2fe', color: '#0369a1' },
  { bg: '#fce7f3', color: '#be185d' },
]

const TEAM_COLOR_PALETTE_DARK: Array<{ bg: string; color: string }> = [
  { bg: 'rgba(59,130,246,0.18)',  color: '#93c5fd' },
  { bg: 'rgba(34,197,94,0.15)',   color: '#86efac' },
  { bg: 'rgba(234,179,8,0.15)',   color: '#fde047' },
  { bg: 'rgba(239,68,68,0.15)',   color: '#fca5a5' },
  { bg: 'rgba(168,85,247,0.15)',  color: '#d8b4fe' },
  { bg: 'rgba(249,115,22,0.15)',  color: '#fdba74' },
  { bg: 'rgba(14,165,233,0.15)',  color: '#7dd3fc' },
  { bg: 'rgba(236,72,153,0.15)',  color: '#f9a8d4' },
]

function teamColor(index: number, darkMode: boolean): { bg: string; color: string } {
  const palette = darkMode ? TEAM_COLOR_PALETTE_DARK : TEAM_COLOR_PALETTE_LIGHT
  return palette[index % palette.length]
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
  const { theme, darkMode } = useTheme()
  const { user } = useAuth()
  const [data, setData] = useState<OrgData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'members' | 'analytics'>('members')

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  // Filters
  const [searchUsername, setSearchUsername] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [minBhas, setMinBhas] = useState(0)

  // Column sort
  const [sortCol, setSortCol] = useState<'username' | 'public_id' | 'team' | 'bhas_pct' | 'result_count' | 'role' | 'joined_at'>('bhas_pct')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  function sortArrow(col: typeof sortCol) { return sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '' }

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

  useEffect(() => {
    if (!user?.id || !orgSlug || activeTab !== 'analytics') return
    if (analyticsData) return // already loaded
    setAnalyticsLoading(true); setAnalyticsError(null)
    fetch(apiUrl(`/api/analytics/${encodeURIComponent(orgSlug)}`), {
      headers: { 'x-user-id': user.id },
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(`Analytics error ${res.status}: ${body.error ?? 'unknown'} ${body.detail ?? body.step ?? ''}`.trim())
        }
        return res.json()
      })
      .then(body => { setAnalyticsData(body); setAnalyticsLoading(false) })
      .catch(err => { setAnalyticsError(err.message); setAnalyticsLoading(false) })
  }, [user?.id, orgSlug, activeTab])

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

  const allTeams = [...new Set(members.map(m => m.team).filter(Boolean) as string[])]
  const allRoles = [...new Set(members.map(m => m.role).filter(Boolean))]
  const hasFilters = searchUsername || filterTeam || filterRole || minBhas > 0

  const filteredMembers = members
    .filter(m => {
      if (searchUsername && !(m.username ?? '').toLowerCase().includes(searchUsername.toLowerCase()) &&
          !(m.public_id ?? '').toLowerCase().includes(searchUsername.toLowerCase())) return false
      if (filterTeam && m.team !== filterTeam) return false
      if (filterRole && m.role !== filterRole) return false
      if (minBhas > 0 && (m.bhas_pct === null || m.bhas_pct < minBhas)) return false
      return true
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      if (sortCol === 'bhas_pct') return dir * ((a.bhas_pct ?? -1) - (b.bhas_pct ?? -1))
      if (sortCol === 'result_count') return dir * (a.result_count - b.result_count)
      if (sortCol === 'joined_at') return dir * (a.joined_at || '').localeCompare(b.joined_at || '')
      if (sortCol === 'username') return dir * (a.username ?? '').localeCompare(b.username ?? '')
      if (sortCol === 'public_id') return dir * (a.public_id ?? '').localeCompare(b.public_id ?? '')
      if (sortCol === 'team') return dir * (a.team ?? '').localeCompare(b.team ?? '')
      if (sortCol === 'role') return dir * (a.role ?? '').localeCompare(b.role ?? '')
      return 0
    })

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
      <p style={{ margin: '0 0 16px 0', color: theme.textMuted, fontSize: 14 }}>
        {members.length} member{members.length !== 1 ? 's' : ''}{avgBhas !== null ? ` · Org avg BHAS: ${avgBhas}%` : ''}
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `2px solid ${theme.borderColor}` }}>
        {(['members', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 18px', fontSize: 14, fontWeight: 600,
              color: activeTab === tab ? (theme.blue ?? '#3B82F6') : theme.textMuted,
              borderBottom: activeTab === tab ? `2px solid ${theme.blue ?? '#3B82F6'}` : '2px solid transparent',
              marginBottom: -2,
              textTransform: 'capitalize',
            }}
          >
            {tab === 'members' ? 'Members' : 'Analytics'}
          </button>
        ))}
      </div>

      {/* ── ANALYTICS TAB ── */}
      {activeTab === 'analytics' && (
        <AnalyticsPanel
          data={analyticsData}
          loading={analyticsLoading}
          error={analyticsError}
          theme={theme}
          darkMode={darkMode}
        />
      )}

      {/* ── MEMBERS TAB ── */}
      {activeTab === 'members' && (<>

      {/* Team summary cards — Feature 18: dynamic teams with color cycling */}
      {teamBreakdown.filter(t => t.member_count > 0).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {teamBreakdown.filter(t => t.member_count > 0).map(({ team, member_count, avg_bhas_pct, optimal_pct }, idx) => {
            const tc = teamColor(idx, darkMode)
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
        <h3 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, color: theme.text }}>
          Members
        </h3>

        {/* Filter bar */}
        {members.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `1fr 130px 120px auto${hasFilters ? ' auto' : ''}`,
              gap: 8, alignItems: 'center',
              background: theme.bg, border: `1px solid ${theme.borderColor}`,
              borderRadius: 8, padding: '10px 12px', marginBottom: 12,
            }}>
              <input
                type="text"
                placeholder="Search username or public ID…"
                value={searchUsername}
                onChange={e => setSearchUsername(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
              <select
                value={filterTeam}
                onChange={e => setFilterTeam(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', width: '100%' }}
              >
                <option value="">All teams</option>
                {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer', width: '100%' }}
              >
                <option value="">All roles</option>
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  Min BHAS: <strong style={{ color: theme.text }}>{minBhas}%</strong>
                </span>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={minBhas}
                  onChange={e => setMinBhas(Number(e.target.value))}
                  style={{ width: 80, cursor: 'pointer', accentColor: theme.blue }}
                />
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setSearchUsername(''); setFilterTeam(''); setFilterRole(''); setMinBhas(0) }}
                  style={{ ...inputStyle, cursor: 'pointer', color: theme.textMuted, fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  Clear
                </button>
              )}
            </div>
            {hasFilters && (
              <p style={{ margin: '0 0 10px 0', fontSize: 12, color: theme.textMuted }}>
                Showing {filteredMembers.length} of {members.length} members
              </p>
            )}
          </>
        )}

        {members.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 14 }}>No members in this organization yet.</p>
        ) : filteredMembers.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 14 }}>No members match the current filters.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.borderColor}` }}>
                  {([
                    ['username',     'Username'],
                    ['public_id',    'Public ID'],
                    ['team',         'Team'],
                    ['bhas_pct',     'BHAS Score'],
                    ['result_count', 'Results'],
                    ['role',         'Role'],
                    ['joined_at',    'Joined'],
                  ] as [typeof sortCol, string][]).map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => toggleSort(col)}
                      style={{ textAlign: 'left', padding: '6px 10px', color: theme.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                    >
                      {label}{sortArrow(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m, i) => {
                  const teamIdx = m.team ? teamBreakdown.findIndex(t => t.team === m.team) : -1
                  const tc = teamIdx >= 0 ? teamColor(teamIdx, darkMode) : null
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
      </>)}
    </div>
  )
}

// ── Analytics Panel ───────────────────────────────────────────────────────────

interface AnalyticsPanelProps {
  data: AnalyticsData | null
  loading: boolean
  error: string | null
  theme: any
  darkMode: boolean
}

const LABEL_COLORS: Record<string, { bg: string; color: string }> = {
  'Optimal':           { bg: '#dcfce7', color: '#15803d' },
  'Healthy':           { bg: '#dbeafe', color: '#1d4ed8' },
  'Needs Improvement': { bg: '#fef3c7', color: '#b45309' },
  'High Risk':         { bg: '#fee2e2', color: '#b91c1c' },
}

function distBarColor(label: string): string {
  if (label === '100%') return '#15803d'
  if (label === '75–99%') return '#22c55e'
  if (label === '50–74%') return '#b45309'
  if (label === '25–49%') return '#f97316'
  return '#b91c1c'
}

function metricBarColor(pct: number): string {
  if (pct >= 75) return '#15803d'
  if (pct >= 50) return '#b45309'
  return '#b91c1c'
}

function AnalyticsPanel({ data, loading, error, theme, darkMode }: AnalyticsPanelProps) {
  const sectionStyle: React.CSSProperties = {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  }

  if (loading) {
    return <div style={{ color: theme.textMuted, padding: '40px 0', textAlign: 'center' }}>Loading analytics…</div>
  }
  if (error) {
    return (
      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, color: '#b91c1c', marginBottom: 20 }}>
        {error}
      </div>
    )
  }
  if (!data) return null

  const { kpis, score_distribution, label_distribution, trend, metric_breakdown } = data
  const hasScoreData = kpis.members_with_data > 0

  // KPI tiles
  const kpiTiles = [
    { label: 'Total Members',     value: String(kpis.total_members) },
    { label: 'Members with Data', value: String(kpis.members_with_data) },
    { label: 'Avg BHAS %',        value: kpis.avg_bhas_pct !== null ? `${kpis.avg_bhas_pct}%` : '—' },
    { label: '% at Optimal',      value: kpis.pct_at_optimal !== null ? `${kpis.pct_at_optimal}%` : '—' },
  ]

  // Custom bar colours for score distribution chart
  const DistBar = (props: any) => {
    const { x, y, width, height, label: bucketLabel } = props
    return <rect x={x} y={y} width={width} height={height} fill={distBarColor(bucketLabel)} rx={3} />
  }

  // Custom bar colours for metric breakdown chart
  const MetricBar = (props: any) => {
    const { x, y, width, height, optimal_pct } = props
    return <rect x={x} y={y} width={width} height={height} fill={metricBarColor(optimal_pct)} rx={3} />
  }

  return (
    <>
      {/* KPI tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {kpiTiles.map(({ label, value }) => (
          <div key={label} style={{ ...sectionStyle, marginBottom: 0, padding: '16px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: theme.text }}>{value}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {!hasScoreData && (
        <div style={{ ...sectionStyle, color: theme.textMuted, fontSize: 14 }}>
          No BHAS v2 score data yet for this organization. Members need to calculate their score on the Dashboard for analytics to populate.
        </div>
      )}

      {hasScoreData && (<>

        {/* BHAS Score Distribution */}
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: theme.text }}>BHAS Score Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={score_distribution} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.borderColor} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.textMuted }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: theme.textMuted }} />
              <Tooltip
                contentStyle={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, color: theme.text }}
                labelStyle={{ color: theme.text }}
                itemStyle={{ color: theme.blue ?? '#3B82F6' }}
                formatter={(value: number) => [value, 'Members']}
              />
              <Bar dataKey="count" shape={(props: any) => {
                const entry = score_distribution.find(d => d.label === props.label)
                return <rect {...props} fill={distBarColor(entry?.label ?? '')} rx={3} />
              }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* BHAS v2 Label Distribution */}
        <div style={sectionStyle}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 600, color: theme.text }}>Health Label Distribution</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {label_distribution.map(({ label, count }) => {
              const c = LABEL_COLORS[label] ?? { bg: '#f3f4f6', color: '#374151' }
              return (
                <div key={label} style={{ background: c.bg, borderRadius: 8, padding: '12px 18px', minWidth: 120 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{count}</div>
                  <div style={{ fontSize: 12, color: c.color, marginTop: 2 }}>{label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 12-Week Trend */}
        {trend.length > 0 && (
          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: theme.text }}>Org BHAS Trend — Last 12 Weeks</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: theme.textMuted }}>Weekly average BHAS % across members with data</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.borderColor} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: theme.textMuted }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: theme.textMuted }} unit="%" />
                <Tooltip
                  contentStyle={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, color: theme.text }}
                labelStyle={{ color: theme.text }}
                itemStyle={{ color: theme.blue ?? '#3B82F6' }}
                  formatter={(value: number, name: string) => [
                    name === 'avg_score' ? `${value}%` : value,
                    name === 'avg_score' ? 'Avg BHAS' : 'Members',
                  ]}
                />
                <ReferenceLine y={89} stroke="#15803d" strokeDasharray="4 2" label={{ value: 'Optimal', position: 'insideTopRight', fontSize: 10, fill: '#15803d' }} />
                <Line type="monotone" dataKey="avg_score" stroke={theme.blue ?? '#3B82F6'} strokeWidth={2} dot={{ r: 4, fill: theme.blue ?? '#3B82F6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Per-Metric % Optimal */}
        {metric_breakdown.length > 0 && (
          <div style={sectionStyle}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600, color: theme.text }}>Per-Metric % at Optimal</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 12, color: theme.textMuted }}>Percentage of members with data scoring Optimal on each BHAS v2 metric</p>
            <ResponsiveContainer width="100%" height={Math.max(180, metric_breakdown.length * 36)}>
              <BarChart
                layout="vertical"
                data={metric_breakdown}
                margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.borderColor} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: theme.textMuted }} unit="%" />
                <YAxis type="category" dataKey="metric" width={140} tick={{ fontSize: 11, fill: theme.text }} />
                <Tooltip
                  contentStyle={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, color: theme.text }}
                labelStyle={{ color: theme.text }}
                itemStyle={{ color: theme.blue ?? '#3B82F6' }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props.payload.member_count} members)`,
                    '% at Optimal',
                  ]}
                />
                <Bar dataKey="optimal_pct" shape={(props: any) => {
                  const entry = metric_breakdown.find(m => m.metric === props.metric)
                  return <rect {...props} fill={metricBarColor(entry?.optimal_pct ?? 0)} rx={3} />
                }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </>)}
    </>
  )
}

