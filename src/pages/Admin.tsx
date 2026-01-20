import React, { useEffect, useState } from 'react'

type Resource = { id?: string; type: string; title: string; description?: string | null; tags: string[] }

export default function Admin() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('video')
  // tag-manager state
  const [allowedTags, setAllowedTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // criteria / logic_rules state
  const [labMarkers, setLabMarkers] = useState<Array<any>>([])
  const [logicRules, setLogicRules] = useState<Array<any>>([])
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<{ marker_id?: string; min_value?: string; max_value?: string; tag_to_apply?: string }>({})

  const [showAudit, setShowAudit] = useState(false)
  const [auditRows, setAuditRows] = useState<Array<any>>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const DEV_BACKEND_KEY = (import.meta.env.VITE_BACKEND_API_KEY as string) || ''
  const DEV_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || ''

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleSelectAll(enabled: boolean) {
    setSelectAll(enabled)
    if (enabled) setSelectedIds(resources.map(r => r.id || '').filter(Boolean))
    else setSelectedIds([])
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} resources?`)) return
    try {
      const res = await fetch(apiUrl('/api/admin/resources/bulk-delete'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ ids: selectedIds }) })
      if (res.status === 404) {
        // server doesn't expose bulk endpoint (older backend) — fall back to per-id deletes
        await Promise.all(selectedIds.map(id => fetch(apiUrl(`/api/admin/resources/${id}`), { method: 'DELETE', headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })))
      } else if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`bulk delete failed: ${res.status} ${txt}`)
      }

      setSelectedIds([])
      setSelectAll(false)
      await load()
    } catch (err) {
      console.error(err)
      alert('Bulk delete failed (check server logs)')
    }
  }

  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/content'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      const body = await res.json()
      // ensure caller gets normalized shapes (resources already normalized upstream)
      setResources(body.resources || [])
      setLogicRules(body.logic_rules || [])
      setLabMarkers(body.lab_markers || [])
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

  // load canonical tags for the tag-manager
  async function loadTags() {
    try {
      const res = await fetch(apiUrl('/api/admin/tags'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      if (!res.ok) return
      const body = await res.json()
      setAllowedTags(Array.isArray(body) ? body.map(String) : [])
    } catch (err) {
      console.error('loadTags', err)
    }
  }

  async function addTag(name: string) {
    const clean = (name || '').toString().trim()
    if (!clean) return null
    if (!allowedTags.includes(clean)) setAllowedTags(prev => Array.from(new Set([...prev, clean])))
    setSelectedTags(prev => prev.includes(clean) ? prev : [...prev, clean])
    try {
      const res = await fetch(apiUrl('/api/admin/tags'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ name: clean }) })
      if (!res.ok) {
        console.warn('addTag: server rejected tag creation', await res.text().catch(() => res.status))
        return { name: clean, persisted: false }
      }
      const body = await res.json().catch(() => ({}))
      await loadTags()
      return body
    } catch (err) {
      console.error('addTag', err)
      return { name: clean, persisted: false }
    }
  }

  // --- logic_rules (criteria) CRUD helpers ---
  function startEditRule(rule: any) {
    setEditingRuleId(rule.id || null)
    setRuleForm({ marker_id: rule.marker_id, min_value: String(rule.min_value), max_value: String(rule.max_value), tag_to_apply: rule.tag_to_apply })
  }
  function cancelEditRule() {
    setEditingRuleId(null)
    setRuleForm({})
  }
  async function saveRule() {
    const payload: any = {
      marker_id: ruleForm.marker_id,
      min_value: Number(ruleForm.min_value),
      max_value: Number(ruleForm.max_value),
      tag_to_apply: ruleForm.tag_to_apply
    }
    try {
      let res
      if (editingRuleId) {
        res = await fetch(apiUrl(`/api/admin/logic-rules/${editingRuleId}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify(payload) })
      } else {
        res = await fetch(apiUrl('/api/admin/logic-rules'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify(payload) })
      }
      if (!res.ok) throw new Error('saveRule failed: ' + res.status)
      await load()
      await loadTags()
      cancelEditRule()
    } catch (err) {
      console.error('saveRule', err)
      alert('Save rule failed (check server logs)')
    }
  }
  async function deleteRule(id?: string) {
    if (!id) return
    if (!confirm('Delete this criterion?')) return
    try {
      const res = await fetch(apiUrl(`/api/admin/logic-rules/${id}`), { method: 'DELETE', headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      if (!res.ok) throw new Error('deleteRule failed: ' + res.status)
      await load()
    } catch (err) {
      console.error('deleteRule', err)
      alert('Delete rule failed')
    }
  }

  useEffect(() => { load(); loadTags() }, [])

  async function create() {
    const payload = { type, title, description: null, tags: selectedTags.map(s => s.trim()).filter(Boolean) }
    try {
      const res = await fetch(apiUrl('/api/admin/resources'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`create failed: ${res.status} ${txt}`)
      }
      setTitle('')
      setSelectedTags([])
      setTagInput('')
      await load()
      await loadTags()
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
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',minWidth:240}}>
            {selectedTags.map(t => (
              <div key={t} style={{background:'#eef2ff',padding:'4px 8px',borderRadius:999,display:'inline-flex',gap:8,alignItems:'center'}}>
                <span style={{fontSize:13}}>{t}</span>
                <button aria-label={`remove-${t}`} className="btn-ghost" onClick={() => setSelectedTags(prev => prev.filter(x => x !== t))}>×</button>
              </div>
            ))}
            <input
              placeholder="Tag"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const match = allowedTags.find(a => a.toLowerCase() === tagInput.trim().toLowerCase()); if (match) setSelectedTags(s => s.includes(match) ? s : [...s, match]); else addTag(tagInput.trim()); setTagInput('') } }}
              style={{minWidth:120,border:'1px solid #e5e7eb',padding:6,borderRadius:6}}
            />
          </div>

          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{background:'#fff',border:'1px solid #eee',padding:8,borderRadius:6,maxHeight:160,overflow:'auto'}}>
              {tagInput.trim() === '' ? (
                <div className="small muted">Available tags: {(allowedTags || []).slice(0,8).join(', ')}</div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {(allowedTags || []).filter(a => a.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(a)).slice(0,10).map(a => (
                    <button key={a} className="btn-ghost" onClick={() => { setSelectedTags(s => s.includes(a) ? s : [...s, a]); setTagInput('') }}>{a}</button>
                  ))}
                  {!allowedTags.map(x => x.toLowerCase()).includes(tagInput.trim().toLowerCase()) && tagInput.trim() !== '' && (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <div className="small muted">No exact match</div>
                      <button className="btn-ghost" onClick={() => { addTag(tagInput.trim()); setTagInput('') }}>+ Add tag</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" onClick={create} disabled={!title}>Create</button>
            </div>
          </div>
        </div>
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
            <div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <label style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.currentTarget.checked)} />
                  <span className="small muted">Select all</span>
                </label>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn-danger" onClick={bulkDelete} disabled={selectedIds.length === 0}>Delete selected</button>
                </div>
              </div>

              {/* --- Criteria / logic_rules table --- */}
              <div style={{marginBottom:18}}>
                <h4 style={{margin:0}}>Criteria (logic rules)</h4>
                <div style={{marginTop:8,border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead style={{background:'#fafafa'}}>
                      <tr>
                        <th style={{textAlign:'left',padding:8}}>Marker</th>
                        <th style={{textAlign:'right',padding:8}}>Min</th>
                        <th style={{textAlign:'right',padding:8}}>Max</th>
                        <th style={{textAlign:'left',padding:8}}>Tag</th>
                        <th style={{textAlign:'right',padding:8}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logicRules.map(l => (
                        <tr key={l.id} data-id={l.id} style={{borderTop:'1px solid #f3f4f6'}}>
                          <td style={{padding:8}}>{(labMarkers.find(m => m.id === l.marker_id) || {}).name || l.marker_id}</td>
                          <td style={{padding:8,textAlign:'right'}}>{l.min_value}</td>
                          <td style={{padding:8,textAlign:'right'}}>{l.max_value}</td>
                          <td style={{padding:8}}>{l.tag_to_apply}</td>
                          <td style={{padding:8,textAlign:'right'}}>
                            <button className="btn-ghost" onClick={() => startEditRule(l)}>Edit</button>
                            <button className="btn-ghost" onClick={() => deleteRule(l.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                      {/* inline add / edit form */}
                      <tr style={{background:'#fff'}}>
                        <td style={{padding:8}}>
                          <select value={ruleForm.marker_id || (labMarkers[0] && labMarkers[0].id) || ''} onChange={e => setRuleForm(f => ({ ...f, marker_id: e.target.value }))}>
                            {(labMarkers || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </td>
                        <td style={{padding:8}}><input value={ruleForm.min_value || ''} onChange={e => setRuleForm(f => ({ ...f, min_value: e.target.value }))} style={{width:80,textAlign:'right'}} /></td>
                        <td style={{padding:8}}><input value={ruleForm.max_value || ''} onChange={e => setRuleForm(f => ({ ...f, max_value: e.target.value }))} style={{width:80,textAlign:'right'}} /></td>
                        <td style={{padding:8}}>
                          <select value={ruleForm.tag_to_apply || ''} onChange={e => setRuleForm(f => ({ ...f, tag_to_apply: e.target.value }))}>
                            <option value="">(choose tag)</option>
                            {(allowedTags || []).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </td>
                        <td style={{padding:8,textAlign:'right'}}>
                          {editingRuleId ? (
                            <>
                              <button className="btn-ghost" onClick={saveRule}>Save</button>
                              <button className="btn-ghost" onClick={cancelEditRule}>Cancel</button>
                            </>
                          ) : (
                            <button className="btn-primary" onClick={saveRule}>Add</button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- Resources table (neatly aligned) --- */}
              <div style={{border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead style={{background:'#fafafa'}}>
                    <tr>
                      <th style={{padding:8,textAlign:'left'}}><input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.currentTarget.checked)} /></th>
                      <th style={{padding:8,textAlign:'left'}}>Title</th>
                      <th style={{padding:8,textAlign:'left'}}>Type</th>
                      <th style={{padding:8,textAlign:'left'}}>Tags</th>
                      <th style={{padding:8,textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(r => (
                      <tr key={r.id} data-id={r.id} style={{borderTop:'1px solid #f3f4f6'}}>
                        <td style={{padding:8}}><input type="checkbox" checked={selectedIds.includes(r.id || '')} onChange={() => toggleSelect(r.id || '')} /></td>
                        <td style={{padding:8}}><strong>{r.title}</strong></td>
                        <td style={{padding:8}} className="small muted">{r.type}</td>
                        <td style={{padding:8}} className="small muted">{(r.tags || []).join(', ')}</td>
                        <td style={{padding:8,textAlign:'right'}}>
                          <button className="btn-ghost" onClick={() => remove(r.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
