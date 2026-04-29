import React, { useState, useEffect } from 'react'

interface League { id: string; name: string; slug: string; starts_at: string; ends_at: string; is_active: boolean }
interface Org { id: string; name: string; slug: string }
interface LeagueOrg { league_id: string; org_id: string }

interface Props { theme: any }

export default function AdminLeaguesTab({ theme }: Props) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [leagueOrgs, setLeagueOrgs] = useState<LeagueOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', starts_at: '', ends_at: '' })
  const [saving, setSaving] = useState(false)
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  const DEV_BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }
  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (DEV_BACKEND_KEY) h['x-backend-api-key'] = DEV_BACKEND_KEY
    return h
  }

  async function load() {
    setLoading(true)
    const adminH = DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}
    try {
      const [lRes, oRes] = await Promise.all([
        fetch(apiUrl('/api/leagues'), { headers: adminH }),
        fetch(apiUrl('/api/admin/organizations'), { headers: adminH }),
      ])
      const lData = lRes.ok ? await lRes.json() : { leagues: [] }
      // /api/admin/organizations returns a plain array
      const oData = oRes.ok ? await oRes.json() : []
      setLeagues(lData.leagues || [])
      setOrgs(Array.isArray(oData) ? oData : (oData.organizations || []))
    } catch {
      setError('Failed to load leagues.')
    } finally {
      setLoading(false)
    }
  }

  // Load league→org assignments from server for all leagues
  async function loadLeagueOrgs(leagueId: string) {
    const h = DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}
    const res = await fetch(apiUrl(`/api/admin/leagues/${leagueId}/orgs`), { headers: h })
    if (res.ok) {
      const data = await res.json()
      const newEntries: LeagueOrg[] = (data.orgs || []).map((o: Org) => ({ league_id: leagueId, org_id: o.id }))
      setLeagueOrgs(prev => [...prev.filter(lo => lo.league_id !== leagueId), ...newEntries])
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.name || !form.slug || !form.starts_at || !form.ends_at) { setError('All fields required.'); return }
    setSaving(true)
    try {
      const res = await fetch(apiUrl('/api/admin/leagues'), {
        method: 'POST', headers: authHeaders(), body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Create failed') }
      setShowForm(false); setForm({ name: '', slug: '', starts_at: '', ends_at: '' })
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleOrgInLeague(leagueId: string, orgId: string, isIn: boolean) {
    const h = authHeaders()
    if (isIn) {
      await fetch(apiUrl(`/api/admin/leagues/${leagueId}/orgs/${orgId}`), { method: 'DELETE', headers: h })
      setLeagueOrgs(prev => prev.filter(lo => !(lo.league_id === leagueId && lo.org_id === orgId)))
    } else {
      const res = await fetch(apiUrl(`/api/admin/leagues/${leagueId}/orgs`), {
        method: 'POST', headers: h, body: JSON.stringify({ org_id: orgId }),
      })
      if (res.ok) setLeagueOrgs(prev => [...prev, { league_id: leagueId, org_id: orgId }])
    }
  }

  function handleExpand(leagueId: string) {
    if (expandedLeague === leagueId) { setExpandedLeague(null); return }
    setExpandedLeague(leagueId)
    loadLeagueOrgs(leagueId)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: theme.card, border: `1px solid ${theme.borderColor}`,
    borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 13, boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: 4 }

  if (loading) return <div style={{ padding: 32, color: theme.textMuted }}>Loading…</div>

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>League Management</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted }}>Create cross-organization competitive leagues. Expand a league to assign organizations.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New League
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
        </div>
      )}

      {showForm && (
        <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>New League</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div><label style={labelStyle}>League Name</label><input style={inputStyle} value={form.name} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, name: v, slug: v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })) }} placeholder="Northeast Challenge 2026" /></div>
            <div><label style={labelStyle}>Slug (URL-safe, auto-filled)</label><input style={inputStyle} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="northeast-2026" /></div>
            <div><label style={labelStyle}>Start Date</label><input type="date" style={inputStyle} value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} /></div>
            <div><label style={labelStyle}>End Date</label><input type="date" style={inputStyle} value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={handleCreate} disabled={saving} style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {saving ? 'Creating…' : 'Create League'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: theme.text }}>Cancel</button>
          </div>
        </div>
      )}

      {leagues.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No leagues yet. Create one above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leagues.map(league => {
            const isExpanded = expandedLeague === league.id
            const assignedOrgIds = leagueOrgs.filter(lo => lo.league_id === league.id).map(lo => lo.org_id)
            return (
              <div key={league.id} style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleExpand(league.id)}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{league.name}</div>
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      {new Date(league.starts_at).toLocaleDateString()} – {new Date(league.ends_at).toLocaleDateString()} · slug: <code>{league.slug}</code>
                    </div>
                  </div>
                  <span style={{ color: theme.blue ?? '#3B82F6', fontSize: 13 }}>{isExpanded ? '▲ Collapse' : '▼ Manage orgs'}</span>
                </div>
                {isExpanded && (
                  <div style={{ borderTop: `1px solid ${theme.borderColor}`, padding: '14px 18px', background: theme.bgSecondary }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 10, textTransform: 'uppercase' }}>Organizations in this League</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {orgs.map(org => {
                        const inLeague = assignedOrgIds.includes(org.id)
                        return (
                          <button
                            key={org.id}
                            onClick={() => toggleOrgInLeague(league.id, org.id, inLeague)}
                            style={{
                              background: inLeague ? theme.blue ?? '#3B82F6' : theme.card,
                              color: inLeague ? '#fff' : theme.text,
                              border: `1px solid ${inLeague ? theme.blue ?? '#3B82F6' : theme.borderColor}`,
                              borderRadius: 6, padding: '5px 12px', fontSize: 13, fontWeight: inLeague ? 600 : 400, cursor: 'pointer',
                            }}
                          >
                            {org.name} {inLeague ? '✓' : '+'}
                          </button>
                        )
                      })}
                      {orgs.length === 0 && <span style={{ color: theme.textMuted, fontSize: 13 }}>No organizations yet.</span>}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
