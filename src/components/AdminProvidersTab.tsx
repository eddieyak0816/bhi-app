import React, { useState, useEffect } from 'react'

interface Provider {
  id: string
  name: string
  title: string | null
  specialty: string | null
  brief_bio: string
  full_bio: string | null
  link_url: string | null
  image_url: string | null
  org_ids: string[] // empty = global (visible to everyone)
  is_active: boolean
}

interface Org { id: string; name: string }
interface Props { theme: any }

const EMPTY: Omit<Provider, 'id' | 'is_active'> = {
  name: '', title: '', specialty: '', brief_bio: '', full_bio: '', link_url: '', image_url: '', org_ids: [],
}

export default function AdminProvidersTab({ theme }: Props) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [filterOrgId, setFilterOrgId] = useState<string>('all')

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
    const h = DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}
    try {
      const [provRes, orgsRes] = await Promise.all([
        fetch(apiUrl('/api/admin/providers'), { headers: h }),
        fetch(apiUrl('/api/admin/organizations'), { headers: h }),
      ])
      const provData = provRes.ok ? await provRes.json() : { providers: [] }
      // /api/admin/organizations returns a plain array
      const orgsRaw = orgsRes.ok ? await orgsRes.json() : []
      setProviders((provData.providers || []).map((p: any) => ({ ...p, org_ids: p.org_ids || [] })))
      setOrgs(Array.isArray(orgsRaw) ? orgsRaw : (orgsRaw.organizations || []))
    } catch {
      setError('Failed to load providers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setShowForm(true) }
  function openEdit(p: Provider) {
    setEditing(p)
    setForm({ name: p.name, title: p.title ?? '', specialty: p.specialty ?? '', brief_bio: p.brief_bio, full_bio: p.full_bio ?? '', link_url: p.link_url ?? '', image_url: p.image_url ?? '', org_ids: p.org_ids || [] })
    setShowForm(true)
  }

  function toggleFormOrg(orgId: string) {
    setForm(f => ({
      ...f,
      org_ids: f.org_ids.includes(orgId) ? f.org_ids.filter(id => id !== orgId) : [...f.org_ids, orgId],
    }))
  }

  // If a URL is missing "http://" or "https://", the browser treats it as a path inside
  // this app instead of an outside link (e.g. clicking it 404s on our own domain).
  // Auto-add https:// so admins don't have to remember to type it themselves.
  function ensureProtocol(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  async function handleSave() {
    if (!form.name.trim() || !form.brief_bio.trim()) { setError('Name and brief bio are required.'); return }
    setSaving(true); setError(null)
    const h = authHeaders()
    const body = {
      ...form,
      link_url: form.link_url ? ensureProtocol(form.link_url) : form.link_url,
      image_url: form.image_url ? ensureProtocol(form.image_url) : form.image_url,
    }
    try {
      if (editing) {
        const res = await fetch(apiUrl(`/api/admin/providers/${editing.id}`), { method: 'PATCH', headers: h, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Update failed')
      } else {
        const res = await fetch(apiUrl('/api/admin/providers'), { method: 'POST', headers: h, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Create failed')
      }
      setShowForm(false); await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this provider?')) return
    const h = authHeaders()
    await fetch(apiUrl(`/api/admin/providers/${id}`), { method: 'DELETE', headers: h })
    setProviders(ps => ps.filter(p => p.id !== id))
  }

  async function toggleActive(p: Provider) {
    const h = authHeaders()
    await fetch(apiUrl(`/api/admin/providers/${p.id}`), { method: 'PATCH', headers: h, body: JSON.stringify({ is_active: !p.is_active }) })
    setProviders(ps => ps.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x))
  }

  if (loading) return <div className="adm-hint" style={{ padding: 32 }}>Loading…</div>

  return (
    <div>
      <div className="adm-bar">
        <div>
          <h3 className="adm-panel-h" style={{ margin: 0 }}>Virtual Providers</h3>
          <p className="adm-hint" style={{ margin: '4px 0 0' }}>Telehealth and health navigation provider cards shown to members.</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary"
        >
          + Add Provider
        </button>
      </div>

      {/* Org filter */}
      {orgs.length > 0 && (
        <div className="adm-launch">
          <span className="adm-hint" style={{ fontWeight: 700 }}>Filter by org:</span>
          <select
            value={filterOrgId}
            onChange={e => setFilterOrgId(e.target.value)}
            className="adm-in adm-in-compact" style={{ width: 'auto' }}
          >
            <option value="all">All providers</option>
            <option value="global">Global only</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div className="adm-err">
          {error} <button onClick={() => setError(null)} className="adm-err-x">✕</button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div className="adm-panel">
          <h4 className="adm-panel-h">{editing ? 'Edit Provider' : 'New Provider'}</h4>
          <div className="admin-two-col-grid adm-two">
            <div>
              <label className="adm-lbl">Name *</label>
              <input className="adm-in adm-in-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label className="adm-lbl">Title / Credentials</label>
              <input className="adm-in adm-in-full" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="MD, NP, Health Coach…" />
            </div>
            <div className="adm-span">
              <label className="adm-lbl">Specialty</label>
              <input className="adm-in adm-in-full" value={form.specialty ?? ''} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Metabolic Health, Nutrition…" />
            </div>
            <div className="adm-span">
              <label className="adm-lbl">Organizations (check none = global, visible to everyone)</label>
              {orgs.length === 0 ? (
                <div className="adm-hint">No organizations exist yet.</div>
              ) : (
                <div className="adm-checkgrid">
                  {orgs.map(o => (
                    <label key={o.id} className="adm-checkrow">
                      <input type="checkbox" checked={form.org_ids.includes(o.id)} onChange={() => toggleFormOrg(o.id)} />
                      {o.name}
                    </label>
                  ))}
                </div>
              )}
              <div className="adm-hint" style={{ marginTop: 6 }}>
                {form.org_ids.length === 0 ? 'Global — visible to all members.' : `Visible to ${form.org_ids.length} selected organization${form.org_ids.length === 1 ? '' : 's'} only.`}
              </div>
            </div>
            <div className="adm-span">
              <label className="adm-lbl">Brief Bio * (shown on card — 1-2 sentences)</label>
              <textarea className="adm-in adm-in-full adm-ta" style={{ minHeight: 72 }} value={form.brief_bio} onChange={e => setForm(f => ({ ...f, brief_bio: e.target.value }))} />
            </div>
            <div className="adm-span">
              <label className="adm-lbl">Full Bio (shown when expanded)</label>
              <textarea className="adm-in adm-in-full adm-ta" style={{ minHeight: 120 }} value={form.full_bio ?? ''} onChange={e => setForm(f => ({ ...f, full_bio: e.target.value }))} />
            </div>
            <div>
              <label className="adm-lbl">Booking / Telehealth URL</label>
              <input className="adm-in adm-in-full" value={form.link_url ?? ''} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div>
              <label className="adm-lbl">Headshot URL (optional)</label>
              <input className="adm-in adm-in-full" value={form.image_url ?? ''} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" />
            </div>
          </div>
          <div className="adm-urlrow" style={{ marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Provider'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider list */}
      {(() => {
        const filtered = providers.filter(p => {
          if (filterOrgId === 'all') return true
          if (filterOrgId === 'global') return p.org_ids.length === 0
          return p.org_ids.includes(filterOrgId)
        })
        return filtered.length === 0 ? (
        <div className="adm-empty">
          {providers.length === 0 ? 'No providers yet. Click + Add Provider to create one.' : 'No providers match the selected filter.'}
        </div>
      ) : (
        <div className="adm-orglist">
          {filtered.map(p => (
            <div key={p.id} className="admin-item-card-row adm-item" style={{ opacity: p.is_active ? 1 : 0.55 }}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="adm-avatar" />
              ) : (
                <div className="adm-avatar">{p.name.charAt(0)}</div>
              )}
              <div className="adm-item-main">
                <div className="adm-item-n">{p.name}{p.title ? `, ${p.title}` : ''}</div>
                {p.specialty && <div className="adm-hint">{p.specialty}</div>}
                <div className="adm-hint" style={{ marginTop: 4 }}>{p.brief_bio}</div>
                <div className="adm-hint" style={{ marginTop: 6 }}>
                  {p.org_ids.length > 0
                    ? `Org-specific · ${p.org_ids.map(id => orgs.find(o => o.id === id)?.name ?? id).join(', ')}`
                    : 'Global (all members)'}
                  {!p.is_active && <span className="adm-pill" style={{ marginLeft: 8 }}>Inactive</span>}
                </div>
              </div>
              <div className="admin-item-card-buttons adm-item-btns row">
                <button onClick={() => openEdit(p)} className="adm-cbtn">Edit</button>
                <button onClick={() => toggleActive(p)} className="adm-cbtn">{p.is_active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => handleDelete(p.id)} className="adm-cbtn del">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )
      })()}
    </div>
  )
}
