import React, { useEffect, useState } from 'react'

type Resource = { id?: string; type: string; title: string; description?: string | null; tags: string[] }

export default function Admin({ onResourcesChanged }: { onResourcesChanged?: () => void }) {
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
  const [ruleForm, setRuleForm] = useState<{ markerName?: string; min_value?: string; max_value?: string; tag_to_apply?: string }>({})

  // inline marker-creation state
  const [markerCreationVisible, setMarkerCreationVisible] = useState(false)
  const [markerName, setMarkerName] = useState('')
  const [markerUnit, setMarkerUnit] = useState('')

  const [activeTab, setActiveTab] = useState<'resources' | 'types' | 'markers' | 'tags' | 'criteria' | 'audit'>('resources')
  // dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('bhi-dark-mode')
    return saved ? JSON.parse(saved) : false
  })
  // View mode per tab (card or table)
  const [viewMode, setViewMode] = useState<Record<string, 'card' | 'table'>>({
    resources: 'card',
    types: 'card',
    markers: 'card',
    tags: 'card',
    criteria: 'table',
    audit: 'table'
  })
  const [resourceTypes, setResourceTypes] = useState<string[]>([])
  const [newTypeName, setNewTypeName] = useState('')
  const [createResourceOpen, setCreateResourceOpen] = useState(false)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [auditRows, setAuditRows] = useState<Array<any>>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([])
  const [selectAllTags, setSelectAllTags] = useState(false)
  // sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  // criteria filter state
  const [filterCriteriaMarker, setFilterCriteriaMarker] = useState<string>('')
  const [filterCriteriaTag, setFilterCriteriaTag] = useState<string>('')
  const [filterCriteriaValueType, setFilterCriteriaValueType] = useState<'min' | 'max' | ''>('')
  const [filterCriteriaOperator, setFilterCriteriaOperator] = useState<'<' | '>' | '=' | '<=' | '>=' | ''>('')
  const [filterCriteriaValue, setFilterCriteriaValue] = useState<string>('')
  // lab markers filter state
  const [filterLabMarkerName, setFilterLabMarkerName] = useState<string>('')
  const [filterLabMarkerUnit, setFilterLabMarkerUnit] = useState<string>('')
  // resource types filter state
  const [filterResourceTypeName, setFilterResourceTypeName] = useState<string>('')
  // tags filter state
  const [filterTagName, setFilterTagName] = useState<string>('')
  // audit log filter state
  const [filterAuditAction, setFilterAuditAction] = useState<string>('')
  const [filterAuditTable, setFilterAuditTable] = useState<string>('')
  // editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>({})
  const DEV_BACKEND_KEY = (import.meta.env.VITE_BACKEND_API_KEY as string) || ''
  const DEV_BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string) || ''
  // session override for dev convenience (not persisted)
  const [devKeyOverride, setDevKeyOverride] = useState<string | null>(null)
  function effectiveDevKey() { return devKeyOverride || DEV_BACKEND_KEY }

  // Theme colors
  const theme = {
    bg: darkMode ? '#252525' : '#ffffff',
    bgSecondary: darkMode ? '#252525' : '#f9fafb',
    bgTertiary: darkMode ? '#252525' : '#F8F9FC',
    text: darkMode ? '#e0e0e0' : '#1F2937',
    textMuted: darkMode ? '#aaa' : '#666',
    border: darkMode ? '#555' : '#e5e7eb',
    borderLight: darkMode ? '#444' : '#eee',
    card: darkMode ? '#252525' : 'white'
  }

  // Common inline styles using theme
  const styles = {
    input: {width:'100%' as const,padding:'6px 8px',border:'1px solid ' + theme.border,borderRadius:4,fontSize:14,background:theme.bgSecondary,color:theme.text},
    inputSmall: {padding:'4px 6px',border:'1px solid ' + theme.border,borderRadius:4,background:theme.bgSecondary,color:theme.text},
    select: {width:'100%' as const,padding:'6px 8px',border:'1px solid ' + theme.border,borderRadius:4,fontSize:14,background:theme.bgSecondary,color:theme.text},
    selectSmall: {padding:'4px 6px',border:'1px solid ' + theme.border,borderRadius:4,background:theme.bgSecondary,color:theme.text},
    table: {width:'100%' as const,borderCollapse:'collapse' as const,color:theme.text},
    tableHeader: {background:theme.bgSecondary,borderBottom:'1px solid ' + theme.border},
    tableRow: {borderTop:'1px solid ' + theme.borderLight},
    filterBox: {background:theme.bgSecondary,border:'1px solid ' + theme.border,borderRadius:6,padding:12,marginBottom:16}
  }

  useEffect(() => {
    localStorage.setItem('bhi-dark-mode', JSON.stringify(darkMode))
  }, [darkMode])

  useEffect(() => {
    if (darkMode) {
      document.body.style.backgroundColor = '#252525'
      document.body.style.color = '#e0e0e0'
      document.body.classList.add('dark-mode')
    } else {
      document.body.style.backgroundColor = '#ffffff'
      document.body.style.color = '#000000'
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  // helper to format helpful messages when server returns 403
  function backendKeyGuidance() {
    return DEV_BACKEND_URL ? `Set VITE_BACKEND_API_KEY in your .env.server (example: VITE_BACKEND_API_KEY=foo) or use the session dev key.` : 'Backend URL not set (VITE_BACKEND_URL)'}

  function toggleSelect(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleSelectAll(enabled: boolean) {
    setSelectAll(enabled)
    if (enabled) setSelectedIds(resources.map(r => r.id || '').filter(Boolean))
    else setSelectedIds([])
  }
  function toggleSelectTag(tagName: string) {
    setSelectedTagNames(prev => prev.includes(tagName) ? prev.filter(x => x !== tagName) : [...prev, tagName])
  }
  function toggleSelectAllTags(enabled: boolean) {
    setSelectAllTags(enabled)
    if (enabled) setSelectedTagNames([...allowedTags])
    else setSelectedTagNames([])
  }

  // sorting helper
  function handleSort(column: string) {
    if (sortColumn === column) {
      // toggle direction if clicking same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // new column, default to ascending
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function sortData<T>(data: T[], column: string): T[] {
    return [...data].sort((a, b) => {
      const aVal = (a as any)[column]
      const bVal = (b as any)[column]
      
      // handle nulls/undefined
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      
      // string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
        return sortDirection === 'asc' ? cmp : -cmp
      }
      
      // number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      // fallback
      return String(aVal).localeCompare(String(bVal)) * (sortDirection === 'asc' ? 1 : -1)
    })
  }

  function getSortIndicator(column: string) {
    if (sortColumn !== column) return ' ⬍'
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
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
  function authHeaders() {
    const k = effectiveDevKey()
    return k ? { 'x-backend-api-key': k } : {}
  }
  function getTagUsageCount(tagName: string) {
    let count = 0
    // Count in resources
    resources.forEach(r => {
      if (Array.isArray(r.tags) && r.tags.includes(tagName)) count++
    })
    // Count in logic rules
    logicRules.forEach(lr => {
      if (lr.tag_to_apply === tagName) count++
    })
    return count
  }
  function getTagColor(tagName: string) {
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']
    let hash = 0
    for (let i = 0; i < tagName.length; i++) {
      hash = ((hash << 5) - hash) + tagName.charCodeAt(i)
      hash = hash & hash
    }
    return colors[Math.abs(hash) % colors.length]
  }
  function toggleViewMode(tab: string) {
    setViewMode(prev => ({
      ...prev,
      [tab]: prev[tab] === 'card' ? 'table' : 'card'
    }))
  }
  async function fetchJson(input: string, init: RequestInit = {}) {
    const headers = { ...(init.headers || {}), ...(authHeaders()) }
    const res = await fetch(apiUrl(input), { ...init, headers })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const err = new Error(`${res.status} ${body}`)
      ;(err as any).status = res.status
      ;(err as any).body = body
      throw err
    }
    return res.json().catch(() => null)
  }

  async function load() {
    setLoading(true)
    try {
      try {
      const body = await fetchJson('/api/admin/content')
      // ensure caller gets normalized shapes (resources already normalized upstream)
      setResources((body && body.resources) || [])
      setLogicRules((body && body.logic_rules) || [])
      setLabMarkers((body && body.lab_markers) || [])
    } catch (err) {
      console.error('load admin content failed', err)
      alert('Failed to load admin content — ' + ((err as any)?.message || 'check server logs'))
    }
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

  // load resource types
  async function loadResourceTypes() {
    try {
      const res = await fetch(apiUrl('/api/admin/resource-types'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
      if (!res.ok) return
      const body = await res.json()
      setResourceTypes(Array.isArray(body) ? body.map((t: any) => t.name || t) : [])
    } catch (err) {
      console.error('loadResourceTypes', err)
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
    const markerName = labMarkers.find(m => m.id === rule.marker_id)?.name || ''
    setRuleForm({ markerName, min_value: String(rule.min_value), max_value: String(rule.max_value), tag_to_apply: rule.tag_to_apply })
  }
  function cancelEditRule() {
    setEditingRuleId(null)
    setRuleForm({})
  }
  async function saveRule() {
    const markerID = labMarkers.find(m => m.name === ruleForm.markerName)?.id
    if (!markerID) return alert('Invalid marker selected')
    const payload: any = {
      marker_id: markerID,
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
  async function deleteRule(idOrRule?: string | any) {
    // idOrRule can be an id string OR the rule object (fallback for schemas without id)
    const isObj = typeof idOrRule === 'object' && idOrRule !== null
    const id = isObj ? idOrRule.id : idOrRule
    if (!id && !isObj) return
    if (!confirm('Delete this criterion?')) return

    try {
      let res
      if (id) {
        res = await fetch(apiUrl(`/api/admin/logic-rules/${id}`), { method: 'DELETE', headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {} })
        // if server responds 400/404 because id column doesn't exist or row not found, fall through to attr-delete
        if (res && res.ok) {
          await load();
          return
        }
      }

      // fallback: delete by attributes (marker_id + min + max + tag)
      const rule = isObj ? idOrRule : null
      const marker_id = rule ? rule.marker_id : undefined
      const min_value = rule ? rule.min_value : undefined
      const max_value = rule ? rule.max_value : undefined
      const tag_to_apply = rule ? rule.tag_to_apply : undefined
      if (!marker_id || typeof min_value === 'undefined' || typeof max_value === 'undefined' || !tag_to_apply) {
        const txt = await (res ? res.text().catch(() => '') : '')
        throw new Error(`deleteRule: missing identifiers (${txt})`)
      }

      const resp = await fetch(apiUrl('/api/admin/logic-rules/delete-by-attrs'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ marker_id, min_value, max_value, tag_to_apply }) })
      if (!resp.ok) {
        const txt = await resp.text().catch(() => resp.status)
        throw new Error('delete-by-attrs failed: ' + txt)
      }

      await load()
    } catch (err) {
      console.error('deleteRule', err)
      alert('Delete rule failed — ' + ((err as any) && (err as any).message ? (err as any).message : 'check server logs'))
    }
  }

  useEffect(() => { load(); loadTags(); loadResourceTypes() }, [])

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
      onResourcesChanged?.()
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
    <div className="card" style={{background:theme.bg,color:theme.text}}>
      <h3 style={{color:theme.text}}>Admin — Content manager (dev)</h3>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <p className="muted" style={{margin:0,color:theme.textMuted}}>Server-only actions require a backend key in dev.</p>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <button className="btn-ghost" onClick={() => setDevKeyOverride('foo')} style={{color:theme.text,border:'1px solid ' + theme.border}}>Use dev key (foo)</button>
          <button className="btn-ghost" onClick={() => { const k = prompt('Enter a temporary backend key (session only)'); if (k) setDevKeyOverride(k) }} style={{color:theme.text,border:'1px solid ' + theme.border}}>Set session key</button>
          {effectiveDevKey() ? <div className="small" style={{color:theme.textMuted}}>Using key: <strong style={{color:theme.text}}>{effectiveDevKey() === 'foo' ? 'foo (session)' : 'session-set'}</strong></div> : <div className="small" style={{color:theme.textMuted}}>No backend key set</div>}
        </div>
      </div>



      <div style={{height:12}} />

      {/* Tab Navigation */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <div className="tabs">
          <button className={`tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')} style={{color:theme.text}}>Resources</button>
          <button className={`tab ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')} style={{color:theme.text}}>Resource Types</button>
          <button className={`tab ${activeTab === 'markers' ? 'active' : ''}`} onClick={() => setActiveTab('markers')} style={{color:theme.text}}>Lab Markers</button>
          <button className={`tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')} style={{color:theme.text}}>Tags</button>
          <button className={`tab ${activeTab === 'criteria' ? 'active' : ''}`} onClick={() => setActiveTab('criteria')} style={{color:theme.text}}>Criteria</button>
        </div>
        <button onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Light mode' : 'Dark mode'} style={{background:theme.bgSecondary,border:'1px solid ' + theme.border,borderRadius:4,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{darkMode ? '☀️' : '🌙'}</button>
      </div>

      {/* Audit Log hidden in main UI - gated behind secret access */}
      {activeTab === 'audit' ? (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <h4 style={{marginBottom:16}}>Audit Log</h4>

              {/* Audit Filters */}
              <div style={{background:theme.bgSecondary,border:'1px solid ' + theme.border,borderRadius:6,padding:12,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.textMuted}}>Action</label>
                    <select
                      value={filterAuditAction}
                      onChange={e => setFilterAuditAction(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:'1px solid ' + theme.border,borderRadius:4,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                    >
                      <option value="">(All Actions)</option>
                      {Array.from(new Set(auditRows.map(a => a.action))).sort().map(action => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.textMuted}}>Table</label>
                    <select
                      value={filterAuditTable}
                      onChange={e => setFilterAuditTable(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:'1px solid ' + theme.border,borderRadius:4,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                    >
                      <option value="">(All Tables)</option>
                      {Array.from(new Set(auditRows.map(a => a.target_table))).sort().map(table => (
                        <option key={table} value={table}>{table}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    className="btn-ghost" 
                    onClick={() => {
                      setFilterAuditAction('')
                      setFilterAuditTable('')
                    }}
                    style={{opacity: (filterAuditAction || filterAuditTable) ? 1 : 0.5,cursor: (filterAuditAction || filterAuditTable) ? 'pointer' : 'default',color:theme.text}}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <table style={{width:'100%',borderCollapse:'collapse',color:theme.text}}>
                <thead>
                  <tr style={{background:theme.bgSecondary,borderBottom:'1px solid ' + theme.border}}>
                    <th style={{cursor:'pointer',userSelect:'none',color:sortColumn==='created_at'?theme.text:theme.textMuted,padding:'8px'}} onClick={() => handleSort('created_at')}>when{getSortIndicator('created_at')}</th>
                    <th style={{cursor:'pointer',userSelect:'none',color:sortColumn==='action'?theme.text:theme.textMuted,padding:'8px'}} onClick={() => handleSort('action')}>action{getSortIndicator('action')}</th>
                    <th style={{cursor:'pointer',userSelect:'none',color:sortColumn==='target_table'?theme.text:theme.textMuted,padding:'8px'}} onClick={() => handleSort('target_table')}>target{getSortIndicator('target_table')}</th>
                    <th style={{padding:'8px'}}>details</th>
                  </tr>
                </thead>
                <tbody>
                  {(sortColumn ? sortData(auditRows
                    .filter(a => (!filterAuditAction || a.action === filterAuditAction) && (!filterAuditTable || a.target_table === filterAuditTable)), sortColumn) : auditRows
                    .filter(a => (!filterAuditAction || a.action === filterAuditAction) && (!filterAuditTable || a.target_table === filterAuditTable))).map(a => (
                    <tr key={a.id} style={{borderTop:'1px solid ' + theme.borderLight}}>
                      <td className="small" style={{color:theme.textMuted,padding:'8px'}}>{new Date(a.created_at).toLocaleString()}</td>
                      <td style={{padding:'8px'}}>{a.action}</td>
                      <td className="small" style={{color:theme.textMuted,padding:'8px'}}>{a.target_table} {a.target_id || ''}</td>
                      <td className="small" style={{color:theme.textMuted,padding:'8px',maxWidth:360,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{JSON.stringify(a.details)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h4 style={{margin:0}}>Resources</h4>
                <button 
                  onClick={() => toggleViewMode('resources')}
                  style={{background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:4,padding:'6px 12px',cursor:'pointer',fontSize:13,fontWeight:500}}
                >
                  {viewMode.resources === 'card' ? '📋 Table' : '🗂️ Cards'}
                </button>
              </div>
              {/* Create New Resource Accordion */}
              <button
                onClick={() => setCreateResourceOpen(!createResourceOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  marginBottom: 16,
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#1F2937'
                }}
              >
                <span>{createResourceOpen ? '▼' : '▶'}</span>
                <span>Create New Resource</span>
              </button>

              {/* Resource creation form (collapsed by default) */}
              {createResourceOpen && (
                <div style={{marginBottom:24,padding:16,background:'#F8F9FC',borderRadius:6}}>
                  <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <select value={type} onChange={e => setType(e.target.value)}>
                        {resourceTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                      </select>
                      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{minWidth:240}} />
                      <button className="btn-primary" onClick={create} disabled={!title}>Create</button>
                    </div>
                  </div>
                  <div style={{marginTop:12}}>
                    <div style={{marginBottom:12}}>
                      <div className="small muted" style={{marginBottom:8}}>Tags:</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                          {selectedTags.map(t => (
                            <div key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#2563eb',color:'#fff',borderRadius:4,fontSize:12}}>
                              <span>{t}</span>
                              <button onClick={() => setSelectedTags(s => s.filter(x => x !== t))} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                            </div>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Type or select a tag..."
                          list="add-tags-list"
                          style={{width:'100%',padding:'6px 8px',border:'1px solid ' + theme.border,borderRadius:4,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const val = (e.currentTarget as HTMLInputElement).value.trim()
                              if (val && !selectedTags.includes(val) && allowedTags.includes(val)) {
                                setSelectedTags(s => [...s, val])
                                e.currentTarget.value = ''
                              }
                            }
                          }}
                          onChange={(e) => {
                            const val = e.currentTarget.value.trim()
                            if (val && !selectedTags.includes(val) && e.currentTarget.list) {
                              const datalist = document.getElementById('add-tags-list') as HTMLDataListElement
                              const options = Array.from(datalist?.options || []).map(o => o.value)
                              if (options.includes(val)) {
                                const inputs = e.currentTarget.parentElement?.querySelectorAll('input[list="add-tags-list"]')
                                if (inputs && inputs[0] === e.currentTarget) {
                                  // Allow typing without auto-selecting
                                }
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = e.currentTarget.value.trim()
                            if (val && !selectedTags.includes(val) && allowedTags.includes(val)) {
                              setSelectedTags(s => [...s, val])
                              e.currentTarget.value = ''
                            }
                          }}
                        />
                        <datalist id="add-tags-list">
                          {(allowedTags || []).filter(t => !selectedTags.includes(t)).map(t => <option key={t} value={t} />)}
                        </datalist>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <h4 style={{marginBottom:16}}>Resources</h4>

              {/* Filtering section */}
              <div style={{marginBottom:16,padding:12,background:'#F8F9FC',borderRadius:6}}>
                <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-end'}}>
                  <div style={{flex:'1 1 200px'}}>
                    <label style={{display:'block',marginBottom:6,fontSize:12,fontWeight:600,color:'#666'}}>Keyword Search</label>
                    <input
                      type="text"
                      placeholder="Search titles..."
                      value={filterKeyword}
                      onChange={e => setFilterKeyword(e.target.value)}
                      list="resource-titles-list"
                      style={{width:'100%',padding:8,border:'1px solid #ddd',borderRadius:4,fontSize:14}}
                    />
                    <datalist id="resource-titles-list">
                      {Array.from(new Set(
                        resources
                          .filter(r => {
                            if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                            if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                            return true
                          })
                          .map(r => r.title)
                          .filter(t => !filterKeyword || t.toLowerCase().includes(filterKeyword.toLowerCase()))
                      )).sort().map(title => <option key={title} value={title} />)}
                    </datalist>
                  </div>
                  <div style={{flex:'1 1 150px'}}>
                    <label style={{display:'block',marginBottom:6,fontSize:12,fontWeight:600,color:'#666'}}>Type</label>
                    <select
                      multiple
                      value={filterTypes}
                      onChange={e => setFilterTypes(Array.from(e.currentTarget.selectedOptions, o => o.value))}
                      style={{width:'100%',padding:8,border:'1px solid #ddd',borderRadius:4,fontSize:14,minHeight:36,maxHeight:100,overflowY:'auto'}}
                    >
                      {Array.from(new Set(
                        resources
                          .filter(r => {
                            if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                            if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                            return true
                          })
                          .map(r => r.type)
                      )).sort().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{flex:'1 1 150px'}}>
                    <label style={{display:'block',marginBottom:6,fontSize:12,fontWeight:600,color:'#666'}}>Tags</label>
                    <select
                      multiple
                      value={filterTags}
                      onChange={e => setFilterTags(Array.from(e.currentTarget.selectedOptions, o => o.value))}
                      style={{width:'100%',padding:8,border:'1px solid #ddd',borderRadius:4,fontSize:14,minHeight:36,maxHeight:100,overflowY:'auto'}}
                    >
                      {Array.from(new Set(
                        resources
                          .filter(r => {
                            if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                            if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                            return true
                          })
                          .flatMap(r => r.tags || [])
                      )).sort().map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {(filterKeyword || filterTypes.length > 0 || filterTags.length > 0) && (
                    <button
                      onClick={() => {
                        setFilterKeyword('')
                        setFilterTypes([])
                        setFilterTags([])
                        setSelectedIds([])
                        setSelectAll(false)
                      }}
                      style={{padding:'8px 12px',background:'#E0E7FF',color:'#6366F1',border:'none',borderRadius:4,cursor:'pointer',fontSize:13,fontWeight:600}}
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Filter results summary */}
              {(filterKeyword || filterTypes.length > 0 || filterTags.length > 0) && (
                <div style={{marginBottom:12,fontSize:13,color:'#666'}}>
                  {(() => {
                    const filtered = resources.filter(r => {
                      if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                      if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                      if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                      return true
                    })
                    return `Showing ${filtered.length} of ${resources.length} resources`
                  })()}
                </div>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <label style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.currentTarget.checked)} />
                  <span className="small muted">Select all</span>
                </label>
                <button className="btn-danger" onClick={bulkDelete} disabled={selectedIds.length === 0}>Delete selected ({selectedIds.length})</button>
              </div>

              {/* Resources table/cards */}
              {viewMode.resources === 'table' ? (
              <div style={{border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead style={{background:'#fafafa'}}>
                    <tr>
                      <th style={{padding:8,textAlign:'left'}}><input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.currentTarget.checked)} /></th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:sortColumn==='title'?'#1F2937':'#666'}} onClick={() => handleSort('title')}>Title{getSortIndicator('title')}</th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:sortColumn==='type'?'#1F2937':'#666'}} onClick={() => handleSort('type')}>Type{getSortIndicator('type')}</th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:sortColumn==='tags'?'#1F2937':'#666'}} onClick={() => handleSort('tags')}>Tags{getSortIndicator('tags')}</th>
                      <th style={{padding:8,textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sortColumn ? sortData(resources
                      .filter(r => {
                        if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                        if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                        if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                        return true
                      }), sortColumn) : resources
                      .filter(r => {
                        if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                        if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                        if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                        return true
                      })
                    )
                      .map(r => (
                        <tr key={r.id} data-id={r.id} style={{borderTop:'1px solid #f3f4f6'}}>
                          <td style={{padding:8}}><input type="checkbox" checked={selectedIds.includes(r.id || '')} onChange={() => toggleSelect(r.id || '')} /></td>
                          {editingId === r.id ? (
                            <>
                              <td style={{padding:8}}><input type="text" value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} /></td>
                              <td style={{padding:8}} className="small muted">{r.type}</td>
                              <td style={{padding:8}} className="small muted">{(r.tags || []).join(', ')}</td>
                              <td style={{padding:8,textAlign:'right'}}>
                                <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                  <button className="btn-ghost" onClick={async () => {
                                    try {
                                      const res = await fetch(apiUrl(`/api/admin/resources/${r.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ title: editData.title }) })
                                      if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                      await load()
                                      setEditingId(null)
                                    } catch (err) {
                                      alert('Save resource failed — ' + ((err as any)?.message || 'check server logs'))
                                    }
                                  }} style={{color:'#16a34a'}}>✓</button>
                                  <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626'}}>⊘</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{padding:8}}><strong>{r.title}</strong></td>
                              <td style={{padding:8}} className="small muted">{r.type}</td>
                              <td style={{padding:8}} className="small muted">{(r.tags || []).join(', ')}</td>
                              <td style={{padding:8,textAlign:'right'}}>
                                <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                  <button className="btn-ghost" onClick={() => {
                                    setEditingId(r.id)
                                    setEditData({title: r.title})
                                  }}>✎</button>
                                  <button className="btn-ghost" onClick={() => remove(r.id)} style={{color:'#dc2626'}}>✕</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))',gap:16}}>
                {(sortColumn ? sortData(resources
                  .filter(r => {
                    if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                    if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                    if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                    return true
                  }), sortColumn) : resources
                  .filter(r => {
                    if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                    if (filterTypes.length > 0 && !filterTypes.includes(r.type)) return false
                    if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                    return true
                  })
                ).map(r => (
                  <div key={r.id} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}>
                    {editingId === r.id ? (
                      <>
                        <input type="text" value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} autoFocus style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:4,marginBottom:12,fontWeight:600,fontSize:14}} />
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={async () => {
                            try {
                              const res = await fetch(apiUrl(`/api/admin/resources/${r.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ title: editData.title }) })
                              if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                              await load()
                              setEditingId(null)
                            } catch (err) {
                              alert('Save resource failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{color:'#16a34a',fontSize:14}}>✓</button>
                          <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626',fontSize:14}}>⊘</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h5 style={{margin:'0 0 8px 0',fontSize:16,fontWeight:600}}>{r.title}</h5>
                        <div style={{fontSize:12,color:'#666',marginBottom:8}}>
                          <div><strong>Type:</strong> {r.type}</div>
                          {r.tags && r.tags.length > 0 && <div><strong>Tags:</strong> {r.tags.join(', ')}</div>}
                        </div>
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={() => {
                            setEditingId(r.id)
                            setEditData({title: r.title})
                          }} style={{fontSize:13}}>✎ Edit</button>
                          <button className="btn-ghost" onClick={() => remove(r.id)} style={{color:'#dc2626',fontSize:13}}>✕ Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Criteria Tab */}
      {activeTab === 'criteria' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <h4 style={{marginBottom:16}}>Criteria</h4>
              
              {/* Add new criteria form */}
              <div style={{marginBottom:16,padding:16,background:'#F8F9FC',borderRadius:6}}>
                <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Marker</label>
                    <input
                      type="text"
                      placeholder="Add marker..."
                      list="add-criteria-markers-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                      value={ruleForm.markerName || ''}
                      onChange={e => setRuleForm(f => ({ ...f, markerName: e.target.value }))}
                    />
                    <datalist id="add-criteria-markers-list">
                      {labMarkers.map(m => <option key={m.id} value={m.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Min</label>
                    <input type="number" placeholder="Min" value={ruleForm.min_value || ''} onChange={e => setRuleForm(f => ({ ...f, min_value: e.target.value }))} style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Max</label>
                    <input type="number" placeholder="Max" value={ruleForm.max_value || ''} onChange={e => setRuleForm(f => ({ ...f, max_value: e.target.value }))} style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Tag</label>
                    <input
                      type="text"
                      placeholder="Add tag..."
                      list="add-criteria-tags-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                      value={ruleForm.tag_to_apply || ''}
                      onChange={e => setRuleForm(f => ({ ...f, tag_to_apply: e.target.value }))}
                    />
                    <datalist id="add-criteria-tags-list">
                      {allowedTags.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <button className="btn-primary" onClick={saveRule}>Add Criteria</button>
                </div>
              </div>
              
              <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:12,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Marker</label>
                    <input
                      type="text"
                      placeholder="(All Markers)"
                      value={filterCriteriaMarker}
                      onChange={e => setFilterCriteriaMarker(e.target.value)}
                      list="criteria-markers-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    />
                    <datalist id="criteria-markers-list">
                      {Array.from(new Set(logicRules
                        .filter(l => 
                          (!filterCriteriaTag || l.tag_to_apply === filterCriteriaTag)
                        )
                        .map(l => l.marker_id)))
                        .map(markerId => labMarkers.find(m => m.id === markerId))
                        .filter(m => m && (!filterCriteriaMarker || m.name.toLowerCase().includes(filterCriteriaMarker.toLowerCase())))
                        .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
                        .map(m => <option key={m?.id} value={m?.name || ''} />)
                      }
                    </datalist>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Type</label>
                    <select
                      value={filterCriteriaValueType}
                      onChange={e => setFilterCriteriaValueType(e.target.value as 'min' | 'max' | '')}
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    >
                      <option value="">Min or Max</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Operator</label>
                    <select
                      value={filterCriteriaOperator}
                      onChange={e => setFilterCriteriaOperator(e.target.value as '<' | '>' | '=' | '<=' | '>=' | '')}
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    >
                      <option value="">Any</option>
                      <option value="<">&lt;</option>
                      <option value=">">&gt;</option>
                      <option value="=">=</option>
                      <option value="<=">&lt;=</option>
                      <option value=">=">&gt;=</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Value</label>
                    <input
                      type="number"
                      placeholder="Value..."
                      value={filterCriteriaValue}
                      onChange={e => setFilterCriteriaValue(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Tag</label>
                    <input
                      type="text"
                      placeholder="(All Tags)"
                      value={filterCriteriaTag}
                      onChange={e => setFilterCriteriaTag(e.target.value)}
                      list="criteria-tags-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    />
                    <datalist id="criteria-tags-list">
                      {Array.from(new Set(logicRules
                        .filter(l => {
                          if (filterCriteriaMarker) {
                            const markerId = labMarkers.find(m => m.name === filterCriteriaMarker)?.id
                            if (!markerId || l.marker_id !== markerId) return false
                          }
                          return true
                        })
                        .map(l => l.tag_to_apply)
                        .filter(t => !filterCriteriaTag || t.toLowerCase().includes(filterCriteriaTag.toLowerCase()))
                      ))
                        .sort((a, b) => a.localeCompare(b))
                        .map(tag => <option key={tag} value={tag} />)
                      }
                    </datalist>
                  </div>
                  <button 
                    className="btn-ghost" 
                    onClick={() => {
                      setFilterCriteriaMarker('')
                      setFilterCriteriaValueType('')
                      setFilterCriteriaOperator('')
                      setFilterCriteriaValue('')
                      setFilterCriteriaTag('')
                    }}
                    style={{opacity: (filterCriteriaMarker || filterCriteriaValueType || filterCriteriaOperator || filterCriteriaValue || filterCriteriaTag) ? 1 : 0.5,cursor: (filterCriteriaMarker || filterCriteriaValueType || filterCriteriaOperator || filterCriteriaValue || filterCriteriaTag) ? 'pointer' : 'default'}}
                  >
                    Clear
                  </button>
                </div>
                {(filterCriteriaMarker || filterCriteriaValueType || filterCriteriaOperator || filterCriteriaValue || filterCriteriaTag) && (
                  <div style={{fontSize:12,marginTop:8,color:'#666'}}>
                    Showing {logicRules
                      .filter(l => {
                        const markerId = filterCriteriaMarker ? labMarkers.find(m => m.name === filterCriteriaMarker)?.id : null
                        if (filterCriteriaMarker && (!markerId || l.marker_id !== markerId)) return false
                        if (filterCriteriaTag && l.tag_to_apply !== filterCriteriaTag) return false
                        if (filterCriteriaValueType && filterCriteriaOperator && filterCriteriaValue) {
                          const val = parseFloat(filterCriteriaValue)
                          const fieldValue = filterCriteriaValueType === 'min' ? l.min_value : l.max_value
                          if (filterCriteriaOperator === '<' && !(fieldValue < val)) return false
                          if (filterCriteriaOperator === '>' && !(fieldValue > val)) return false
                          if (filterCriteriaOperator === '=' && !(fieldValue === val)) return false
                          if (filterCriteriaOperator === '<=' && !(fieldValue <= val)) return false
                          if (filterCriteriaOperator === '>=' && !(fieldValue >= val)) return false
                        }
                        return true
                      })
                      .length
                    } of {logicRules.length} criteria
                  </div>
                )}
              </div>

              <div style={{marginBottom:18}}>
                <div style={{marginTop:8,border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                  <table data-testid="criteria-table" style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead style={{background:'#fafafa'}}>
                      <tr>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:sortColumn==='marker_id'?'#1F2937':'#666'}} onClick={() => handleSort('marker_id')}>Marker{getSortIndicator('marker_id')}</th>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:sortColumn==='min_value'?'#1F2937':'#666'}} onClick={() => handleSort('min_value')}>Min{getSortIndicator('min_value')}</th>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:sortColumn==='max_value'?'#1F2937':'#666'}} onClick={() => handleSort('max_value')}>Max{getSortIndicator('max_value')}</th>
                        <th style={{textAlign:'left',padding:8}}>Operator</th>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:sortColumn==='tag_to_apply'?'#1F2937':'#666'}} onClick={() => handleSort('tag_to_apply')}>Tag{getSortIndicator('tag_to_apply')}</th>
                        <th style={{textAlign:'right',padding:8}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(sortColumn ? sortData(logicRules
                        .filter(l => {
                          const markerId = filterCriteriaMarker ? labMarkers.find(m => m.name === filterCriteriaMarker)?.id : null
                          if (filterCriteriaMarker && (!markerId || l.marker_id !== markerId)) return false
                          if (filterCriteriaTag && l.tag_to_apply !== filterCriteriaTag) return false
                          if (filterCriteriaValueType && filterCriteriaOperator && filterCriteriaValue) {
                            const val = parseFloat(filterCriteriaValue)
                            const fieldValue = filterCriteriaValueType === 'min' ? l.min_value : l.max_value
                            if (filterCriteriaOperator === '<' && !(fieldValue < val)) return false
                            if (filterCriteriaOperator === '>' && !(fieldValue > val)) return false
                            if (filterCriteriaOperator === '=' && !(fieldValue === val)) return false
                            if (filterCriteriaOperator === '<=' && !(fieldValue <= val)) return false
                            if (filterCriteriaOperator === '>=' && !(fieldValue >= val)) return false
                          }
                          return true
                        }), sortColumn) : logicRules
                        .filter(l => {
                          const markerId = filterCriteriaMarker ? labMarkers.find(m => m.name === filterCriteriaMarker)?.id : null
                          if (filterCriteriaMarker && (!markerId || l.marker_id !== markerId)) return false
                          if (filterCriteriaTag && l.tag_to_apply !== filterCriteriaTag) return false
                          if (filterCriteriaValueType && filterCriteriaOperator && filterCriteriaValue) {
                            const val = parseFloat(filterCriteriaValue)
                            const fieldValue = filterCriteriaValueType === 'min' ? l.min_value : l.max_value
                            if (filterCriteriaOperator === '<' && !(fieldValue < val)) return false
                            if (filterCriteriaOperator === '>' && !(fieldValue > val)) return false
                            if (filterCriteriaOperator === '=' && !(fieldValue === val)) return false
                            if (filterCriteriaOperator === '<=' && !(fieldValue <= val)) return false
                            if (filterCriteriaOperator === '>=' && !(fieldValue >= val)) return false
                          }
                          return true
                        })).map(l => (
                        <tr key={l.id} data-id={l.id} style={{borderTop:'1px solid #f3f4f6'}}>
                          {editingId === l.id ? (
                            <>
                              <td style={{padding:8}}>
                                <input
                                  type="text"
                                  placeholder="Marker"
                                  value={editData.markerName || ''}
                                  onChange={e => setEditData({...editData, markerName: e.target.value})}
                                  list="edit-criteria-markers-list"
                                  style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}}
                                />
                                <datalist id="edit-criteria-markers-list">
                                  {labMarkers.map(m => <option key={m.id} value={m.name} />)}
                                </datalist>
                              </td>
                              <td style={{padding:8,textAlign:'left'}}><input type="number" value={editData.min_value || ''} onChange={e => setEditData({...editData, min_value: e.target.value})} style={{width:'80px',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} /></td>
                              <td style={{padding:8,textAlign:'left'}}><input type="number" value={editData.max_value || ''} onChange={e => setEditData({...editData, max_value: e.target.value})} style={{width:'80px',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} /></td>
                              <td style={{padding:8}}>
                                <select value={editData.operator || 'between'} onChange={e => setEditData({...editData, operator: e.target.value})} style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}}>
                                  <option value="between">between</option>
                                  <option value="<">&lt;</option>
                                  <option value=">">&gt;</option>
                                  <option value="=">=</option>
                                  <option value="<=">&lt;=</option>
                                  <option value=">=">&gt;=</option>
                                </select>
                              </td>
                              <td style={{padding:8}}>
                                <select value={editData.tag_to_apply || ''} onChange={e => setEditData({...editData, tag_to_apply: e.target.value})} style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}}>
                                  <option value="">(none)</option>
                                  {allowedTags.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                              <td style={{padding:8,textAlign:'right'}}>
                                <button className="btn-ghost" onClick={async () => {
                                  try {
                                    const markerId = labMarkers.find(m => m.name === editData.markerName)?.id || editData.marker_id
                                    const res = await fetch(apiUrl(`/api/admin/logic-rules/${l.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ marker_id: markerId, min_value: Number(editData.min_value), max_value: Number(editData.max_value), tag_to_apply: editData.tag_to_apply || null, operator: editData.operator || 'between' }) })
                                    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                    await load()
                                    setEditingId(null)
                                  } catch (err) {
                                    alert('Save criteria failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }} style={{color:'#16a34a'}}>✓</button>
                                <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626'}}>⊘</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{padding:8}}>{(labMarkers.find(m => m.id === l.marker_id) || {}).name || l.marker_id}</td>
                              <td style={{padding:8,textAlign:'left'}}>{l.min_value}</td>
                              <td style={{padding:8,textAlign:'left'}}>{l.max_value}</td>
                              <td style={{padding:8}}>{l.operator || 'between'}</td>
                              <td style={{padding:8}}>{l.tag_to_apply}</td>
                              <td style={{padding:8,textAlign:'right'}}>
                                <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                  <button className="btn-ghost" onClick={() => {
                                    setEditingId(l.id)
                                    setEditData({
                                      marker_id: l.marker_id,
                                      markerName: (labMarkers.find(m => m.id === l.marker_id) || {}).name || '',
                                      min_value: String(l.min_value),
                                      max_value: String(l.max_value),
                                      operator: 'between',
                                      tag_to_apply: l.tag_to_apply
                                    })
                                  }}>✎</button>
                                  <button className="btn-ghost" onClick={() => deleteRule(l.id)} style={{color:'#dc2626'}}>✕</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Types Tab */}
      {activeTab === 'types' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h4 style={{margin:0}}>Resource Types</h4>
                <button 
                  onClick={() => toggleViewMode('types')}
                  style={{background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:4,padding:'6px 12px',cursor:'pointer',fontSize:13,fontWeight:500}}
                >
                  {viewMode.types === 'card' ? '📋 Table' : '🗂️ Cards'}
                </button>
              </div>

              {/* Type creation form */}
              <div style={{marginBottom:16,padding:16,background:'#F8F9FC',borderRadius:6}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <input 
                    placeholder="Resource Type (e.g., article, book, podcast)" 
                    value={newTypeName} 
                    onChange={e => setNewTypeName(e.target.value)}
                    style={{minWidth:200}} 
                  />
                  <button className="btn-primary" onClick={async () => {
                    if (!newTypeName.trim()) return alert('Type name required')
                    try {
                      const res = await fetch(apiUrl('/api/admin/resource-types'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ name: newTypeName.trim() }) })
                      if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                      await loadResourceTypes()
                      setNewTypeName('')
                    } catch (err) {
                      alert('Create type failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }}>Add Type</button>
                </div>
              </div>

              {/* Resource Types Search Filter */}
              <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:12,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Search Resource Types</label>
                    <input
                      type="text"
                      placeholder="Type name..."
                      value={filterResourceTypeName}
                      onChange={e => setFilterResourceTypeName(e.target.value)}
                      list="search-resource-types-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    />
                    <datalist id="search-resource-types-list">
                      {Array.from(new Set(resourceTypes.filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase())))).sort().map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <button 
                    className="btn-ghost" 
                    onClick={() => setFilterResourceTypeName('')}
                    style={{opacity: filterResourceTypeName ? 1 : 0.5,cursor: filterResourceTypeName ? 'pointer' : 'default'}}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Types table/cards */}
              {viewMode.types === 'table' ? (
              <div style={{border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead style={{background:'#fafafa'}}>
                    <tr>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:sortColumn==='name'?'#1F2937':'#666'}} onClick={() => handleSort('name')}>Resource Type{getSortIndicator('name')}</th>
                      <th style={{padding:8,textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sortColumn ? sortData(resourceTypes
                      .filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase()))
                      .map(name => ({name})), 'name').map(obj => obj.name) : resourceTypes
                      .filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase())))
                      .map(rt => (
                      <tr key={rt} style={{borderTop:'1px solid #f3f4f6'}}>
                        {editingId === `type-${rt}` ? (
                          <>
                            <td style={{padding:8}}><input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} /></td>
                            <td style={{padding:8,textAlign:'right'}}>
                              <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                <button className="btn-ghost" onClick={async () => {
                                  try {
                                    const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(rt)}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ new_name: editData.name }) })
                                    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                    await loadResourceTypes()
                                    setEditingId(null)
                                  } catch (err) {
                                    alert('Save type failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }} style={{color:'#16a34a'}}>✓</button>
                                <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626'}}>⊘</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{padding:8}}><strong>{rt}</strong></td>
                            <td style={{padding:8,textAlign:'right'}}>
                              <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                <button className="btn-ghost" onClick={() => {
                                  setEditingId(`type-${rt}`)
                                  setEditData({name: rt})
                                }}>✎</button>
                                <button className="btn-ghost" onClick={async () => {
                                  if (!confirm(`Delete type "${rt}"?`)) return
                                  try {
                                    const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(rt)}`), { method: 'DELETE', headers: authHeaders() })
                                    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                    await loadResourceTypes()
                                  } catch (err) {
                                    alert('Delete type failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }} style={{color:'#dc2626'}}>✕</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:12}}>
                {(sortColumn ? sortData(resourceTypes
                  .filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase()))
                  .map(name => ({name})), 'name').map(obj => obj.name) : resourceTypes
                  .filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase()))).map(rt => (
                  <div key={rt} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}>
                    {editingId === `type-${rt}` ? (
                      <>
                        <input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} autoFocus style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:4,marginBottom:12,fontWeight:600}} />
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={async () => {
                            try {
                              const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(rt)}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ new_name: editData.name }) })
                              if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                              await loadResourceTypes()
                              setEditingId(null)
                            } catch (err) {
                              alert('Save type failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{color:'#16a34a',fontSize:14}}>✓</button>
                          <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626',fontSize:14}}>⊘</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h5 style={{margin:'0 0 12px 0',fontSize:16,fontWeight:600}}>{rt}</h5>
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={() => {setEditingId(`type-${rt}`); setEditData({name: rt})}} style={{fontSize:13}}>✎ Edit</button>
                          <button className="btn-ghost" onClick={async () => {
                            if (!confirm(`Delete type "${rt}"?`)) return
                            try {
                              const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(rt)}`), { method: 'DELETE', headers: authHeaders() })
                              if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                              await loadResourceTypes()
                            } catch (err) {
                              alert('Delete type failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{color:'#dc2626',fontSize:13}}>✕ Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lab Markers Tab */}
      {activeTab === 'markers' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h4 style={{margin:0}}>Lab Markers</h4>
                <button onClick={() => toggleViewMode('markers')} className="btn-outline" style={{fontSize:12}}>{viewMode.markers === 'table' ? '🗂️ Cards' : '📋 Table'}</button>
              </div>

              {/* Marker creation form */}
              <div style={{marginBottom:16,padding:16,background:'#F8F9FC',borderRadius:6}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <input placeholder="Marker name" value={markerName} onChange={e => setMarkerName(e.target.value)} style={{minWidth:200}} />
                  <input placeholder="Unit (optional)" value={markerUnit} onChange={e => setMarkerUnit(e.target.value)} style={{width:120}} />
                  <button className="btn-primary" onClick={async () => {
                    if (!markerName.trim()) return alert('Name required')
                    try {
                      const res = await fetch(apiUrl('/api/admin/lab-markers'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ name: markerName.trim(), unit: markerUnit.trim() }) })
                      if (!res.ok) throw new Error('create marker failed')
                      await load()
                      setMarkerName('')
                      setMarkerUnit('')
                    } catch (err) {
                      console.error('createMarker', err)
                      alert('Create marker failed (check server logs)')
                    }
                  }}>Add Marker</button>
                </div>
              </div>

              {/* Lab Markers Filters */}
              <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:12,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Marker Name</label>
                    <input
                      type="text"
                      placeholder="(All Names)"
                      value={filterLabMarkerName}
                      onChange={e => setFilterLabMarkerName(e.target.value)}
                      list="lab-marker-names-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    />
                    <datalist id="lab-marker-names-list">
                      {Array.from(new Set(labMarkers
                        .filter(m => 
                          (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                        )
                        .map(m => m.name)
                        .filter(n => !filterLabMarkerName || n.toLowerCase().includes(filterLabMarkerName.toLowerCase()))
                      ))
                        .sort((a, b) => a.localeCompare(b))
                        .map(name => <option key={name} value={name} />)
                      }
                    </datalist>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Unit</label>
                    <select
                      value={filterLabMarkerUnit}
                      onChange={e => setFilterLabMarkerUnit(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    >
                      <option value="">(All Units)</option>
                      {Array.from(new Set(labMarkers
                        .filter(m => 
                          (!filterLabMarkerName || m.name === filterLabMarkerName)
                        )
                        .map(m => m.unit).filter(u => u)))
                        .sort((a, b) => (a || '').localeCompare(b || ''))
                        .map(unit => <option key={unit} value={unit || ''}>{unit}</option>)
                      }
                    </select>
                  </div>
                  <button 
                    className="btn-ghost" 
                    onClick={() => {
                      setFilterLabMarkerName('')
                      setFilterLabMarkerUnit('')
                    }}
                    style={{opacity: (filterLabMarkerName || filterLabMarkerUnit) ? 1 : 0.5,cursor: (filterLabMarkerName || filterLabMarkerUnit) ? 'pointer' : 'default'}}
                  >
                    Clear
                  </button>
                </div>
                {(filterLabMarkerName || filterLabMarkerUnit) && (
                  <div style={{fontSize:12,marginTop:8,color:'#666'}}>
                    Showing {labMarkers
                      .filter(m => 
                        (!filterLabMarkerName || m.name === filterLabMarkerName)
                        && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                      )
                      .length
                    } of {labMarkers.length} markers
                  </div>
                )}
              </div>

              {/* Markers table */}
              {viewMode.markers === 'table' ? (
              <div style={{border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead style={{background:'#fafafa'}}>
                    <tr>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:sortColumn==='name'?'#1F2937':'#666'}} onClick={() => handleSort('name')}>Name{getSortIndicator('name')}</th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:sortColumn==='unit'?'#1F2937':'#666'}} onClick={() => handleSort('unit')}>Unit{getSortIndicator('unit')}</th>
                      <th style={{padding:8,textAlign:'right'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sortColumn ? sortData(labMarkers
                      .filter(m => 
                        (!filterLabMarkerName || m.name === filterLabMarkerName)
                        && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                      ), sortColumn) : labMarkers
                      .filter(m => 
                        (!filterLabMarkerName || m.name === filterLabMarkerName)
                        && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                      )).map(m => (
                      <tr key={m.id} style={{borderTop:'1px solid #f3f4f6'}}>
                        {editingId === m.id ? (
                          <>
                            <td style={{padding:8}}><input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} /></td>
                            <td style={{padding:8}}><input type="text" value={editData.unit || ''} onChange={e => setEditData({...editData, unit: e.target.value})} style={{width:'100%',padding:'4px 6px',border:'1px solid #ddd',borderRadius:4}} /></td>
                            <td style={{padding:8,textAlign:'right'}}>
                              <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                <button className="btn-ghost" onClick={async () => {
                                  try {
                                    const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ name: editData.name, unit: editData.unit }) })
                                    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                    await load()
                                    setEditingId(null)
                                  } catch (err) {
                                    alert('Save marker failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }} style={{color:'#16a34a'}}>✓</button>
                                <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626'}}>⊘</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{padding:8}}><strong>{m.name}</strong></td>
                            <td style={{padding:8}} className="small muted">{m.unit || '—'}</td>
                            <td style={{padding:8,textAlign:'right'}}>
                              <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                                <button className="btn-ghost" onClick={() => {
                                  setEditingId(m.id)
                                  setEditData({name: m.name, unit: m.unit})
                                }}>✎</button>
                                <button className="btn-ghost" onClick={async () => {
                                  if (!confirm(`Delete marker "${m.name}"?`)) return
                                  try {
                                    const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'DELETE', headers: authHeaders() })
                                    if (!res.ok) {
                                      const errText = await res.text().catch(() => '')
                                      const errObj = errText ? JSON.parse(errText).detail : {}
                                      if (errObj.code === '23503') {
                                        throw new Error(`This marker is being used in criteria. Delete the criteria first, then delete the marker.`)
                                      }
                                      throw new Error(errText || String(res.status))
                                    }
                                    await load()
                                  } catch (err) {
                                    alert('Delete marker failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }} style={{color:'#dc2626'}}>✕</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:12}}>
                {labMarkers
                  .filter(m => 
                    (!filterLabMarkerName || m.name === filterLabMarkerName)
                    && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                  )
                  .map(m => (
                  <div key={m.id} style={{background:'white',border:'1px solid #e5e7eb',borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}>
                    {editingId === m.id ? (
                      <>
                        <input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} autoFocus style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:4,marginBottom:8,fontWeight:600}} />
                        <input type="text" value={editData.unit || ''} onChange={e => setEditData({...editData, unit: e.target.value})} placeholder="Unit" style={{width:'100%',padding:'8px',border:'1px solid #ddd',borderRadius:4,marginBottom:12,fontSize:12}} />
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={async () => {
                            try {
                              const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ name: editData.name, unit: editData.unit }) })
                              if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                              await load()
                              setEditingId(null)
                            } catch (err) {
                              alert('Save marker failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{color:'#16a34a',fontSize:14}}>✓</button>
                          <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626',fontSize:14}}>⊘</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <h5 style={{margin:'0 0 4px 0',fontSize:16,fontWeight:600}}>{m.name}</h5>
                        {m.unit && <p style={{margin:'0 0 12px 0',fontSize:12,color:'#666'}}>Unit: {m.unit}</p>}
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={() => {setEditingId(m.id); setEditData({name: m.name, unit: m.unit})}} style={{fontSize:13}}>✎ Edit</button>
                          <button className="btn-ghost" onClick={async () => {
                            if (!confirm(`Delete marker "${m.name}"?`)) return
                            try {
                              const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'DELETE', headers: authHeaders() })
                              if (!res.ok) {
                                const errText = await res.text().catch(() => '')
                                const errObj = errText ? JSON.parse(errText).detail : {}
                                if (errObj.code === '23503') {
                                  throw new Error(`This marker is being used in criteria. Delete the criteria first, then delete the marker.`)
                                }
                                throw new Error(errText || String(res.status))
                              }
                              await load()
                            } catch (err) {
                              alert('Delete marker failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{color:'#dc2626',fontSize:13}}>✕ Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h4 style={{margin:0}}>Tags</h4>
                <button onClick={() => toggleViewMode('tags')} className="btn-outline" style={{fontSize:12}}>{viewMode.tags === 'table' ? '🗂️ Cards' : '📋 Table'}</button>
              </div>

              {/* Tag creation form */}
              <div style={{marginBottom:16,padding:16,background:'#F8F9FC',borderRadius:6}}>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <input
                    placeholder="Tag name"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (tagInput.trim()) {
                          addTag(tagInput.trim())
                          setTagInput('')
                        }
                      }
                    }}
                    style={{minWidth:200}}
                  />
                  <button className="btn-primary" onClick={async () => {
                    if (!tagInput.trim()) return
                    await addTag(tagInput.trim())
                    setTagInput('')
                  }}>Add Tag</button>
                </div>
              </div>

              {/* Tags Search Filter */}
              <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:6,padding:12,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Search Tags</label>
                    <input
                      type="text"
                      placeholder="Tag name..."
                      value={filterTagName}
                      onChange={e => setFilterTagName(e.target.value)}
                      list="search-tags-list"
                      style={{width:'100%',padding:'6px 8px',border:'1px solid #d1d5db',borderRadius:4,fontSize:14}}
                    />
                    <datalist id="search-tags-list">
                      {Array.from(new Set(allowedTags.filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase())))).sort().map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <button 
                    className="btn-ghost" 
                    onClick={() => setFilterTagName('')}
                    style={{opacity: filterTagName ? 1 : 0.5,cursor: filterTagName ? 'pointer' : 'default'}}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tags Grid */}
              {viewMode.tags === 'table' ? (
              <div style={{border:'1px solid #eee',borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
                      <th style={{padding:12,textAlign:'left',fontWeight:600}}>Tag Name</th>
                      <th style={{padding:12,textAlign:'left',fontWeight:600}}>Usage</th>
                      <th style={{padding:12,textAlign:'right',fontWeight:600}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(sortColumn ? sortData(allowedTags
                      .filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase()))
                      .map(name => ({name})), 'name').map(obj => obj.name) : allowedTags
                      .filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase()))).map(t => {
                      const usageCount = getTagUsageCount(t)
                      return (
                        <tr key={t} style={{borderBottom:'1px solid #eee'}}>
                          <td style={{padding:12,fontWeight:500}}>{t}</td>
                          <td style={{padding:12,fontSize:12,color:'#666'}}>Used in {usageCount} place{usageCount !== 1 ? 's' : ''}</td>
                          <td style={{padding:12,textAlign:'right'}}>
                            <div style={{display:'flex',gap:4,justifyContent:'flex-end'}}>
                              <button className="btn-ghost" onClick={() => {setEditingId(`tag-${t}`); setEditData({name: t})}} style={{fontSize:13}}>✎ Edit</button>
                              <button className="btn-ghost" onClick={async () => {
                                if (!confirm(`Delete tag "${t}"?`)) return
                                try {
                                  const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(t)}`), { method: 'DELETE', headers: authHeaders() })
                                  if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                  await load()
                                } catch (err) {
                                  alert('Delete tag failed — ' + ((err as any)?.message || 'check server logs'))
                                }
                              }} style={{color:'#dc2626',fontSize:13}}>✕ Delete</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:12}}>
                {(sortColumn ? sortData(allowedTags
                  .filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase()))
                  .map(name => ({name})), 'name').map(obj => obj.name) : allowedTags
                  .filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase()))).map(t => {
                  const usageCount = getTagUsageCount(t)
                  const tagColor = getTagColor(t)
                  return (
                    <div key={t} style={{
                      background:'white',
                      border: editingId === `tag-${t}` ? `2px solid ${tagColor}` : `1px solid #e5e7eb`,
                      borderRadius:8,
                      padding:16,
                      boxShadow:'0 1px 2px rgba(0,0,0,0.05)',
                      transition:'all 0.2s'
                    }}>
                      {editingId === `tag-${t}` ? (
                        <>
                          <input 
                            type="text" 
                            value={editData.name || ''} 
                            onChange={e => setEditData({...editData, name: e.target.value})}
                            autoFocus
                            style={{width:'100%',padding:'8px 8px',border:'1px solid #ddd',borderRadius:4,marginBottom:12,fontWeight:500}}
                          />
                          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                            <button className="btn-ghost" onClick={async () => {
                              try {
                                const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(t)}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ new_name: editData.name.trim() }) })
                                if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                await loadTags()
                                await load()
                                setEditingId(null)
                              } catch (err) {
                                alert('Save tag failed — ' + ((err as any)?.message || 'check server logs'))
                              }
                            }} style={{color:'#16a34a',fontSize:16}}>✓</button>
                            <button className="btn-ghost" onClick={() => setEditingId(null)} style={{color:'#dc2626',fontSize:16}}>⊘</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                            <div style={{width:12,height:12,borderRadius:'50%',background:tagColor}}></div>
                            <strong style={{fontSize:16,flex:1}}>{t}</strong>
                          </div>
                          <div style={{fontSize:12,color:'#666',marginBottom:12}}>
                            Used in <span style={{fontWeight:600,color:'#1F2937'}}>{usageCount}</span> {usageCount === 1 ? 'place' : 'places'}
                          </div>
                          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                            <button className="btn-ghost" onClick={() => {
                              setEditingId(`tag-${t}`)
                              setEditData({name: t})
                            }} style={{fontSize:14}}>✎ Edit</button>
                            <button className="btn-ghost" onClick={async () => {
                              if (!confirm(`Delete tag "${t}"? This will remove it from resources and delete any criteria referencing it.`)) return
                              try {
                                const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(t)}`), { method: 'DELETE', headers: authHeaders() })
                                if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                await loadTags()
                                await load()
                              } catch (err) {
                                alert('Delete tag failed — ' + ((err as any)?.message || 'check server logs'))
                              }
                            }} style={{color:'#dc2626',fontSize:14}}>✕ Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
