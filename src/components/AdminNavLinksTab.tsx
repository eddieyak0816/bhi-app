import React, { useState, useEffect } from 'react'

interface NavLink {
  id: string
  label: string
  url: string
  sort_order: number
  is_active: boolean
  group_label: string
}

interface Props { theme: any }

const DEFAULT_GROUP = '25% Off Supplements'
const EMPTY = { label: '', url: '', group_label: DEFAULT_GROUP }

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

  // Existing group names, for the "pick or type a new one" suggestion list
  const existingGroups = Array.from(new Set(links.map(l => l.group_label))).sort()

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setShowForm(true) }
  function openEdit(l: NavLink) { setEditing(l); setForm({ label: l.label, url: l.url, group_label: l.group_label }); setShowForm(true) }

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
    if (!form.group_label.trim()) { setError('Menu name is required — this is the dropdown title shown in the header.'); return }
    setSaving(true); setError(null)
    const h = authHeaders()
    const body = { label: form.label.trim(), url: ensureProtocol(form.url), group_label: form.group_label.trim() }
    try {
      if (editing) {
        const res = await fetch(apiUrl(`/api/admin/nav-links/${editing.id}`), { method: 'PATCH', headers: h, body: JSON.stringify(body) })
        if (!res.ok) throw new Error('Update failed')
      } else {
        // New links go to the end of their group by default
        const groupLinks = links.filter(l => l.group_label === body.group_label)
        const nextOrder = groupLinks.length > 0 ? Math.max(...groupLinks.map(l => l.sort_order)) + 1 : 0
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
    if (!confirm('Remove this link? If it\'s the last link in its menu, that whole dropdown will disappear from the nav.')) return
    const h = authHeaders()
    await fetch(apiUrl(`/api/admin/nav-links/${id}`), { method: 'DELETE', headers: h })
    setLinks(ls => ls.filter(l => l.id !== id))
  }

  async function toggleActive(l: NavLink) {
    const h = authHeaders()
    await fetch(apiUrl(`/api/admin/nav-links/${l.id}`), { method: 'PATCH', headers: h, body: JSON.stringify({ is_active: !l.is_active }) })
    setLinks(ls => ls.map(x => x.id === l.id ? { ...x, is_active: !x.is_active } : x))
  }

  // Swap sort_order with the neighbor above/below *within the same group* and persist both —
  // simple reorder, no drag-and-drop library needed for a short list like this.
  async function move(group: string, indexInGroup: number, direction: -1 | 1) {
    const groupLinks = links.filter(l => l.group_label === group)
    const target = indexInGroup + direction
    if (target < 0 || target >= groupLinks.length) return
    const a = groupLinks[indexInGroup]
    const b = groupLinks[target]
    const h = authHeaders()
    setLinks(ls => ls.map(x => {
      if (x.id === a.id) return { ...x, sort_order: b.sort_order }
      if (x.id === b.id) return { ...x, sort_order: a.sort_order }
      return x
    }))
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

  // Group links by their dropdown menu name, in the order each group first appears (by sort_order)
  const groups: { name: string; items: NavLink[] }[] = []
  for (const l of links.slice().sort((a, b) => a.sort_order - b.sort_order)) {
    let g = groups.find(g => g.name === l.group_label)
    if (!g) { g = { name: l.group_label, items: [] }; groups.push(g) }
    g.items.push(l)
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>Nav Links</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted }}>
            Manages the dropdown menus in the top nav (e.g. "25% Off Supplements"). A dropdown only shows up in the
            header once it has at least one active link — type a new menu name below to start a brand new dropdown,
            no separate setup needed. Independent from Affiliate Products — removing a link here doesn't touch the
            product catalog, and vice versa.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
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
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Menu Name * (the dropdown button text in the header)</label>
            <input
              style={inputStyle}
              list="nav-link-groups"
              value={form.group_label}
              onChange={e => setForm(f => ({ ...f, group_label: e.target.value }))}
              placeholder="e.g. 25% Off Supplements, or type a new menu name"
            />
            <datalist id="nav-link-groups">
              {existingGroups.map(g => <option key={g} value={g} />)}
            </datalist>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
              Pick an existing menu to add this link to it, or type a brand-new name to create a new dropdown.
            </div>
          </div>
          <div className="admin-two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div>
              <label style={labelStyle}>Link Label *</label>
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

      {groups.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          No nav links yet. Click + Add Link to create one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groups.map(group => {
            const anyActive = group.items.some(l => l.is_active)
            return (
              <div key={group.name}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14, fontWeight: 700, color: theme.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {group.name}
                  {!anyActive && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#b91c1c', background: '#fee2e2', borderRadius: 4, padding: '2px 6px' }}>
                      Hidden — no active links
                    </span>
                  )}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.items.map((l, i) => (
                    <div key={l.id} className="admin-item-card-row" style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', opacity: l.is_active ? 1 : 0.55 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                        <button onClick={() => move(group.name, i, -1)} disabled={i === 0} title="Move up" style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 4, width: 24, height: 20, cursor: i === 0 ? 'default' : 'pointer', color: theme.text, opacity: i === 0 ? 0.3 : 1, fontSize: 11, lineHeight: 1 }}>▲</button>
                        <button onClick={() => move(group.name, i, 1)} disabled={i === group.items.length - 1} title="Move down" style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 4, width: 24, height: 20, cursor: i === group.items.length - 1 ? 'default' : 'pointer', color: theme.text, opacity: i === group.items.length - 1 ? 0.3 : 1, fontSize: 11, lineHeight: 1 }}>▼</button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{l.label}</div>
                        <div style={{ fontSize: 12, color: theme.textMuted, wordBreak: 'break-all' }}>{l.url}</div>
                        {!l.is_active && <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Inactive</span>}
                      </div>
                      <div className="admin-item-card-buttons" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => openEdit(l)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: theme.text }}>Edit</button>
                        <button onClick={() => toggleActive(l)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: theme.textMuted }}>{l.is_active ? 'Deactivate' : 'Activate'}</button>
                        <button onClick={() => handleDelete(l.id)} style={{ background: 'transparent', border: '1px solid #fca5a5', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#b91c1c' }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
