import React, { useState, useEffect } from 'react'

interface UserRow { id: string; email: string; username: string | null; role: string }

interface Props { theme: any; isSuperAdmin?: boolean }

// Normalize legacy 'user' role (stored before broker migration) to 'member' for display
function normalizeRole(role: string) { return role === 'user' ? 'member' : role }

const ROLES = ['member', 'broker', 'admin'] as const

export default function AdminUsersTab({ theme, isSuperAdmin }: Props) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', role: 'member', username: '' })
  const [saving, setSaving] = useState(false)
  const [roleChanging, setRoleChanging] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  const DEV_BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
  function apiUrl(path: string) { return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path }
  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (DEV_BACKEND_KEY) h['x-backend-api-key'] = DEV_BACKEND_KEY
    return h
  }

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/users'), { headers: { 'x-backend-api-key': DEV_BACKEND_KEY } })
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : (data.users || []))
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.email || !form.password) { setError('Email and password are required.'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/users'), {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ email: form.email, password: form.password, role: form.role, username: form.username || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create user.'); return }
      setShowForm(false); setForm({ email: '', password: '', role: 'member', username: '' })
      await load()
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setRoleChanging(userId)
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/role`), {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      else { const d = await res.json(); setError(d.error || `Failed to update role. ${d.detail || ''}`) }
    } catch {
      setError('Network error.')
    } finally {
      setRoleChanging(null)
    }
  }

  async function handleDelete(userId: string, email: string) {
    if (!window.confirm(`Permanently delete user "${email}"? This cannot be undone.`)) return
    setDeleting(userId)
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}`), {
        method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ confirm: 'DELETE' }),
      })
      if (res.ok) { await load() }
      else { const d = await res.json(); setError(d.error || `Failed to delete user. ${d.detail || ''}`) }
    } catch {
      setError('Network error.')
    } finally {
      setDeleting(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: theme.card, border: `1px solid ${theme.borderColor}`,
    borderRadius: 6, padding: '7px 10px', color: theme.text, fontSize: 13, boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: theme.textMuted, display: 'block', marginBottom: 4 }
  const roleBadge = (role: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
    background: role === 'admin' ? '#7c3aed22' : role === 'broker' ? '#0369a122' : '#16a34a22',
    color: role === 'admin' ? '#7c3aed' : role === 'broker' ? '#0369a1' : '#16a34a',
    border: `1px solid ${role === 'admin' ? '#7c3aed44' : role === 'broker' ? '#0369a144' : '#16a34a44'}`,
  })

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || (u.email || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || u.role.includes(q)
  })

  if (loading) return <div style={{ padding: 32, color: theme.textMuted }}>Loading…</div>

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>User Management</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted }}>Create accounts and assign roles. To make someone a broker, create their account here with role = Broker.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + New User
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', color: '#b91c1c', marginBottom: 16, fontSize: 13 }}>
          {error} <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>✕</button>
        </div>
      )}

      {showForm && (
        <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: '20px 24px', marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>Create New User</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" /></div>
            <div><label style={labelStyle}>Password</label><input style={inputStyle} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>
            <div>
              <label style={labelStyle}>Role</label>
              <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="broker">Broker</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div><label style={labelStyle}>Username (optional)</label><input style={inputStyle} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="jsmith" /></div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={handleCreate} disabled={saving} style={{ background: theme.blue ?? '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: theme.text }}>Cancel</button>
          </div>
        </div>
      )}

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by email, username, or role…"
        style={{ ...inputStyle, width: 280, marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, padding: 32, textAlign: 'center', color: theme.textMuted }}>
          {search ? 'No users match your search.' : 'No users yet.'}
        </div>
      ) : (
        <div style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.borderColor}`, background: theme.bgSecondary }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Email</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Username</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Role</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: theme.textMuted, textTransform: 'uppercase' }}>Change Role</th>
                {isSuperAdmin && <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Delete</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${theme.borderColor}` : 'none' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: theme.text }}>{u.email || <span style={{ color: theme.textMuted }}>—</span>}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: theme.textMuted }}>{u.username || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><span style={roleBadge(normalizeRole(u.role))}>{normalizeRole(u.role)}</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={normalizeRole(u.role)}
                      disabled={roleChanging === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      style={{ padding: '5px 8px', borderRadius: 6, border: `1px solid ${theme.borderColor}`, background: theme.bgInput || theme.bg, color: theme.text, fontSize: 12, cursor: 'pointer' }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleChanging === u.id && <span style={{ marginLeft: 8, fontSize: 11, color: theme.textMuted }}>Saving…</span>}
                  </td>
                  {isSuperAdmin && (
                    <td style={{ padding: '12px 16px' }}>
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={deleting === u.id}
                        style={{ background: 'transparent', border: '1px solid #dc2626', borderRadius: 6, padding: '4px 10px', fontSize: 12, color: '#dc2626', cursor: 'pointer', opacity: deleting === u.id ? 0.5 : 1 }}
                      >
                        {deleting === u.id ? '…' : 'Delete'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
