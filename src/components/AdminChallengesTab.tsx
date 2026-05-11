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
  const inputStyle: React.CSSProperties = {
    padding: '7px 10px', borderRadius: 6, border: `1px solid ${t.borderColor}`,
    background: t.inputBackground ?? t.cardBackground, color: t.text, fontSize: 13, width: '100%', boxSizing: 'border-box',
  }
  const btnStyle = (primary?: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
    background: primary ? (t.blue ?? '#3b82f6') : t.borderColor, color: primary ? '#fff' : t.text,
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: t.text }}>Challenges</h2>
        <button style={btnStyle(true)} onClick={() => { setShowForm(s => !s); setFormError(null) }}>
          {showForm ? 'Cancel' : '+ New Challenge'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: t.cardBackground, border: `1px solid ${t.borderColor}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, color: t.text }}>New Challenge</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted }}>Name</label>
              <input style={inputStyle} value={form.name} onChange={e => handleNameChange(e.target.value, 'form')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted }}>Slug (auto-filled)</label>
              <input style={inputStyle} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted }}>Start Date</label>
              <input type="date" style={inputStyle} value={form.starts_at} onChange={e => handleStartChange(e.target.value, 'form')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted }}>End Date</label>
              <input type="date" style={inputStyle} value={form.ends_at} onChange={e => handleEndChange(e.target.value, 'form')} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted }}>Baseline Date <span style={{ color: t.textMuted, fontWeight: 400 }}>(auto = start date)</span></label>
              <input type="date" style={inputStyle} value={form.baseline_at} onChange={e => setForm(f => ({ ...f, baseline_at: e.target.value }))} required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: t.textMuted }}>Midpoint Date <span style={{ color: t.textMuted, fontWeight: 400 }}>(auto = halfway)</span></label>
              <input type="date" style={inputStyle} value={form.midpoint_at} onChange={e => setForm(f => ({ ...f, midpoint_at: e.target.value }))} required />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <input type="checkbox" id="form-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            <label htmlFor="form-active" style={{ fontSize: 13, color: t.text }}>Active</label>
          </div>
          {formError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{formError}</p>}
          <button type="submit" style={{ ...btnStyle(true), marginTop: 14 }} disabled={saving}>
            {saving ? 'Saving…' : 'Create Challenge'}
          </button>
        </form>
      )}

      {/* List */}
      {loading && <p style={{ color: t.textMuted }}>Loading…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}

      {challenges.map(c => {
        const orgNames = (c.org_ids || []).map(oid => orgs.find(o => o.id === oid)?.name || oid)
        const unassigned = orgs.filter(o => !(c.org_ids || []).includes(o.id))
        return (
          <div key={c.id} style={{ background: t.cardBackground, border: `1px solid ${t.borderColor}`, borderRadius: 10, padding: 18, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: t.textMuted }}>/{c.slug}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
                    background: c.is_active ? '#22c55e22' : '#64748b22',
                    color: c.is_active ? '#22c55e' : t.textMuted,
                  }}>{c.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                  {c.starts_at} → {c.ends_at} &nbsp;|&nbsp; Baseline: {c.baseline_at} &nbsp;|&nbsp; Midpoint: {c.midpoint_at}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button style={btnStyle()} onClick={() => handleToggle(c)} disabled={toggling === c.id}>
                  {toggling === c.id ? '…' : c.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button style={btnStyle(true)} onClick={() => openEdit(c)}>Edit</button>
                <button
                  style={{ ...btnStyle(), background: '#ef444422', color: '#ef4444' }}
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                >
                  {deletingId === c.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Orgs enrolled */}
            <div style={{ marginTop: 14, borderTop: `1px solid ${t.borderColor}`, paddingTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, marginBottom: 8 }}>Participating Orgs</div>
              {orgNames.length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>None assigned</span>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {orgNames.map((name, i) => (
                  <span key={c.org_ids[i]} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '3px 10px', borderRadius: 12, background: `${t.blue ?? '#3b82f6'}18`, color: t.blue ?? '#3b82f6' }}>
                    {name}
                    <button
                      onClick={() => handleRemoveOrg(c.id, c.org_ids[i])}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 700, fontSize: 13, lineHeight: 1, padding: 0 }}
                      title="Remove org"
                    >×</button>
                  </span>
                ))}
              </div>
              {unassigned.length > 0 && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select
                    style={{ ...inputStyle, width: 'auto', minWidth: 160 }}
                    value={assignOrgId}
                    onChange={e => setAssignOrgId(e.target.value)}
                  >
                    <option value="">Add org…</option>
                    {unassigned.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button style={btnStyle(true)} onClick={() => handleAssignOrg(c.id)} disabled={assigningId === c.id || !assignOrgId}>
                    {assigningId === c.id ? '…' : 'Add'}
                  </button>
                  {assignMsg[c.id] && <span style={{ fontSize: 12, color: '#22c55e' }}>{assignMsg[c.id]}</span>}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {!loading && challenges.length === 0 && (
        <p style={{ color: t.textMuted }}>No challenges yet. Create the first one above.</p>
      )}

      {/* Edit modal */}
      {editId && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleEdit} style={{ background: t.cardBackground, border: `1px solid ${t.borderColor}`, borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, color: t.text }}>Edit Challenge</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: t.textMuted }}>Name</label>
                <input style={inputStyle} value={editForm.name} onChange={e => handleNameChange(e.target.value, 'edit')} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t.textMuted }}>Slug</label>
                <input style={inputStyle} value={editForm.slug} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t.textMuted }}>Start Date</label>
                <input type="date" style={inputStyle} value={editForm.starts_at} onChange={e => handleStartChange(e.target.value, 'edit')} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t.textMuted }}>End Date</label>
                <input type="date" style={inputStyle} value={editForm.ends_at} onChange={e => handleEndChange(e.target.value, 'edit')} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t.textMuted }}>Baseline Date <span style={{ color: t.textMuted, fontWeight: 400 }}>(auto = start date)</span></label>
                <input type="date" style={inputStyle} value={editForm.baseline_at} onChange={e => setEditForm(f => ({ ...f, baseline_at: e.target.value }))} required />
              </div>
              <div>
                <label style={{ fontSize: 12, color: t.textMuted }}>Midpoint Date <span style={{ color: t.textMuted, fontWeight: 400 }}>(auto = halfway)</span></label>
                <input type="date" style={inputStyle} value={editForm.midpoint_at} onChange={e => setEditForm(f => ({ ...f, midpoint_at: e.target.value }))} required />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="checkbox" id="edit-active" checked={editForm.is_active} onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="edit-active" style={{ fontSize: 13, color: t.text }}>Active</label>
            </div>
            {editError && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{editError}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="submit" style={btnStyle(true)} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" style={btnStyle()} onClick={() => setEditId(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
