import React, { useState, useEffect } from 'react'

interface UserRow { id: string; email: string; username: string | null; role: string }
interface OrgRow { id: string; name: string }

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
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [orgAssigning, setOrgAssigning] = useState<string | null>(null)
  const [orgAssignMsg, setOrgAssignMsg] = useState<Record<string, string>>({})

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

  useEffect(() => { load(); loadOrgs() }, [])

  async function loadOrgs() {
    try {
      const res = await fetch(apiUrl('/api/admin/organizations'), { headers: { 'x-backend-api-key': DEV_BACKEND_KEY } })
      const data = await res.json()
      setOrgs((Array.isArray(data) ? data : []).map((o: any) => ({ id: o.id, name: o.name })))
    } catch { /* non-critical */ }
  }

  async function handleAssignOrg(userId: string, orgId: string) {
    if (!orgId) return
    setOrgAssigning(userId)
    setOrgAssignMsg(prev => ({ ...prev, [userId]: '' }))
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/members`), {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ user_id: userId, role: 'member' }),
      })
      const d = await res.json()
      if (res.status === 409) {
        setOrgAssignMsg(prev => ({ ...prev, [userId]: 'Already a member' }))
      } else if (!res.ok) {
        setOrgAssignMsg(prev => ({ ...prev, [userId]: d.error || 'Failed' }))
      } else {
        setOrgAssignMsg(prev => ({ ...prev, [userId]: 'Assigned' }))
        setTimeout(() => setOrgAssignMsg(prev => ({ ...prev, [userId]: '' })), 2500)
      }
    } catch {
      setOrgAssignMsg(prev => ({ ...prev, [userId]: 'Network error' }))
    } finally {
      setOrgAssigning(null)
    }
  }

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

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    return !q || (u.email || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q) || u.role.includes(q)
  })

  if (loading) return <div className="adm-hint" style={{ padding: 32 }}>Loading…</div>

  return (
    <div>
      <div className="adm-bar">
        <div>
          <h3 className="adm-panel-h" style={{ margin: 0 }}>User Management</h3>
          <p className="adm-hint" style={{ margin: '4px 0 0' }}>Create accounts and assign roles. To make someone a broker, create their account here with role = Broker.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary">
          + New User
        </button>
      </div>

      {error && (
        <div className="adm-err">
          {error} <button onClick={() => setError(null)} className="adm-err-x">✕</button>
        </div>
      )}

      {showForm && (
        <div className="adm-panel">
          <h4 className="adm-panel-h">Create New User</h4>
          <div className="adm-two">
            <div><label className="adm-lbl">Email</label><input className="adm-in adm-in-full" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@example.com" /></div>
            <div><label className="adm-lbl">Password</label><input className="adm-in adm-in-full" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>
            <div>
              <label className="adm-lbl">Role</label>
              <select className="adm-in adm-in-full" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="member">Member</option>
                <option value="broker">Broker</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div><label className="adm-lbl">Username (optional)</label><input className="adm-in adm-in-full" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="jsmith" /></div>
          </div>
          <div className="adm-urlrow" style={{ marginTop: 16 }}>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">
              {saving ? 'Creating…' : 'Create User'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search by email, username, or role…"
        className="adm-in" style={{ width: 320, maxWidth: '100%', marginBottom: 16 }}
      />

      {filtered.length === 0 ? (
        <div className="adm-empty">
          {search ? 'No users match your search.' : 'No users yet.'}
        </div>
      ) : (
        <div className="adm-tablewrap">
          <table className="adm-table dense users">
            <thead>
              <tr>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Change Role</th>
                <th>Assign Org</th>
                {isSuperAdmin && <th>Delete</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id}>
                  <td>{u.email || <span className="adm-dim">—</span>}</td>
                  <td className="adm-dim">{u.username || '—'}</td>
                  <td><span className={`adm-urole ${normalizeRole(u.role) === 'admin' ? 'admin' : normalizeRole(u.role) === 'broker' ? 'broker' : 'member'}`}>{normalizeRole(u.role)}</span></td>
                  <td>
                    <select
                      value={normalizeRole(u.role)}
                      disabled={roleChanging === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="adm-in adm-in-compact" style={{ width: 'auto' }}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    {roleChanging === u.id && <span className="adm-hint" style={{ marginLeft: 8 }}>Saving…</span>}
                  </td>
                  <td>
                    <div className="adm-urlrow" style={{ alignItems: 'center' }}>
                      <select
                        defaultValue=""
                        disabled={orgAssigning === u.id}
                        onChange={e => { if (e.target.value) handleAssignOrg(u.id, e.target.value); e.target.value = '' }}
                        className="adm-in adm-in-compact" style={{ width: 'auto', maxWidth: 180 }}
                      >
                        <option value="">— select org —</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                      {orgAssigning === u.id && <span className="adm-hint">…</span>}
                      {orgAssignMsg[u.id] && (
                        <span className={`adm-status${orgAssignMsg[u.id] === 'Assigned' ? ' ok' : ' bad'}`}>
                          {orgAssignMsg[u.id]}
                        </span>
                      )}
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td>
                      <button
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={deleting === u.id}
                        className="adm-sbtn del" style={{ opacity: deleting === u.id ? 0.5 : 1 }}
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
