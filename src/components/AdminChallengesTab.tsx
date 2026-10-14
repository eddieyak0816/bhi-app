import React, { useState, useEffect } from 'react'

interface Challenge {
  id: string
  name: string
  slug: string
  starts_at: string
  ends_at: string
  baseline_at: string
  midpoint_at: string
  is_active: boolean
  created_at: string
  org_ids: string[]
}

interface OrgOption { id: string; name: string }

interface Props { theme: any }

const BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
const BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
function apiUrl(path: string) { return BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${path}` : path }
function authHeaders() { return { 'Content-Type': 'application/json', 'x-backend-api-key': BACKEND_KEY } }

const EMPTY_FORM = { name: '', slug: '', starts_at: '', ends_at: '', baseline_at: '', midpoint_at: '', is_active: true }

function autoSlug(name: string) { return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }

function midpoint(start: string, end: string): string {
  if (!start || !end) return ''
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (isNaN(s) || isNaN(e) || e <= s) return ''
  return new Date(Math.round((s + e) / 2)).toISOString().slice(0, 10)
}

export default function AdminChallengesTab({ theme }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Edit modal
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_FORM })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Org assignment
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignOrgId, setAssignOrgId] = useState('')
  const [assignMsg, setAssignMsg] = useState<Record<string, string>>({})

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Toggle
  const [toggling, setToggling] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const [chalRes, orgRes] = await Promise.all([
        fetch(apiUrl('/api/admin/challenges'), { headers: { 'x-backend-api-key': BACKEND_KEY } }),
        fetch(apiUrl('/api/admin/organizations'), { headers: { 'x-backend-api-key': BACKEND_KEY } }),
      ])
      const chalData = await chalRes.json()
      const orgData = await orgRes.json()
      setChallenges(Array.isArray(chalData) ? chalData : (chalData.challenges || []))
      setOrgs((Array.isArray(orgData) ? orgData : []).map((o: any) => ({ id: o.id, name: o.name })))
    } catch {
      setError('Failed to load challenges.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleNameChange(name: string, target: 'form' | 'edit') {
    if (target === 'form') setForm(f => ({ ...f, name, slug: autoSlug(name) }))
    else setEditForm(f => ({ ...f, name, slug: autoSlug(name) }))
  }

  function handleStartChange(starts_at: string, target: 'form' | 'edit') {
    if (target === 'form') {
      setForm(f => ({
        ...f,
        starts_at,
        baseline_at: starts_at,
        midpoint_at: midpoint(starts_at, f.ends_at),
      }))
    } else {
      setEditForm(f => ({
        ...f,
        starts_at,
        baseline_at: starts_at,
        midpoint_at: midpoint(starts_at, f.ends_at),
      }))
    }
  }

  function handleEndChange(ends_at: string, target: 'form' | 'edit') {
    if (target === 'form') {
      setForm(f => ({
        ...f,
        ends_at,
        midpoint_at: midpoint(f.starts_at, ends_at),
      }))
    } else {
      setEditForm(f => ({
        ...f,
        ends_at,
        midpoint_at: midpoint(f.starts_at, ends_at),
      }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setFormError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/challenges'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setForm({ ...EMPTY_FORM })
      setShowForm(false)
      await load()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(c: Challenge) {
    setEditId(c.id)
    setEditForm({ name: c.name, slug: c.slug, starts_at: c.starts_at, ends_at: c.ends_at, baseline_at: c.baseline_at, midpoint_at: c.midpoint_at, is_active: c.is_active })
    setEditError(null)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setEditSaving(true); setEditError(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/challenges/${editId}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      setEditId(null)
      await load()
    } catch (err: any) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this challenge? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await fetch(apiUrl(`/api/admin/challenges/${id}`), { method: 'DELETE', headers: { 'x-backend-api-key': BACKEND_KEY } })
      await load()
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggle(c: Challenge) {
    setToggling(c.id)
    try {
      await fetch(apiUrl(`/api/admin/challenges/${c.id}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ is_active: !c.is_active }),
      })
      await load()
    } finally {
      setToggling(null)
    }
  }

  async function handleAssignOrg(challengeId: string) {
    if (!assignOrgId) return
    setAssigningId(challengeId)
    try {
      const res = await fetch(apiUrl(`/api/admin/challenges/${challengeId}/orgs`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ org_id: assignOrgId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed')
      setAssignMsg(m => ({ ...m, [challengeId]: 'Org added.' }))
      setAssignOrgId('')
      await load()
    } catch (err: any) {
      setAssignMsg(m => ({ ...m, [challengeId]: err.message }))
    } finally {
      setAssigningId(null)
      setTimeout(() => setAssignMsg(m => ({ ...m, [challengeId]: '' })), 3000)
    }
  }

  async function handleRemoveOrg(challengeId: string, orgId: string) {
    try {
      await fetch(apiUrl(`/api/admin/challenges/${challengeId}/orgs/${orgId}`), {
        method: 'DELETE',
        headers: { 'x-backend-api-key': BACKEND_KEY },
      })
      await load()
    } catch { /* ignore */ }
  }

  const t = theme
  return (
    <div>
      <div className="adm-bar">
        <h2 className="adm-panel-h" style={{ margin: 0 }}>Challenges</h2>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setFormError(null) }}>
          {showForm ? 'Cancel' : '+ New Challenge'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="adm-panel">
          <h3 className="adm-panel-h">New Challenge</h3>
          <div className="adm-two">
            <div>
              <label className="adm-lbl">Name</label>
              <input className="adm-in adm-in-full" value={form.name} onChange={e => handleNameChange(e.target.value, 'form')} required />
            </div>
            <div>
              <label className="adm-lbl">Slug (auto-filled)</label>
              <input className="adm-in adm-in-full" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
            </div>
            <div>
              <label className="adm-lbl">Start Date</label>
              <input type="date" className="adm-in adm-in-full" value={form.starts_at} onChange={e => handleStartChange(e.target.value, 'form')} required />
            </div>
            <div>
              <label className="adm-lbl">End Date</label>
              <input type="date" className="adm-in adm-in-full" value={form.ends_at} onChange={e => handleEndChange(e.target.value, 'form')} required />
            </div>
            <div>
              <label className="adm-lbl">Baseline Date <span className="adm-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(auto = start date)</span></label>
              <input type="date" className="adm-in adm-in-full" value={form.baseline_at} onChange={e => setForm(f => ({ ...f, baseline_at: e.target.value }))} required />
            </div>
            <div>
              <label className="adm-lbl">Midpoint Date <span className="adm-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(auto = halfway)</span></label>
              <input type="date" className="adm-in adm-in-full" value={form.midpoint_at} onChange={e => setForm(f => ({ ...f, midpoint_at: e.target.value }))} required />
            </div>
          </div>
          <div className="adm-urlrow" style={{ alignItems: 'center', marginTop: 12 }}>
            <input type="checkbox" id="form-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            <label htmlFor="form-active" className="adm-strong">Active</label>
          </div>
          {formError && <p className="adm-errtxt">{formError}</p>}
          <button type="submit" className="btn-primary" style={{ marginTop: 14 }} disabled={saving}>
            {saving ? 'Saving…' : 'Create Challenge'}
          </button>
        </form>
      )}

      {/* List */}
      {loading && <p className="adm-hint">Loading…</p>}
      {error && <p className="adm-errtxt">{error}</p>}

      {challenges.map(c => {
        const orgNames = (c.org_ids || []).map(oid => orgs.find(o => o.id === oid)?.name || oid)
        const unassigned = orgs.filter(o => !(c.org_ids || []).includes(o.id))
        return (
          <div key={c.id} className="adm-broker" style={{ marginBottom: 16 }}>
            <div className="admin-item-card-row adm-org-h" style={{ padding: 0, alignItems: 'flex-start' }}>
              <div>
                <div className="adm-item-top">
                  <span className="adm-item-n">{c.name}</span>
                  <span className="adm-hint">/{c.slug}</span>
                  <span className={`adm-pill${c.is_active ? ' on' : ''}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="adm-hint" style={{ marginTop: 4 }}>
                  {c.starts_at} → {c.ends_at} &nbsp;|&nbsp; Baseline: {c.baseline_at} &nbsp;|&nbsp; Midpoint: {c.midpoint_at}
                </div>
              </div>
              <div className="admin-item-card-buttons adm-item-btns row">
                <button className="adm-cbtn" onClick={() => handleToggle(c)} disabled={toggling === c.id}>
                  {toggling === c.id ? '…' : c.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="adm-cbtn" onClick={() => openEdit(c)}>Edit</button>
                <button
                  className="adm-cbtn del"
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                >
                  {deletingId === c.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Orgs enrolled */}
            <div className="adm-section" style={{ marginTop: 14, marginBottom: 0 }}>
              <div className="adm-k" style={{ marginBottom: 10 }}>Participating Orgs</div>
              {orgNames.length === 0 && <span className="adm-hint">None assigned</span>}
              <div className="adm-wrap" style={{ marginBottom: 10 }}>
                {orgNames.map((name, i) => (
                  <span key={c.org_ids[i]} className="adm-chip tag">
                    {name}
                    <button
                      onClick={() => handleRemoveOrg(c.id, c.org_ids[i])}
                      className="adm-chip-x"
                      title="Remove org"
                    >×</button>
                  </span>
                ))}
              </div>
              {unassigned.length > 0 && (
                <div className="adm-urlrow" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="adm-in adm-in-compact" style={{ width: 'auto', minWidth: 180 }}
                    value={assignOrgId}
                    onChange={e => setAssignOrgId(e.target.value)}
                  >
                    <option value="">Add org…</option>
                    {unassigned.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button className="adm-sbtn pri" onClick={() => handleAssignOrg(c.id)} disabled={assigningId === c.id || !assignOrgId}>
                    {assigningId === c.id ? '…' : 'Add'}
                  </button>
                  {assignMsg[c.id] && <span className="adm-status ok">{assignMsg[c.id]}</span>}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {!loading && challenges.length === 0 && (
        <p className="adm-hint">No challenges yet. Create the first one above.</p>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="adm-mbg">
          <form onSubmit={handleEdit} className="adm-modal compact">
            <h3 className="adm-mtitle adm-mb16">Edit Challenge</h3>
            <div className="adm-two">
              <div>
                <label className="adm-lbl">Name</label>
                <input className="adm-in adm-in-full" value={editForm.name} onChange={e => handleNameChange(e.target.value, 'edit')} required />
              </div>
              <div>
                <label className="adm-lbl">Slug</label>
                <input className="adm-in adm-in-full" value={editForm.slug} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} required />
              </div>
              <div>
                <label className="adm-lbl">Start Date</label>
                <input type="date" className="adm-in adm-in-full" value={editForm.starts_at} onChange={e => handleStartChange(e.target.value, 'edit')} required />
              </div>
              <div>
                <label className="adm-lbl">End Date</label>
                <input type="date" className="adm-in adm-in-full" value={editForm.ends_at} onChange={e => handleEndChange(e.target.value, 'edit')} required />
              </div>
              <div>
                <label className="adm-lbl">Baseline Date <span className="adm-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(auto = start date)</span></label>
                <input type="date" className="adm-in adm-in-full" value={editForm.baseline_at} onChange={e => setEditForm(f => ({ ...f, baseline_at: e.target.value }))} required />
              </div>
              <div>
                <label className="adm-lbl">Midpoint Date <span className="adm-hint" style={{ textTransform: 'none', letterSpacing: 0 }}>(auto = halfway)</span></label>
                <input type="date" className="adm-in adm-in-full" value={editForm.midpoint_at} onChange={e => setEditForm(f => ({ ...f, midpoint_at: e.target.value }))} required />
              </div>
            </div>
            <div className="adm-urlrow" style={{ alignItems: 'center', marginTop: 12 }}>
              <input type="checkbox" id="edit-active" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="edit-active" className="adm-strong">Active</label>
            </div>
            {editError && <p className="adm-errtxt">{editError}</p>}
            <div className="adm-mfoot edit">
              <button type="submit" className="adm-mbtn primary" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" className="adm-mbtn ghost" onClick={() => setEditId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
