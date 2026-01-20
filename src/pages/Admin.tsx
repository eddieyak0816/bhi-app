import React, { useEffect, useState } from 'react'

type Resource = { id?: string; type: string; title: string; description?: string | null; tags: string[] }

export default function Admin() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('video')
  const [tags, setTags] = useState('')
  const [showAudit, setShowAudit] = useState(false)
  const [auditRows, setAuditRows] = useState<Array<any>>([])
  const DEV_BACKEND_KEY = (import.meta.env.VITE_BACKEND_API_KEY as string) || ''
  const DEV_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || ''

  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/content'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      const body = await res.json()
      setResources(body.resources || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadAudit() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/audit'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      const body = await res.json()
      setAuditRows(body || [])
    } catch (err) {
      console.error('loadAudit', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function create() {
    const payload = { type, title, description: null, tags: tags.split(',').map(s => s.trim()).filter(Boolean) }
    try {
      const res = await fetch(apiUrl('/api/admin/resources'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`create failed: ${res.status} ${txt}`)
      }
      setTitle('')
      setTags('')
      await load()
    } catch (err) {
      console.error(err)
      alert('Create failed (check server logs)')
    }
  }

  async function remove(id?: string) {
    if (!id) return
    if (!confirm('Delete this resource?')) return
    try {
      const res = await fetch(apiUrl(`/api/admin/resources/${id}`), { method: 'DELETE', headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`delete failed: ${res.status} ${txt}`)
      }
      await load()
    } catch (err) {
      console.error(err)
      alert('Delete failed')
    }
  }

  return (
    <div className="card">
      <h3>Admin — Content manager (dev)</h3>
      <p className="muted">Server-only actions require a backend key in dev.</p>

      <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="video">video</option>
          <option value="doctor">doctor</option>
          <option value="article">article</option>
        </select>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <input placeholder="tags (comma)" value={tags} onChange={e => setTags(e.target.value)} />
        <button className="btn-primary" onClick={create} disabled={!title}>Create</button>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <strong>Resources</strong>
        <div style={{display:'flex',gap:8}}>
          <button className="btn-ghost" onClick={() => { setShowAudit(s => !s); if (!showAudit) loadAudit() }}>{showAudit ? 'Show Resources' : 'Show Audit'}</button>
          {showAudit && (
            <button className="btn-ghost" onClick={() => {
              const csv = ['id,action,target_table,target_id,created_at,details']
                .concat(auditRows.map(r => `${r.id},${r.action},${r.target_table},${r.target_id || ''},${r.created_at},"${JSON.stringify(r.details).replace(/"/g,'""')}"`))
                .join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'admin-audit.csv'; document.body.appendChild(a); a.click(); a.remove();
            }}>Export CSV</button>
          )}
        </div>
      </div>

      {showAudit ? (
        <div>
          {loading ? <div>Loading…</div> : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr><th>when</th><th>action</th><th>target</th><th>details</th></tr>
              </thead>
              <tbody>
                {auditRows.map(a => (
                  <tr key={a.id} style={{borderTop:'1px solid #eee'}}>
                    <td className="small muted">{new Date(a.created_at).toLocaleString()}</td>
                    <td>{a.action}</td>
                    <td className="small muted">{a.target_table} {a.target_id || ''}</td>
                    <td className="small muted" style={{maxWidth:360,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{JSON.stringify(a.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div>
          {loading ? <div>Loading…</div> : (
            <ul className="resources-list">
              {resources.map(r => (
                <li key={r.id} data-id={r.id} style={{display:'flex',justifyContent:'space-between',gap:12}}>
                  <div>
                    <strong>{r.title}</strong> <span className="small muted">{r.type}</span>
                    <div className="small muted">{(r.tags || []).join(', ')}</div>
                  </div>
                  <div>
                    <button className="btn-ghost" onClick={() => remove(r.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
