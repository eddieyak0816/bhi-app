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

  if (loading) return <div className="adm-hint" style={{ padding: 32 }}>Loading…</div>

  return (
    <div>
      <div className="adm-bar">
        <div>
          <h3 className="adm-panel-h" style={{ margin: 0 }}>League Management</h3>
          <p className="adm-hint" style={{ margin: '4px 0 0' }}>Create cross-organization competitive leagues. Expand a league to assign organizations.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary">
          + New League
        </button>
      </div>

      {error && (
        <div className="adm-err">
          {error} <button onClick={() => setError(null)} className="adm-err-x">✕</button>
        </div>
      )}

      {showForm && (
        <div className="adm-panel">
          <h4 className="adm-panel-h">New League</h4>
          <div className="adm-two">
            <div><label className="adm-lbl">League Name</label><input className="adm-in adm-in-full" value={form.name} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, name: v, slug: v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })) }} placeholder="Northeast Challenge 2026" /></div>
            <div><label className="adm-lbl">Slug (URL-safe, auto-filled)</label><input className="adm-in adm-in-full" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="northeast-2026" /></div>
            <div><label className="adm-lbl">Start Date</label><input type="date" className="adm-in adm-in-full" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} /></div>
            <div><label className="adm-lbl">End Date</label><input type="date" className="adm-in adm-in-full" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></div>
          </div>
          <div className="adm-urlrow" style={{ marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create League'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {leagues.length === 0 ? (
        <div className="adm-empty">
          No leagues yet. Create one above.
        </div>
      ) : (
        <div className="adm-orglist" style={{ gap: 12 }}>
          {leagues.map(league => {
            const isExpanded = expandedLeague === league.id
            const assignedOrgIds = leagueOrgs.filter(lo => lo.league_id === league.id).map(lo => lo.org_id)
            return (
              <div key={league.id} className="adm-org">
                <div className="adm-org-h" style={{ cursor: 'pointer' }} onClick={() => handleExpand(league.id)}>
                  <div>
                    <div className="adm-item-n">{league.name}</div>
                    <div className="adm-hint" style={{ marginTop: 4 }}>
                      {new Date(league.starts_at).toLocaleDateString()} – {new Date(league.ends_at).toLocaleDateString()} · slug: <code>{league.slug}</code>
                    </div>
                  </div>
                  <span className="adm-link" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>{isExpanded ? '▲ Collapse' : '▼ Manage orgs'}</span>
                </div>
                {isExpanded && (
                  <div className="adm-org-body">
                    <div className="adm-k" style={{ marginBottom: 12 }}>Organizations in this League</div>
                    <div className="adm-wrap" style={{ marginBottom: 0 }}>
                      {orgs.map(org => {
                        const inLeague = assignedOrgIds.includes(org.id)
                        return (
                          <button
                            key={org.id}
                            onClick={() => toggleOrgInLeague(league.id, org.id, inLeague)}
                            className={`adm-orgbtn${inLeague ? ' on' : ''}`}
                          >
                            {org.name} {inLeague ? '✓' : '+'}
                          </button>
                        )
                      })}
                      {orgs.length === 0 && <span className="adm-hint">No organizations yet.</span>}
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
