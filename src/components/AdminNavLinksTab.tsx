import React, { useState, useEffect } from 'react'

interface NavLink {
  id: string
  label: string
  url: string
  sort_order: number
  is_active: boolean
}

interface Props { theme: any }

const EMPTY = { label: '', url: '' }

export default function AdminNavLinksTab({ theme }: Props) {
  const [links, setLinks] = useState<NavLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NavLink | null>(null)
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY })
  const [saving, setSaving] = useState(false)

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
      const res = await fetch(apiUrl('/api/admin/nav-links'), { headers: h })
      const data = res.ok ? await res.json() : { links: [] }
      setLinks((data.links || []).slice().sort((a: NavLink, b: NavLink) => a.sort_order - b.sort_order))
    } catch {
      setError('Failed to load nav links.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setShowForm(true) }
  function openEdit(l: NavLink) { setEditing(l); setForm({ label: l.label, url: l.url }); setShowForm(true) }

  // If a URL is missing "http://" or "https://", the browser treats it as a path inside
  // this app instead of an outside link (same trap that broke the provider "Book/Connect" link).
  // Auto-add https:// so admins don't have to remember to type it themselves.
  function ensureProtocol(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  async function handleSave() {
    if (!form.label.trim() || !form.url.trim()) { setError('Label and URL are required.'); return }
    setSaving(true); setError(null)
    const h = authHeaders()
    const body = { label: form.label.trim(), url: ensureProtocol(form.url) }
    try {
      if (editing) {
        const res = await fetch(apiUrl(`/api/admin/nav-links/${editing.id}`), { method: 'PATCH', headers: h, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Update failed')
      } else {
        // New links go to the end of the list by default
        const nextOrder = links.length > 0 ? Math.max(...links.map(l => l.sort_order)) + 1 : 0
        const res = await fetch(apiUrl('/api/admin/nav-links'), { method: 'POST', headers: h, body: JSON.stringify({ ...body, sort_order: nextOrder }) })
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
    if (!confirm('Remove this link from the nav dropdown?')) return
    const h = authHeaders()
    await fetch(apiUrl(`/api/admin/nav-links/${id}`), { method: 'DELETE', headers: h })
    setLinks(ls => ls.filter(l => l.id !== id))
  }

  async function toggleActive(l: NavLink) {
    const h = authHeaders()
    await fetch(apiUrl(`/api/admin/nav-links/${l.id}`), { method: 'PATCH', headers: h, body: JSON.stringify({ is_active: !l.is_active }) })
    setLinks(ls => ls.map(x => x.id === l.id ? { ...x, is_active: !x.is_active } : x))
  }

  // Swap sort_order with the neighbor above/below and persist both — simple reorder,
  // no drag-and-drop library needed for a short list like this.
  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= links.length) return
    const a = links[index]
    const b = links[target]
    const h = authHeaders()
    const reordered = links.slice()
    reordered[index] = { ...b, sort_order: a.sort_order }
    reordered[target] = { ...a, sort_order: b.sort_order }
    reordered.sort((x, y) => x.sort_order - y.sort_order)
    setLinks(reordered)
    await Promise.all([
      fetch(apiUrl(`/api/admin/nav-links/${a.id}`), { method: 'PATCH', headers: h, body: JSON.stringify({ sort_order: b.sort_order }) }),
      fetch(apiUrl(`/api/admin/nav-links/${b.id}`), { method: 'PATCH', headers: h, body: JSON.stringify({ sort_order: a.sort_order }) }),
    ])
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
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>Nav Links</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted }}>
            Links shown in the top nav dropdown (e.g. "25% Off Supplements"). Independent from Affiliate Products —
            removing a link here doesn't touch the product catalog, and vice versa.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add Link
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
        </div>
      )}

      {showForm && (
        <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>{editing ? 'Edit Link' : 'New Link'}</h4>
          <div className="admin-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div>
              <label style={labelStyle}>Label *</label>
              <input style={inputStyle} value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Fullscript" />
            </div>
            <div>
              <label style={labelStyle}>URL *</label>
              <input style={inputStyle} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Link'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: theme.text }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {links.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No nav links yet. Click + Add Link to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {links.map((l, i) => (
            <div key={l.id} className="admin-item-card-row" style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', opacity: l.is_active ? 1 : 0.55 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} title="Move up" style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 4, width: 24, height: 20, cursor: i === 0 ? 'default' : 'pointer', color: theme.text, opacity: i === 0 ? 0.3 : 1, fontSize: 11, lineHeight: 1 }}>▲</button>
                <button onClick={() => move(i, 1)} disabled={i === links.length - 1} title="Move down" style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 4, width: 24, height: 20, cursor: i === links.length - 1 ? 'default' : 'pointer', color: theme.text, opacity: i === links.length - 1 ? 0.3 : 1, fontSize: 11, lineHeight: 1 }}>▼</button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{l.label}</div>
                <div style={{ fontSize: 12, color: theme.textMuted, wordBreak: 'break-all' }}>{l.url}</div>
                {!l.is_active && <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Inactive — hidden from nav</span>}
              </div>
              <div className="admin-item-card-buttons" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => openEdit(l)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: theme.text }}>Edit</button>
                <button onClick={() => toggleActive(l)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: theme.textMuted }}>{l.is_active ? 'Deactivate' : 'Activate'}</button>
                <button onClick={() => handleDelete(l.id)} style={{ background: 'transparent', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#b91c1c' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
