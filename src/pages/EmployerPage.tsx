import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ReferenceLine,
} from 'recharts'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { buildCsvString, downloadCsv, todayIso } from '../utils/csvExport'
import InsuranceReportModal from '../components/InsuranceReportModal'

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
  if (pct === null) return <span className="em-nodata">No data</span>
  const tone = pct >= 80 ? 'hi' : pct >= 50 ? 'mid' : 'lo'
  return <span className={`em-score ${tone}`}>{pct}%</span>
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

  if (loading) {
    return (
      <div className="em-root">
        <div className="em-loading">Loading organization…</div>
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

  function handleExportMembers() {
    const headers = ['Username', 'Public ID', 'Team', 'Role', 'Joined Date', 'NHLS Score (%)', 'Lab Results']
    const rows = filteredMembers.map(m => [
      m.username ?? '',
      m.public_id ?? '',
      m.team ?? '',
      m.role,
      m.joined_at ? m.joined_at.slice(0, 10) : '',
      m.bhas_pct ?? '',
      m.result_count,
    ])
    downloadCsv(buildCsvString(headers, rows), `nhl-members-${orgSlug}-${todayIso()}.csv`)
  }

  // ── Presentation only below this line ───────────────────────────────────────
  // Same data, same filters / sort / export / tab handlers as before.
  return (
    <div className="em-root">
      {/* Back to Admin / Organizations */}
      {onNavigate && (
        <button className="em-back" onClick={() => onNavigate('admin/organizations')}>
          ← Back to Organizations
        </button>
      )}

      {/* PHI notice */}
      <div className="em-note">
        <span aria-hidden="true">🔒</span>
        <div>
          <b>De-identified view:</b> Real names, emails, and individual lab values are never shown here. Only usernames, public IDs, teams, and aggregate NHLS scores are displayed.
        </div>
      </div>

      {/* Org header */}
      <div className="em-head">
        <div>
          <h2>{data.org.name}</h2>
          <div className="em-meta">
            <span className="em-chip">{members.length} member{members.length !== 1 ? 's' : ''}</span>
            {avgBhas !== null && <span className="em-chip">Org avg NHLS: {avgBhas}%</span>}
          </div>
        </div>
        {onNavigate && (
          <button className="em-btn primary" onClick={() => onNavigate(`leaderboard/${orgSlug}`)}>
            View Leaderboard
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="em-tabs" role="tablist">
        {(['members', 'analytics'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={activeTab === tab ? 'on' : ''}
            onClick={() => setActiveTab(tab)}
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
        <div className="em-teams">
          {teamBreakdown.filter(t => t.member_count > 0).map(({ team, member_count, avg_bhas_pct, optimal_pct }, idx) => {
            const tc = teamColor(idx, darkMode)
            return (
              <div key={team} className="em-team" style={{ background: tc.bg, color: tc.color }}>
                <div className="em-team-n">{team}</div>
                <div className="em-team-m">{member_count} member{member_count !== 1 ? 's' : ''}</div>
                <div className="em-team-v">{avg_bhas_pct !== null ? `${avg_bhas_pct}%` : '—'}</div>
                <div className="em-team-k">avg NHLS</div>
                {optimal_pct !== null && (
                  <div className="em-team-o">{optimal_pct}% at optimal</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Member table */}
      <div className="em-card">
        <div className="em-card-top">
          <h3>Members</h3>
          {filteredMembers.length > 0 && (
            <button className="em-btn primary sm" onClick={handleExportMembers}>
              Export CSV
            </button>
          )}
        </div>

        {/* Filter bar */}
        {members.length > 0 && (
          <>
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
                {allTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select
                className="em-select"
                aria-label="Filter by role"
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
              >
                <option value="">All roles</option>
                {allRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="em-range">
                <span>Min NHLS: <strong>{minBhas}%</strong></span>
                <input
                  type="range"
                  aria-label="Minimum NHLS percent"
                  min={0} max={100} step={5}
                  value={minBhas}
                  onChange={e => setMinBhas(Number(e.target.value))}
                />
              </div>
              {hasFilters && (
                <button
                  className="em-btn ghost sm"
                  onClick={() => { setSearchUsername(''); setFilterTeam(''); setFilterRole(''); setMinBhas(0) }}
                >
                  Clear
                </button>
              )}
            </div>
            {hasFilters && (
              <p className="em-showing">
                Showing {filteredMembers.length} of {members.length} members
              </p>
            )}
          </>
        )}

        {members.length === 0 ? (
          <p className="em-empty">No members in this organization yet.</p>
        ) : filteredMembers.length === 0 ? (
          <p className="em-empty">No members match the current filters.</p>
        ) : (
          <div className="em-tablewrap">
            <table className="em-table">
              <thead>
                <tr>
                  {([
                    ['username',     'Username'],
                    ['public_id',    'Public ID'],
                    ['team',         'Team'],
                    ['bhas_pct',     'NHLS Score'],
                    ['result_count', 'Results'],
                    ['role',         'Role'],
                    ['joined_at',    'Joined'],
                  ] as [typeof sortCol, string][]).map(([col, label]) => (
                    <th key={col} onClick={() => toggleSort(col)}>
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
                    <tr key={i}>
                      <td className="em-user">
                        {m.username || <em className="em-nodata">not set</em>}
                      </td>
                      <td className="em-mono">{m.public_id || '—'}</td>
                      <td>
                        {m.team && tc ? (
                          <span className="em-pill" style={{ background: tc.bg, color: tc.color }}>{m.team}</span>
                        ) : <span className="em-nodata">—</span>}
                      </td>
                      <td><BhasBadge pct={m.bhas_pct} /></td>
                      <td className="muted">{m.result_count}</td>
                      <td><span className={`em-role${m.role === 'admin' ? ' admin' : ''}`}>{m.role}</span></td>
                      <td className="muted nw">
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
  const [reportOpen, setReportOpen] = useState(false)

  if (loading) {
    return <div className="em-loading">Loading analytics…</div>
  }
  if (error) {
    return <div className="em-err">{error}</div>
  }
  if (!data) return null

  const { kpis, score_distribution, label_distribution, trend, metric_breakdown } = data
  const hasScoreData = kpis.members_with_data > 0

  // KPI tiles
  const kpiTiles = [
    { label: 'Total Members',     value: String(kpis.total_members) },
    { label: 'Members with Data', value: String(kpis.members_with_data) },
    { label: 'Avg NHLS %',        value: kpis.avg_bhas_pct !== null ? `${kpis.avg_bhas_pct}%` : '—' },
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

  const labelTone = (label: string) =>
    label === 'Optimal' ? 'optimal'
    : label === 'Healthy' ? 'healthy'
    : label === 'Needs Improvement' ? 'needs'
    : label === 'High Risk' ? 'risk'
    : 'none'

  return (
    <>
      {/* Insurance Report button */}
      {data && (
        <div className="em-actions">
          <button className="em-btn ghost" onClick={() => setReportOpen(true)}>
            Generate Insurance Report
          </button>
        </div>
      )}

      {/* KPI tiles */}
      <div className="em-kpis">
        {kpiTiles.map(({ label, value }) => (
          <div key={label} className="em-kpi">
            <div className="em-kpi-v">{value}</div>
            <div className="em-kpi-k">{label}</div>
          </div>
        ))}
      </div>

      {!hasScoreData && (
        <div className="em-card" style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          No NHLS score data yet for this organization. Members need to calculate their score on the Dashboard for analytics to populate.
        </div>
      )}

      {hasScoreData && (<>

        {/* NHLS Score Distribution */}
        <div className="em-card">
          <h3>NHLS Score Distribution</h3>
          <div className="em-chartwrap">
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
        </div>

        {/* BHAS v2 Label Distribution */}
        <div className="em-card">
          <h3 style={{ marginBottom: 14 }}>Health Label Distribution</h3>
          <div className="em-labels">
            {label_distribution.map(({ label, count }) => (
              <div key={label} className={`em-label ${labelTone(label)}`}>
                <b>{count}</b>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 12-Week Trend */}
        {trend.length > 0 && (
          <div className="em-card">
            <h3>Org NHLS Trend — Last 12 Weeks</h3>
            <p className="em-sub">Weekly average NHLS % across members with data</p>
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
                    name === 'avg_score' ? 'Avg NHLS' : 'Members',
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
          <div className="em-card">
            <h3>Per-Metric % at Optimal</h3>
            <p className="em-sub">Percentage of members with data scoring Optimal on each NHLS metric</p>
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

      {/* Insurance Report Modal */}
      {reportOpen && data && (
        <InsuranceReportModal
          data={data}
          onClose={() => setReportOpen(false)}
          theme={theme}
        />
      )}
    </>
  )
}
