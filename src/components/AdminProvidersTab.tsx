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
  org_id: string | null
  is_active: boolean
}

interface Org { id: string; name: string }
interface Props { theme: any }

const EMPTY: Omit<Provider, 'id' | 'is_active'> = {
  name: '', title: '', specialty: '', brief_bio: '', full_bio: '', link_url: '', image_url: '', org_id: null,
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
      setProviders(provData.providers || [])
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
    setForm({ name: p.name, title: p.title ?? '', specialty: p.specialty ?? '', brief_bio: p.brief_bio, full_bio: p.full_bio ?? '', link_url: p.link_url ?? '', image_url: p.image_url ?? '', org_id: p.org_id })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.brief_bio.trim()) { setError('Name and brief bio are required.'); return }
    setSaving(true); setError(null)
    const h = authHeaders()
    const body = { ...form, org_id: form.org_id || null }
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
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>Virtual Providers</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted }}>Telehealth and health navigation provider cards shown to members.</p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add Provider
        </button>
      </div>

      {/* Org filter */}
      {orgs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: theme.textMuted, fontWeight: 600 }}>Filter by org:</span>
          <select
            value={filterOrgId}
            onChange={e => setFilterOrgId(e.target.value)}
            style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 13, color: theme.text, cursor: 'pointer' }}
          >
            <option value="all">All providers</option>
            <option value="global">Global only</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>{editing ? 'Edit Provider' : 'New Provider'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. Jane Smith" />
            </div>
            <div>
              <label style={labelStyle}>Title / Credentials</label>
              <input style={inputStyle} value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="MD, NP, Health Coach…" />
            </div>
            <div>
              <label style={labelStyle}>Specialty</label>
              <input style={inputStyle} value={form.specialty ?? ''} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Metabolic Health, Nutrition…" />
            </div>
            <div>
              <label style={labelStyle}>Organization (leave blank = global)</label>
              <select style={inputStyle} value={form.org_id ?? ''} onChange={e => setForm(f => ({ ...f, org_id: e.target.value || null }))}>
                <option value="">All members (global)</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Brief Bio * (shown on card — 1-2 sentences)</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} value={form.brief_bio} onChange={e => setForm(f => ({ ...f, brief_bio: e.target.value }))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Full Bio (shown when expanded)</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 96 }} value={form.full_bio ?? ''} onChange={e => setForm(f => ({ ...f, full_bio: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Booking / Telehealth URL</label>
              <input style={inputStyle} value={form.link_url ?? ''} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="https://…" />
            </div>
            <div>
              <label style={labelStyle}>Headshot URL (optional)</label>
              <input style={inputStyle} value={form.image_url ?? ''} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Provider'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: theme.text }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider list */}
      {(() => {
        const filtered = providers.filter(p => {
          if (filterOrgId === 'all') return true
          if (filterOrgId === 'global') return p.org_id === null
          return p.org_id === filterOrgId
        })
        return filtered.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          {providers.length === 0 ? 'No providers yet. Click + Add Provider to create one.' : 'No providers match the selected filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(p => (
            <div key={p.id} style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start', opacity: p.is_active ? 1 : 0.55 }}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: theme.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: theme.textMuted }}>{p.name.charAt(0)}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{p.name}{p.title ? `, ${p.title}` : ''}</div>
                {p.specialty && <div style={{ fontSize: 12, color: theme.textMuted }}>{p.specialty}</div>}
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{p.brief_bio}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                  {p.org_id ? `Org-specific · ${orgs.find(o => o.id === p.org_id)?.name ?? p.org_id}` : 'Global (all members)'}
                  {!p.is_active && <span style={{ marginLeft: 8, color: '#b91c1c', fontWeight: 600 }}>Inactive</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(p)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: theme.text }}>Edit</button>
                <button onClick={() => toggleActive(p)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: theme.textMuted }}>{p.is_active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'transparent', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#b91c1c' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )
      })()}
    </div>
  )
}
