import React, { useEffect, useState, useCallback } from 'react'
import { supabase, directFetch } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'

type Resource = { id?: string; type: string; title: string; description?: string | null; tags: string[]; categories?: string[]; link_url?: string | null }
type EditData = { tags?: string[]; categories?: string[]; [key: string]: any }

export default function Admin({ onResourcesChanged }: { onResourcesChanged?: () => void }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkProtocol, setLinkProtocol] = useState('https://')
  const [type, setType] = useState('video')
  // tag-manager state
  const [allowedTags, setAllowedTags] = useState<string[]>([])
  const [tagsMeta, setTagsMeta] = useState<Record<string, { categories?: string[] }>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagCreateCategory, setTagCreateCategory] = useState<string>('')

  // criteria / logic_rules state
  const [labMarkers, setLabMarkers] = useState<Array<any>>([])
  const [logicRules, setLogicRules] = useState<Array<any>>([])
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<{ markerName?: string; min_value?: string; max_value?: string; tag_to_apply?: string }>({})

  // inline marker-creation state
  const [markerCreationVisible, setMarkerCreationVisible] = useState(false)
  const [markerName, setMarkerName] = useState('')
  const [markerUnit, setMarkerUnit] = useState('')
  const [markerMinNormal, setMarkerMinNormal] = useState<number | null>(null)
  const [markerMaxNormal, setMarkerMaxNormal] = useState<number | null>(null)

  const [activeTab, setActiveTab] = useState<'resources' | 'types' | 'markers' | 'tags' | 'categories' | 'criteria' | 'goals' | 'audit'>('resources')
  // Use global theme context
  const { darkMode, theme: globalTheme } = useTheme()
  // View mode per tab (card or table)
  const [viewMode, setViewMode] = useState<Record<string, 'card' | 'table'>>({
    resources: 'card',
    types: 'card',
    markers: 'card',
    tags: 'card',
    categories: 'card',
    criteria: 'table',
    goals: 'card',
    audit: 'table'
  })
  const [resourceTypes, setResourceTypes] = useState<string[]>([])
  const [newTypeName, setNewTypeName] = useState('')
  const [createResourceOpen, setCreateResourceOpen] = useState(false)
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [filterKeyword, setFilterKeyword] = useState('')
  const [filterTypes, setFilterTypes] = useState<string[]>([])
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [auditRows, setAuditRows] = useState<Array<any>>([])
  const [healthGoals, setHealthGoals] = useState<Array<{id: string; name: string; description?: string; is_active: boolean}>>([])
  const [categories, setCategories] = useState<Array<{id: string; name: string; description?: string; is_active: boolean}>>([])
  const [categoriesError, setCategoriesError] = useState<string | null>(null)
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
  const [editData, setEditData] = useState<EditData>({})
  const [editingTagsDropdownOpen, setEditingTagsDropdownOpen] = useState(false)
  const [editingCategoriesDropdownOpen, setEditingCategoriesDropdownOpen] = useState(false)
  // category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)
  const [categoryModalData, setCategoryModalData] = useState<any>(null)
  const [categoryEditForm, setCategoryEditForm] = useState<any>({})
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [categoryDescription, setCategoryDescription] = useState<string>('')
  // Tag edit modal state
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const [tagModalOriginalName, setTagModalOriginalName] = useState<string | null>(null)
  const [tagEditForm, setTagEditForm] = useState<{name?: string; categories?: string[]}>({})
  // Marker edit modal state
  const [markerModalOpen, setMarkerModalOpen] = useState(false)
  const [markerModalOriginalId, setMarkerModalOriginalId] = useState<string | null>(null)
  const [markerEditForm, setMarkerEditForm] = useState<{name?: string; unit?: string; min_normal?: number | null; max_normal?: number | null}>({})
  // health goal modal state
  const [healthGoalModalOpen, setHealthGoalModalOpen] = useState(false)
  const [healthGoalModalData, setHealthGoalModalData] = useState<any>(null)
  const [isEditingHealthGoal, setIsEditingHealthGoal] = useState(false)
  const [healthGoalEditForm, setHealthGoalEditForm] = useState<{name?: string; description?: string}>({})
  // resource modal state
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [resourceModalData, setResourceModalData] = useState<any>(null)
  const [isEditingResource, setIsEditingResource] = useState(false)
  const [resourceEditForm, setResourceEditForm] = useState<{title?: string; type?: string; tags?: string[]; categories?: string[]; link_url?: string; link_protocol?: string}>({})
  // resource type modal state
  const [resourceTypeModalOpen, setResourceTypeModalOpen] = useState(false)
  const [resourceTypeModalData, setResourceTypeModalData] = useState<any>(null)
  const [isEditingResourceType, setIsEditingResourceType] = useState(false)
  const [resourceTypeEditForm, setResourceTypeEditForm] = useState<{name?: string}>({})
  const [originalResourceTypeName, setOriginalResourceTypeName] = useState<string>('')
  const DEV_BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  // session override for dev convenience (not persisted)
  const [devKeyOverride, setDevKeyOverride] = useState<string | null>(null)
  function effectiveDevKey() { return devKeyOverride || DEV_BACKEND_KEY }

  // New Marker Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardMarkerName, setWizardMarkerName] = useState('')
  const [wizardMarkerUnit, setWizardMarkerUnit] = useState('')
  const [wizardRules, setWizardRules] = useState([
    { label: 'Optimal', min_value: '', max_value: '', tag_name: '' },
    { label: 'Improvement', min_value: '', max_value: '', tag_name: '' },
    { label: 'Out of Range', min_value: '', max_value: '', tag_name: '' }
  ])
  const [wizardSaving, setWizardSaving] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)

  function openWizard() {
    setWizardStep(1)
    setWizardMarkerName('')
    setWizardMarkerUnit('')
    setWizardRules([
      { label: 'Optimal', min_value: '', max_value: '', tag_name: '' },
      { label: 'Improvement', min_value: '', max_value: '', tag_name: '' },
      { label: 'Out of Range', min_value: '', max_value: '', tag_name: '' }
    ])
    setWizardError(null)
    setWizardOpen(true)
  }

  function autoSuggestTags(markerName: string) {
    const base = markerName.trim().replace(/\s+/g, '_')
    if (!base) return
    setWizardRules(prev => prev.map((r, i) => {
      if (r.tag_name) return r // don't overwrite user edits
      const prefix = i === 0 ? 'Normal' : i === 1 ? 'Borderline' : 'High'
      return { ...r, tag_name: `${prefix}_${base}` }
    }))
  }

  function updateWizardRule(index: number, field: string, value: string) {
    setWizardRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function wizardSave() {
    setWizardSaving(true)
    setWizardError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/new-marker-wizard'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: wizardMarkerName.trim(), unit: wizardMarkerUnit.trim(), rules: wizardRules })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setWizardError(body.message || body.error || 'Save failed')
        return
      }
      setWizardOpen(false)
      await load()
    } catch (err: any) {
      setWizardError(err.message || 'Save failed')
    } finally {
      setWizardSaving(false)
    }
  }

  // Modal state for tag/category selection with search
  const [tagSearchModalOpen, setTagSearchModalOpen] = useState(false)
  const [tagSearchInput, setTagSearchInput] = useState('')
  const [tagSearchContext, setTagSearchContext] = useState<'create' | 'edit' | 'filter-type' | 'filter-tag'>('create')
  const [categorySearchModalOpen, setCategorySearchModalOpen] = useState(false)
  const [categorySearchInput, setCategorySearchInput] = useState('')
  const [categorySearchContext, setCategorySearchContext] = useState<'create' | 'edit' | 'filter'>('create')

  // Theme colors - use global theme from context
  const theme = {
    bg: globalTheme.bg,
    bgSecondary: globalTheme.bgSecondary,
    bgTertiary: darkMode ? '#252525' : '#F8F9FC',
    text: globalTheme.text,
    textMuted: globalTheme.textMuted,
    border: darkMode ? '#555' : '#e5e7eb',
    borderLight: darkMode ? '#444' : '#eee',
    borderColor: globalTheme.borderColor,
    card: globalTheme.card
  }

  // Common inline styles using theme
  const styles = {
    input: {width:'100%' as const,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text},
    inputSmall: {padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bgSecondary,color:theme.text},
    select: {width:'100%' as const,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text},
    selectSmall: {padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bgSecondary,color:theme.text},
    table: {width:'100%' as const,borderCollapse:'collapse' as const,color:theme.text},
    tableHeader: {background:'#3D7DCA',borderBottom:`1px solid ${theme.borderColor}`,color:'#ffffff',fontWeight:500},
    tableRow: {background:theme.bg, borderTop:`1px solid ${theme.borderColor}`},
    filterBox: {background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:12,marginBottom:16}
  }

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
  function authHeaders(): Record<string, string> {
    const k = effectiveDevKey()
    return k ? { 'x-backend-api-key': k } : {}
  }
  function stripProtocol(url: string): string {
    if (!url) return ''
    return url.replace(/^https?:\/\//, '')
  }
  function buildFullUrl(protocol: string, url: string): string {
    if (!url) return ''
    const cleanUrl = stripProtocol(url)
    return `${protocol}${cleanUrl}`
  }
  function getProtocol(url: string): string {
    if (!url) return 'https://'
    return url.startsWith('http://') ? 'http://' : 'https://'
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
  function toggleViewMode(tab: string) {
    setViewMode(prev => ({
      ...prev,
      [tab]: prev[tab] === 'card' ? 'table' : 'card'
    }))
  }
  async function fetchJson(input: string, init: RequestInit = {}, signal?: AbortSignal) {
    const headers = { ...(init.headers || {}), ...(authHeaders()) }
    const res = await fetch(apiUrl(input), { ...init, headers, signal })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      const err = new Error(`${res.status} ${body}`)
      ;(err as any).status = res.status
      ;(err as any).body = body
      throw err
    }
    return res.json().catch(() => null)
  }

  // Format error messages to be user-friendly
  function formatErrorMessage(error: any, itemType: string = 'item'): string {
    const msg = String(error?.message || error?.error || error || 'Unknown error')
    const detailMsg = error?.detail?.message || error?.detail || ''
    const body = (error as any)?.body || ''
    const fullText = (msg + ' ' + detailMsg + ' ' + body).toLowerCase()
    
    // Detect duplicate/unique constraint violations
    if (fullText.includes('duplicate') || fullText.includes('unique') || fullText.includes('already exists') || fullText.includes('23505')) {
      return `A ${itemType} with this name already exists. Please use a different name.`
    }
    
    // Detect foreign key constraint violations
    if (fullText.includes('foreign key') || fullText.includes('constraint') || fullText.includes('23503')) {
      return `Cannot perform this action: this ${itemType} is still in use. Please remove all references first.`
    }
    
    // Detect missing required fields
    if (fullText.includes('not null') || fullText.includes('missing') || fullText.includes('required')) {
      return `Please fill in all required fields (name is required).`
    }
    
    // Generic fallback
    return `Failed to save ${itemType}. Please check your input and try again.`
  }

  // Focus trap handler for modals - keeps Tab within modal
  const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const focusableElements = (e.currentTarget as HTMLDivElement).querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  }

  // Separate controllers for each async function to prevent cross-interference
  const loadControllerRef = React.useRef<AbortController | null>(null)
  const loadAuditControllerRef = React.useRef<AbortController | null>(null)
  const loadTagsControllerRef = React.useRef<AbortController | null>(null)
  const loadResourceTypesControllerRef = React.useRef<AbortController | null>(null)
  const loadHealthGoalsControllerRef = React.useRef<AbortController | null>(null)
  const loadCategoriesControllerRef = React.useRef<AbortController | null>(null)

  async function load() {
    // cancel previous load
    try { loadControllerRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadControllerRef.current = controller
    setLoading(true)
    try {
      const body = await fetchJson('/api/admin/content', {}, controller.signal)
      if (controller.signal.aborted) return
      // ensure caller gets normalized shapes (resources already normalized upstream)
      setResources((body && body.resources) || [])
      setLogicRules((body && body.logic_rules) || [])
      setLabMarkers((body && body.lab_markers) || [])
    } catch (err) {
      // Ignore aborts (expected when controller is cancelled, e.g. React StrictMode double-invoke in dev)
      if (err && ((err as any)?.name === 'AbortError' || controller.signal.aborted)) return
      console.error('load admin content failed', err)
      if (!controller.signal.aborted) alert('Failed to load admin content — ' + ((err as any)?.message || 'check server logs'))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      if (loadControllerRef.current === controller) loadControllerRef.current = null
    }
  }

  async function loadAudit() {
    try { loadAuditControllerRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadAuditControllerRef.current = controller
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/audit'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}, signal: controller.signal })
      const body = await res.json()
      if (controller.signal.aborted) return
      setAuditRows(body || [])
    } catch (err) {
      if (!controller.signal.aborted) console.error('loadAudit', err)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      if (loadAuditControllerRef.current === controller) loadAuditControllerRef.current = null
    }
  }

  // load canonical tags for the tag-manager
  async function loadTags() {
    try { loadTagsControllerRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadTagsControllerRef.current = controller
    try {
      const res = await fetch(apiUrl('/api/admin/tags'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}, signal: controller.signal })
      if (!res.ok || controller.signal.aborted) return
      const body = await res.json()
      if (controller.signal.aborted) return
      // support legacy array-of-strings OR new array-of-objects {name, categories: string[]}
      if (Array.isArray(body) && body.length > 0 && typeof body[0] === 'object' && body[0] !== null) {
        const objs: Array<any> = body
        const names = objs.map(o => String(o.name || '')).filter(Boolean)
        setAllowedTags(names)
        const meta: Record<string, any> = {}
        objs.forEach(o => { if (o && o.name) meta[String(o.name)] = { categories: Array.isArray(o.categories) ? o.categories : (o.category ? [o.category] : []) } })
        setTagsMeta(meta)
      } else {
        const names = Array.isArray(body) ? body.map(String) : []
        setAllowedTags(names)
        setTagsMeta({})
      }
    } catch (err) {
      if (!controller.signal.aborted) console.error('loadTags', err)
    } finally {
      if (loadTagsControllerRef.current === controller) loadTagsControllerRef.current = null
    }
  }

  // load resource types
  async function loadResourceTypes() {
    try { loadResourceTypesControllerRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadResourceTypesControllerRef.current = controller
    try {
      const res = await fetch(apiUrl('/api/admin/resource-types'), { headers: DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}, signal: controller.signal })
      if (!res.ok || controller.signal.aborted) return
      const body = await res.json()
      if (controller.signal.aborted) return
      const names = Array.isArray(body) ? body.map((t: any) => (t.name || t).toLowerCase()) : []
      console.log('loadResourceTypes response:', body)
      console.log('Extracted names:', names)
      setResourceTypes(names)
      // Normalize or default the create dropdown value to match available resource types
      if (names.length > 0) {
        const currentTypeLower = (type || '').toLowerCase()
        const match = names.find(n => (n || '').toLowerCase() === currentTypeLower)
        if (match) {
          if (match !== type) {
            console.info('normalizing type to match available type casing:', match)
            setType(match)
          }
        } else if (!type || !names.some(n => (n || '').toLowerCase() === currentTypeLower)) {
          console.info('defaulting type to first resourceType:', names[0])
          setType(names[0])
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) console.error('loadResourceTypes', err)
    } finally {
      if (loadResourceTypesControllerRef.current === controller) loadResourceTypesControllerRef.current = null
    }
  }

  // load health goals using direct fetch (more reliable)
  async function loadHealthGoals(retryCount = 0) {
    try {
      try { loadHealthGoalsControllerRef.current?.abort() } catch {}
      const controller = new AbortController()
      loadHealthGoalsControllerRef.current = controller

      console.log(`[Admin] Loading health goals (attempt ${retryCount + 1})...`)

      const { data, error } = await directFetch<{
        id: string
        name: string
        description?: string
        is_active: boolean
      }>('health_goals', {
        order: { column: 'name', ascending: true },
        timeout: 8000
      })

      if (controller.signal.aborted) return
      if (error) {
        throw error
      }
      setHealthGoals(data || [])
      console.log('[Admin] Successfully loaded health goals')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('loadHealthGoals', err)
      // Auto-retry on timeout
      if (errorMsg.includes('timeout') && retryCount < 2) {
        console.log(`[Admin] Health goals timeout, retrying (attempt ${retryCount + 2})...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        loadHealthGoals(retryCount + 1)
      }
    }
  }

  // load categories via server admin endpoint (requires backend key)
  async function loadCategories(retryCount = 0) {
    try {
      try { loadCategoriesControllerRef.current?.abort() } catch {}
      const controller = new AbortController()
      loadCategoriesControllerRef.current = controller

      console.log(`[Admin] Loading categories (attempt ${retryCount + 1})...`)

      const data = await fetchJson('/api/admin/categories', { method: 'GET' }, controller.signal).catch(err => { throw err })
      if (controller.signal.aborted) return
      setCategoriesError(null)
      setCategories(Array.isArray(data) ? data : [])
      console.log('[Admin] Successfully loaded categories')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('loadCategories', err)
      setCategoriesError(errorMsg)
      // Auto-retry on timeout
      if (errorMsg.includes('timeout') && retryCount < 2) {
        console.log(`[Admin] Categories timeout, retrying (attempt ${retryCount + 2})...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        loadCategories(retryCount + 1)
      }
    }
  }

  async function addTag(name: string) {
    const clean = (name || '').toString().trim()
    if (!clean) return null
    try {
      const payload: any = { name: clean }
      if (tagCreateCategory) payload.categories = [tagCreateCategory]
      const res = await fetch(apiUrl('/api/admin/tags'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        alert(formatErrorMessage(errorData, 'tag'))
        console.warn('addTag: server rejected tag creation', { status: res.status, errorData })
        return { name: clean, persisted: false }
      }
      const body = await res.json().catch(() => ({}))
      await loadTags()
      setTagInput('')
      return body
    } catch (err) {
      alert(formatErrorMessage(err, 'tag'))
      console.error('addTag error:', err)
      return { name: clean, persisted: false }
    }
  }

  // Helper functions to count resources by type and category
  function getResourceTypeCount(type: string): number {
    return resources.filter(r => (r.type || '').toLowerCase() === (type || '').toLowerCase()).length
  }

  function getCategoryCount(category: string): number {
    return resources.filter(r => (r.categories || []).includes(category)).length
  }

  function getTagCount(tag: string): number {
    return resources.filter(r => (r.tags || []).includes(tag)).length
  }

  // Reusable button styles for Edit/Delete buttons on cards
  const cardButtonStyles = {
    edit: {
      background:'transparent',
      border:'1.5px solid #3D7DCA',
      borderRadius:6,
      padding:'8px 14px',
      cursor:'pointer',
      fontSize:13,
      color:'#3D7DCA',
      fontWeight:500,
      transition:'all 0.2s'
    },
    delete: {
      background:'transparent',
      border:'1.5px solid #dc2626',
      borderRadius:6,
      padding:'8px 14px',
      cursor:'pointer',
      fontSize:13,
      color:'#dc2626',
      fontWeight:500,
      transition:'all 0.2s'
    }
  }

  // Reusable button styles for Edit/Delete buttons on tables
  const tableButtonStyles = {
    edit: {
      background:'transparent',
      border:`1.5px solid #3D7DCA`,
      borderRadius:4,
      padding:'6px',
      cursor:'pointer',
      fontSize:16,
      color:'#3D7DCA',
      transition:'all 0.2s'
    },
    delete: {
      background:'transparent',
      border:'1.5px solid #dc2626',
      borderRadius:4,
      padding:'6px',
      cursor:'pointer',
      fontSize:16,
      color:'#dc2626',
      transition:'all 0.2s'
    }
  }

  // Helper function for button hover effects
  const getButtonHoverHandlers = (isDelete: boolean = false) => ({
    onMouseEnter: (e: any) => {
      if (isDelete) {
        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)'
        e.currentTarget.style.borderColor = '#b91c1c'
        e.currentTarget.style.color = '#b91c1c'
      } else {
        e.currentTarget.style.background = 'rgba(61, 125, 202, 0.08)'
        e.currentTarget.style.borderColor = '#2B5FA0'
        e.currentTarget.style.color = '#2B5FA0'
      }
    },
    onMouseLeave: (e: any) => {
      if (isDelete) {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = '#dc2626'
        e.currentTarget.style.color = '#dc2626'
      } else {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = '#3D7DCA'
        e.currentTarget.style.color = '#3D7DCA'
      }
    }
  })

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

  useEffect(() => { load(); loadTags(); loadResourceTypes(); loadHealthGoals(); loadCategories() }, [])

  useEffect(() => {
    if (activeTab === 'resources') load()
    else if (activeTab === 'types') loadResourceTypes()
    else if (activeTab === 'tags') loadTags()
    else if (activeTab === 'categories') loadCategories()
    else if (activeTab === 'goals') loadHealthGoals()
    else if (activeTab === 'markers') load()
    else if (activeTab === 'criteria') load()
    else if (activeTab === 'audit') loadAudit()
  }, [activeTab])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (resourceModalOpen) {
          setResourceModalOpen(false)
          setIsEditingResource(false)
        } else if (resourceTypeModalOpen) {
          setResourceTypeModalOpen(false)
          setIsEditingResourceType(false)
        } else if (healthGoalModalOpen) {
          setHealthGoalModalOpen(false)
          setIsEditingHealthGoal(false)
        }
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [resourceModalOpen, resourceTypeModalOpen, healthGoalModalOpen])

  async function create() {
    const fullUrl = linkUrl ? buildFullUrl(linkProtocol, linkUrl) : null
    const payload = { type: (type || '').toLowerCase(), title, description: null, tags: selectedTags.map(s => s.trim()).filter(Boolean), categories: selectedCategories, link_url: fullUrl }
    console.info('create payload', payload)
    try {
      const res = await fetch(apiUrl('/api/admin/resources'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(`create failed: ${res.status} ${txt}`)
      }
      setTitle('')
      setLinkUrl('')
      setSelectedTags([])
      setSelectedCategories([])
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

  // Helper to handle tag selection from modal
  const handleTagSelect = (tag: string) => {
    if (tagSearchContext === 'create') {
      setSelectedTags(prev => prev.includes(tag) ? prev : [...prev, tag])
    } else if (tagSearchContext === 'edit') {
      if (resourceModalOpen && isEditingResource) {
        // Editing resource in modal
        setResourceEditForm(prev => ({...prev, tags: (prev.tags || []).includes(tag) ? prev.tags : [...(prev.tags || []), tag]}))
      } else {
        // Editing resource in table (inline)
        setEditData(prev => {
          const tags = (prev as any)?.tags || []
          return {
            ...prev,
            tags: tags.includes(tag) ? tags : [...tags, tag]
          }
        })
      }
    } else if (tagSearchContext === 'filter-type') {
      setFilterTypes(prev => prev.includes(tag) ? prev : [...prev, tag])
    } else if (tagSearchContext === 'filter-tag') {
      setFilterTags(prev => prev.includes(tag) ? prev : [...prev, tag])
    }
    setTagSearchInput('')
  }

  // Helper to handle category selection from modal
  const handleCategorySelect = (category: string) => {
    if (categorySearchContext === 'create') {
      setSelectedCategories(prev => prev.includes(category) ? prev : [category, ...prev])
    } else if (categorySearchContext === 'edit') {
      if (resourceModalOpen && isEditingResource) {
        // Editing resource in modal
        setResourceEditForm(prev => ({...prev, categories: (prev.categories || []).includes(category) ? prev.categories : [category, ...(prev.categories || [])]}))
      } else {
        // Editing resource in table (inline)
        setEditData(prev => {
          const categories = (prev as any)?.categories || []
          return {
            ...prev,
            categories: categories.includes(category) ? categories : [category, ...categories]
          }
        })
      }
    } else if (categorySearchContext === 'filter') {
      setFilterCategories(prev => prev.includes(category) ? prev : [category, ...prev])
    }
    setCategorySearchInput('')
  }

  return (
    <div className="card" style={{background:theme.bg,color:theme.text}}>
      <h3 style={{color:theme.text}}>Admin — Content manager (dev)</h3>



      <div style={{height:12}} />

      {/* Tab Navigation */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')} style={{color: activeTab === 'resources' ? '#ffffff' : theme.text}}>Resources</button>
        <button className={`tab ${activeTab === 'types' ? 'active' : ''}`} onClick={() => setActiveTab('types')} style={{color: activeTab === 'types' ? '#ffffff' : theme.text}}>Resource Types</button>
        <button className={`tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')} style={{color: activeTab === 'categories' ? '#ffffff' : theme.text}}>Categories</button>
        <button className={`tab ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')} style={{color: activeTab === 'tags' ? '#ffffff' : theme.text}}>Tags</button>
        <button className={`tab ${activeTab === 'markers' ? 'active' : ''}`} onClick={() => setActiveTab('markers')} style={{color: activeTab === 'markers' ? '#ffffff' : theme.text}}>Lab Markers</button>
        <button className={`tab ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')} style={{color: activeTab === 'goals' ? '#ffffff' : theme.text}}>Health Goals</button>
        <button className={`tab ${activeTab === 'criteria' ? 'active' : ''}`} onClick={() => setActiveTab('criteria')} style={{color: activeTab === 'criteria' ? '#ffffff' : theme.text}}>Criteria</button>
      </div>

      {/* Audit Log hidden in main UI - gated behind secret access */}
      {activeTab === 'audit' ? (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Audit Log</h3>

              {/* Audit Filters */}
              <div style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:12,marginBottom:16}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Filter Audit Log</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.textMuted}}>Action</label>
                    <select
                      value={filterAuditAction}
                      onChange={e => setFilterAuditAction(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                    >
                      <option value="">(All Actions)</option>
                      {Array.from(new Set(auditRows.map(a => a.action))).sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })).map(action => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.textMuted}}>Table</label>
                    <select
                      value={filterAuditTable}
                      onChange={e => setFilterAuditTable(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                    >
                      <option value="">(All Tables)</option>
                      {Array.from(new Set(auditRows.map(a => a.target_table))).sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })).map(table => (
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
                  <tr style={{background:'#3D7DCA',borderBottom:`1px solid ${theme.borderColor}`}}>
                    <th style={{cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500,padding:'8px'}} onClick={() => handleSort('created_at')}>when{getSortIndicator('created_at')}</th>
                    <th style={{cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500,padding:'8px'}} onClick={() => handleSort('action')}>action{getSortIndicator('action')}</th>
                    <th style={{cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500,padding:'8px'}} onClick={() => handleSort('target_table')}>target{getSortIndicator('target_table')}</th>
                    <th style={{color:'#ffffff',fontWeight:500,padding:'8px'}}>details</th>
                  </tr>
                </thead>
                <tbody>
                  {(sortColumn ? sortData(auditRows
                    .filter(a => (!filterAuditAction || a.action === filterAuditAction) && (!filterAuditTable || a.target_table === filterAuditTable)), sortColumn) : auditRows
                    .filter(a => (!filterAuditAction || a.action === filterAuditAction) && (!filterAuditTable || a.target_table === filterAuditTable))).map(a => (
                    <tr key={a.id} style={{borderTop:`1px solid ${theme.borderColor}`}}>
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
          <style>{`input[list] { appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: none !important; } input[list]::-webkit-calendar-picker-indicator { display: none !important; }`}</style>
          {loading ? <div>Loading…</div> : (
            <div>
              {/* Create New Resource - Always Visible */}
              <div style={{marginBottom:40,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                  <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Create New Resource</h3>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <select value={type} onChange={e => { console.info('type select changed:', e.target.value); setType(e.target.value) }} style={{width:100,flexShrink:0,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                      {(resourceTypes || []).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(rt => <option key={rt} value={rt}>{rt}</option>)}
                    </select>
                    <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{flex:1,minWidth:200,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                    <div style={{display:'flex',gap:6,minWidth:300}}>
                      <select value={linkProtocol} onChange={e => setLinkProtocol(e.target.value)} style={{width:100,flexShrink:0,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                        <option value="https://">https://</option>
                        <option value="http://">http://</option>
                      </select>
                      <input placeholder="example.com" value={linkUrl} onChange={e => setLinkUrl(stripProtocol(e.target.value))} style={{flex:1,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                    </div>
                    <button className="btn-primary" onClick={create} disabled={!title}>Create</button>
                  </div>
                  <div style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                    <div>
                      <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Categories:</label>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        {selectedCategories.map(c => (
                          <div key={c} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#10b981',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                            <span>{c}</span>
                            <button onClick={() => setSelectedCategories(s => s.filter(x => x !== c))} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                          </div>
                        ))}
                        <div style={{position:'relative'}}>
                          <button
                            onClick={() => {setCategorySearchModalOpen(true); setCategorySearchContext('create'); setCategorySearchInput('')}}
                            style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                          >
                            + Add Category
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Tags:</label>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                        {selectedTags.map(t => (
                          <div key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#2563eb',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                            <span>{t}</span>
                            <button onClick={() => setSelectedTags(s => s.filter(x => x !== t))} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                          </div>
                        ))}
                        <div style={{position:'relative'}}>
                          <button
                            onClick={() => {setTagSearchModalOpen(true); setTagSearchContext('create'); setTagSearchInput('')}}
                            style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                          >
                            + Add Tag
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Filtering section - Matching Create New Resource style */}
              <div style={{marginTop:0,marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                  <h3 style={{margin:0,fontSize:16,fontWeight:600,color:theme.text}}>Filter Resources</h3>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:16,alignItems:'start'}}>
                  <div>
                    <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Keyword Search</label>
                    <div style={{position:'relative',display:'flex',alignItems:'center'}}>
                      <input
                        type="text"
                        placeholder="Search titles..."
                        value={filterKeyword}
                        onChange={e => setFilterKeyword(e.target.value)}
                        list="resource-titles-list"
                        style={{width:'100%',padding:'6px 8px',paddingRight:28,border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box'}}
                      />
                      <div style={{position:'absolute',right:8,pointerEvents:'none',color:theme.text,fontSize:12}}>▼</div>
                      <datalist id="resource-titles-list">
                        {Array.from(new Set(
                          resources
                            .filter(r => {
                              if (filterTypes.length > 0 && !filterTypes.some(ft => ft.toLowerCase() === r.type.toLowerCase())) return false
                              if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                              return true
                            })
                            .map(r => r.title)
                            .filter(t => !filterKeyword || t.toLowerCase().includes(filterKeyword.toLowerCase()))
                        )).sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })).map(title => <option key={title} value={title} />)}
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Resource Types:</label>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      {filterTypes.map(t => (
                        <div key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#667eea',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                          <span>{t}</span>
                          <button onClick={() => setFilterTypes(s => s.filter(x => x !== t))} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                        </div>
                      ))}
                      <button
                        onClick={() => {setTagSearchModalOpen(true); setTagSearchContext('filter-type'); setTagSearchInput('')}}
                        style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                      >
                        + Add Type
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Tags:</label>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      {filterTags.map(t => (
                        <div key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#2563eb',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                          <span>{t}</span>
                          <button onClick={() => setFilterTags(s => s.filter(x => x !== t))} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                        </div>
                      ))}
                      <button
                        onClick={() => {setTagSearchModalOpen(true); setTagSearchContext('filter-tag'); setTagSearchInput('')}}
                        style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                      >
                        + Add Tag
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Categories:</label>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      {filterCategories.map(c => (
                        <div key={c} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#10b981',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                          <span>{c}</span>
                          <button onClick={() => setFilterCategories(s => s.filter(x => x !== c))} style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                        </div>
                      ))}
                      <button
                        onClick={() => {setCategorySearchModalOpen(true); setCategorySearchContext('filter'); setCategorySearchInput('')}}
                        style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                      >
                        + Add Category
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',marginTop:12}}>
                  {(filterKeyword || filterTypes.length > 0 || filterTags.length > 0 || filterCategories.length > 0) && (
                    <button
                      onClick={() => {
                        setFilterKeyword('')
                        setFilterTypes([])
                        setFilterTags([])
                        setFilterCategories([])
                        setSelectedIds([])
                        setSelectAll(false)
                      }}
                      style={{padding:'6px 12px',background:'#EF4444',color:'#fff',border:'none',borderRadius:4,cursor:'pointer',fontSize:12,fontWeight:600}}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Filter results summary */}
              {(filterKeyword || filterTypes.length > 0 || filterTags.length > 0 || filterCategories.length > 0) && (
                <div style={{marginBottom:12,fontSize:13,color:theme.text}}>
                  {(() => {
                    const filtered = resources.filter(r => {
                      if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                      if (filterTypes.length > 0 && !filterTypes.some(ft => ft.toLowerCase() === (r.type || '').toLowerCase())) return false
                      if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                      if (filterCategories.length > 0 && !(r.categories || []).some(c => filterCategories.includes(c))) return false
                      return true
                    })
                    return `Showing ${filtered.length} of ${resources.length} resources`
                  })()}
                </div>
              )}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <label style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:selectAll ? '#3D7DCA' : 'transparent',borderRadius:4,transition:'all 0.2s',cursor:'pointer'}}>
                  <input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.currentTarget.checked)} />
                  <span className="small muted" style={{color:selectAll ? '#ffffff' : theme.textMuted,fontWeight:selectAll ? 600 : 400}}>Select all</span>
                </label>
                <button className="btn-danger" onClick={bulkDelete} disabled={selectedIds.length === 0}>Delete selected ({selectedIds.length})</button>
              </div>

              {/* Resources table/cards */}
              <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{marginTop:0,marginBottom:0,fontSize:16,fontWeight:600,color:theme.text}}>Resources</h3>
                <button onClick={() => toggleViewMode('resources')} title={viewMode.resources === 'card' ? 'Table view' : 'Card view'} style={{background:theme.bgSecondary,border:'1px solid #ffffff',borderRadius:4,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{viewMode.resources === 'card' ? '📋' : '🗂️'}</button>
              </div>

              {viewMode.resources === 'table' ? (
              <div style={{border:`1px solid ${theme.borderColor}`,borderRadius:6,overflow:'auto'}}>
                <table style={styles.table}>
                  <thead style={styles.tableHeader}>
                    <tr>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff'}}><input type="checkbox" checked={selectAll} onChange={e => toggleSelectAll(e.currentTarget.checked)} /></th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('title')}>Title{getSortIndicator('title')}</th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('type')}>Type{getSortIndicator('type')}</th>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>URL</th>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>Tags</th>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>Categories</th>
                      <th style={{padding:8,textAlign:'right',color:'#ffffff',fontWeight:500}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      sortColumn ? sortData(resources
                        .filter(r => {
                          if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                          if (filterTypes.length > 0 && !filterTypes.some(ft => ft.toLowerCase() === (r.type || '').toLowerCase())) return false
                          if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                          return true
                        }), sortColumn) : (resources || [])
                        .filter(r => {
                          if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                          if (filterTypes.length > 0 && !filterTypes.some(ft => ft.toLowerCase() === (r.type || '').toLowerCase())) return false
                          if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                          return true
                        }).slice().sort((a,b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
                    )
                      .map(r => (
                        <tr key={r.id} data-id={r.id} style={styles.tableRow}>
                          <td style={{padding:8}}><input type="checkbox" checked={selectedIds.includes(r.id || '')} onChange={() => toggleSelect(r.id || '')} /></td>
                          <td style={{padding:8}}><strong>{r.title}</strong></td>
                          <td style={{padding:8,fontSize:12}}>{r.type}</td>
                          <td style={{padding:8,fontSize:12}}>
                            {r.link_url ? (
                              <a href={r.link_url} target="_blank" rel="noopener noreferrer" style={{color:'#3b82f6',textDecoration:'underline'}}>
                                Visit Site
                              </a>
                            ) : (
                              <span style={{color:theme.textMuted}}>—</span>
                            )}
                          </td>
                          <td style={{padding:8,fontSize:12}}>{(r.tags || []).join(', ') || <span style={{color:theme.textMuted}}>—</span>}</td>
                          <td style={{padding:8,fontSize:12}}>{(r.categories || []).join(', ') || <span style={{color:theme.textMuted}}>—</span>}</td>
                          <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                            <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                              <button onClick={() => {
                                if (r.id) {
                                  const capitalizedType = resourceTypes.find(t => t.toLowerCase() === r.type.toLowerCase()) || r.type
                                  setResourceModalData(r)
                                  setResourceEditForm({title: r.title, type: capitalizedType, tags: r.tags || [], categories: r.categories || [], link_url: stripProtocol(r.link_url || ''), link_protocol: getProtocol(r.link_url || '')})
                                  setIsEditingResource(true)
                                  setResourceModalOpen(true)
                                }
                              }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎</button>
                              <button onClick={() => remove(r.id)} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)}>✕</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:12}}>
                {(
                  sortColumn ? sortData(resources
                    .filter(r => {
                      if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                      if (filterTypes.length > 0 && !filterTypes.some(ft => ft.toLowerCase() === (r.type || '').toLowerCase())) return false
                      if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                      if (filterCategories.length > 0 && !(r.categories || []).some(c => filterCategories.includes(c))) return false
                      return true
                    }), sortColumn) : (resources || [])
                    .filter(r => {
                      if (filterKeyword && !r.title.toLowerCase().includes(filterKeyword.toLowerCase())) return false
                      if (filterTypes.length > 0 && !filterTypes.some(ft => ft.toLowerCase() === (r.type || '').toLowerCase())) return false
                      if (filterTags.length > 0 && !filterTags.some(t => r.tags.includes(t))) return false
                      if (filterCategories.length > 0 && !(r.categories || []).some(c => filterCategories.includes(c))) return false
                      return true
                    }).slice().sort((a,b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
                ).map(r => (
                  <div key={r.id} style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',height:'100%',position:'relative'}}>
                    {editingId === r.id ? (
                      <>
                        <input type="text" value={editData.title || ''} onChange={e => setEditData({...editData, title: e.target.value})} autoFocus placeholder="Title" style={styles.input} />
                        <div style={{display:'flex',gap:8,marginTop:8}}>
                          <select value={editData.type || r.type} onChange={e => setEditData({...editData, type: e.target.value})} style={{width:100,flexShrink:0,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                            {(resourceTypes || []).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(rt => <option key={rt} value={rt}>{rt}</option>)}
                          </select>
                          <select value={editData.link_protocol || 'https://'} onChange={e => setEditData({...editData, link_protocol: e.target.value})} style={{padding:8,border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',width:'auto',flexShrink:0}}>
                            <option value="https://">https://</option>
                            <option value="http://">http://</option>
                          </select>
                          <input type="text" value={editData.link_url || ''} onChange={e => setEditData({...editData, link_url: stripProtocol(e.target.value)})} placeholder="URL (optional)" style={{padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,flex:1,minWidth:0}} />
                        </div>
                        <div style={{marginTop:12,marginBottom:12}}>
                          <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Tags:</label>
                          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:8}}>
                            {(editData.tags || []).map((t: string) => (
                              <div key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#2563eb',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                                <span>{t}</span>
                                <button onClick={() => setEditData({...editData, tags: (editData.tags || []).filter((x: string) => x !== t)}) } style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                              </div>
                            ))}
                            <div style={{position:'relative'}}>
                              <button
                                onClick={() => {setTagSearchModalOpen(true); setTagSearchContext('edit'); setTagSearchInput('')}}
                                style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                              >
                                + Add Tag
                              </button>
                            </div>
                          </div>
                        </div>
                        <div style={{marginTop:12,marginBottom:12}}>
                          <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Categories:</label>
                          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:8}}>
                            {(editData.categories || []).map((c: string) => (
                              <div key={c} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 10px',background:'#16a34a',color:'#fff',borderRadius:16,fontSize:13,fontWeight:500}}>
                                <span>{c}</span>
                                <button onClick={() => setEditData({...editData, categories: (editData.categories || []).filter((x: string) => x !== c)}) } style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:14,lineHeight:1}}>✕</button>
                              </div>
                            ))}
                            <div style={{position:'relative'}}>
                              <button
                                onClick={() => setEditingCategoriesDropdownOpen(!editingCategoriesDropdownOpen)}
                                style={{padding:'4px 12px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:13,fontWeight:500}}
                              >
                                + Add Category
                              </button>
                              {editingCategoriesDropdownOpen && (
                                <div style={{position:'absolute',top:'100%',left:0,marginTop:0,background:theme.card,border:`1px solid ${theme.borderColor}`,borderRadius:6,boxShadow:'0 2px 8px rgba(0,0,0,0.15)',zIndex:10,minWidth:200,maxHeight:300,overflowY:'auto'}}>
                                  {(categories || []).filter((c: any) => c.is_active && !(editData.categories || []).includes(c.name)).map((c: any) => (
                                    <label key={c.id} style={{display:'block',padding:'4px 8px',cursor:'pointer',color:theme.text,userSelect:'none',borderBottom:'1px solid ' + theme.borderLight}}>
                                      <input
                                        type="checkbox"
                                        checked={(editData.categories || []).includes(c.name)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setEditData({...editData, categories: [...(editData.categories || []), c.name]})
                                          } else {
                                            setEditData({...editData, categories: (editData.categories || []).filter((x: string) => x !== c.name)})
                                          }
                                          setEditingCategoriesDropdownOpen(false)
                                        }}
                                        style={{marginRight:4}}
                                      />
                                      {c.name}
                                    </label>
                                  ))}
                                  {(categories || []).filter((c: any) => c.is_active && !(editData.categories || []).includes(c.name)).length === 0 && (
                                    <div style={{padding:'12px',textAlign:'center',color:theme.textMuted,fontSize:12}}>No more categories available</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                          <button className="btn-ghost" onClick={async () => {
                            try {
                              const fullUrl = editData.link_url ? buildFullUrl(editData.link_protocol || 'https://', editData.link_url) : null
                              const res = await fetch(apiUrl(`/api/admin/resources/${r.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ title: editData.title, type: (editData.type || r.type).toLowerCase(), tags: editData.tags || [], categories: editData.categories || [], link_url: fullUrl }) })
                              if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                              await load()
                              setEditingId(null)
                              setEditingTagsDropdownOpen(false)
                              setEditingCategoriesDropdownOpen(false)
                            } catch (err) {
                              alert('Save resource failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{color:'#16a34a',fontSize:14}}>✓</button>
                          <button className="btn-ghost" onClick={() => {
                            setEditingId(null)
                            setEditingTagsDropdownOpen(false)
                            setEditingCategoriesDropdownOpen(false)
                          }} style={{color:'#dc2626',fontSize:14}}>⊘</button>
                        </div>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const titleTooLong = r.title && r.title.length > 25
                          const tagsTooLong = r.tags && r.tags.join(', ').length > 30
                          const categoriesTooLong = r.categories && r.categories.join(', ').length > 30
                          const anyTruncated = titleTooLong || tagsTooLong || categoriesTooLong
                          
                          return (
                            <>
                              <h5 style={{margin:'0 0 12px 0',fontSize:15,fontWeight:600,color:theme.text,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                                  {r.title}
                                </span>
                                {titleTooLong && (
                                  <button onClick={() => {setResourceModalData(r); setResourceEditForm({title: r.title, type: r.type, tags: r.tags || [], categories: r.categories || [], link_url: stripProtocol(r.link_url || ''), link_protocol: getProtocol(r.link_url || '')}); setIsEditingResource(true); setResourceModalOpen(true)}} style={{background:'transparent',border:'none',color:'#3b82f6',cursor:'pointer',padding:0,paddingLeft:8,fontSize:15,fontWeight:600,flexShrink:0,textDecoration:'underline'}}>
                                    more
                                  </button>
                                )}
                              </h5>
                              
                              {/* Type Line */}
                              <div style={{fontSize:12,color:theme.textMuted,marginBottom:6,lineHeight:'1.4',minHeight:'18.4px',maxHeight:'18.4px',overflow:'hidden',position:'relative'}}>
                                <span style={{display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                                  <strong>Type:</strong> {r.type}
                                </span>
                              </div>
                              
                              {/* URL Line */}
                              {r.link_url && (
                                <div style={{fontSize:12,color:theme.textMuted,marginBottom:6,lineHeight:'1.4',minHeight:'18.4px',maxHeight:'18.4px',overflow:'hidden',position:'relative'}}>
                                  <span style={{display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                                    <strong>URL:</strong> <a href={r.link_url} target="_blank" rel="noopener noreferrer" style={{color:'#3b82f6',textDecoration:'underline'}}>Visit Site</a>
                                  </span>
                                </div>
                              )}
                              
                              {/* Tags Line */}
                              {r.tags && r.tags.length > 0 && (
                                <div style={{fontSize:12,color:theme.textMuted,marginBottom:6,lineHeight:'1.4',minHeight:'18.4px',maxHeight:'18.4px',overflow:'hidden',position:'relative'}}>
                                  <span style={{display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                                    <strong>Tags:</strong> {r.tags.join(', ')}
                                  </span>
                                </div>
                              )}
                              
                              {/* Categories Line - always reserve space */}
                              <div style={{fontSize:12,color:theme.textMuted,marginBottom:6,lineHeight:'1.4',minHeight:'18.4px',maxHeight:'18.4px',overflow:'hidden',position:'relative'}}>
                                {r.categories && r.categories.length > 0 ? (
                                  <>
                                    <span style={{display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                                      <strong>Categories:</strong> {r.categories.join(', ')}
                                    </span>
                                  </>
                                ) : (
                                  <>&nbsp;</>
                                )}
                              </div>
                              
                              {/* More button for non-title overflow */}
                              {(tagsTooLong || categoriesTooLong) && !titleTooLong && (
                                <button onClick={() => {setResourceModalData(r); setResourceEditForm({title: r.title, type: r.type, tags: r.tags || [], categories: r.categories || [], link_url: stripProtocol(r.link_url || ''), link_protocol: getProtocol(r.link_url || '')}); setIsEditingResource(true); setResourceModalOpen(true)}} style={{position:'absolute',top:12,right:12,background:'transparent',border:'none',color:'#3b82f6',cursor:'pointer',padding:0,textAlign:'right',fontSize:13,fontWeight:600,display:'inline',textDecoration:'underline'}}>
                                  more
                                </button>
                              )}
                            </>
                          )
                        })()}
                          
                          <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                            <button onClick={() => {
                              if (r.id) {
                                setResourceModalData(r)
                                const capitalizedType = r.type ? resourceTypes.find(t => t.toLowerCase() === r.type.toLowerCase()) || r.type : ''
                                setResourceEditForm({title: r.title, type: capitalizedType, tags: r.tags || [], categories: r.categories || [], link_url: stripProtocol(r.link_url || ''), link_protocol: getProtocol(r.link_url || '')})
                                setIsEditingResource(true)
                                setResourceModalOpen(true)
                              }
                            }} style={cardButtonStyles.edit as any} {...getButtonHoverHandlers(false)}>✎ Edit</button>
                            <button onClick={() => remove(r.id)} style={cardButtonStyles.delete as any} {...getButtonHoverHandlers(true)}>✕ Delete</button>
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

      {/* Resource Modal */}
      {resourceModalOpen && resourceModalData && (
        <div onKeyDown={(e) => { if (e.key === 'Escape') { setResourceModalOpen(false); setIsEditingResource(false) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000, pointerEvents:'auto'}}>
          <div onKeyDown={handleModalKeyDown} style={{background:theme.bg,borderRadius:8,padding:24,width:'77.5%',maxWidth:2760,height:'76%',overflowY:'auto',overflowX:'hidden',border:`1px solid ${theme.borderColor}`, pointerEvents:'auto',position:'relative',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:4}}>
              {!isEditingResource ? (
                <h3 style={{margin:0,fontSize:18,fontWeight:600,color:theme.text}}>Edit Resource</h3>
              ) : (
                <h3 style={{margin:0,fontSize:18,fontWeight:600,color:theme.text}}>Edit Resource</h3>
              )}
              <button onClick={() => { setResourceModalOpen(false); setIsEditingResource(false) }} tabIndex={-1} style={{position:'absolute',top:-5,right:-5,background:'transparent',border:'none',fontSize:18,cursor:'pointer',color:'#ef4444',padding:'8px'}}>✕</button>
            </div>
            <div style={{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${theme.borderColor}`}}>
              <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Title:</p>
              <p style={{margin:0,fontSize:16,fontWeight:600,color:theme.text}}>{resourceModalData.title}</p>
            </div>
            {!isEditingResource ? (
              <>
                <div style={{flex:1,overflowY:'auto',marginBottom:16}}>
                  <div style={{marginBottom:12}}>
                    <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Type:</p>
                    <p style={{margin:0,fontSize:14,color:theme.text}}>{resourceModalData.type}</p>
                  </div>
                  {resourceModalData.link_url && (
                    <div style={{marginBottom:12}}>
                      <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>URL:</p>
                      <p style={{margin:0,fontSize:14,color:theme.text}}><a href={resourceModalData.link_url} target="_blank" rel="noopener noreferrer" style={{color:'#3b82f6',textDecoration:'underline'}}>Visit Site</a></p>
                    </div>
                  )}
                  {resourceModalData.tags && resourceModalData.tags.length > 0 && (
                    <div style={{marginBottom:12}}>
                      <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Tags:</p>
                      <p style={{margin:0,fontSize:14,color:theme.text}}>{resourceModalData.tags.join(', ')}</p>
                    </div>
                  )}
                  {resourceModalData.categories && resourceModalData.categories.length > 0 && (
                    <div style={{marginBottom:12}}>
                      <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Categories:</p>
                      <p style={{margin:0,fontSize:14,color:theme.text}}>{resourceModalData.categories.join(', ')}</p>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',gap:8,marginTop:'auto'}}>
                  <button onClick={() => { 
                    console.log('Edit button clicked, resourceModalData:', resourceModalData)
                    const capitalizedType = resourceModalData.type ? resourceTypes.find(t => t.toLowerCase() === resourceModalData.type.toLowerCase()) || resourceModalData.type : ''
                    const formData = {title: resourceModalData.title, type: capitalizedType, tags: resourceModalData.tags || [], categories: resourceModalData.categories || [], link_url: stripProtocol(resourceModalData.link_url || ''), link_protocol: getProtocol(resourceModalData.link_url || '')}
                    console.log('Setting form data:', formData)
                    setResourceEditForm(formData)
                    setIsEditingResource(true)
                  }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text}}>✎ Edit</button>
                  <button onClick={async () => {
                    if (!confirm('Delete this resource?')) return
                    try {
                      const res = await fetch(apiUrl(`/api/admin/resources/${resourceModalData.id}`), { method: 'DELETE', headers: { ...(authHeaders()) } })
                      if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                      await load()
                      setResourceModalOpen(false)
                    } catch (err) {
                      alert('Delete resource failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#ef4444'}}>✕ Delete</button>
                </div>
              </>
            ) : (
              <>
                <div style={{flex:1,display:'flex',gap:24,marginBottom:16,minWidth:0,overflowY:'auto'}}>
                  {/* Left column - Main fields */}
                  <div style={{flex:1,minWidth:0,paddingRight:12}}>
                    <div style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Type</label>
                      <select autoFocus value={resourceEditForm.type || ''} onChange={e => setResourceEditForm({...resourceEditForm, type: e.target.value})} style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box',width:'100%'}}>
                        <option value="">Select a type</option>
                        {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>URL</label>
                      <div style={{display:'flex',gap:4,minWidth:0}}>
                        <select value={resourceEditForm.link_protocol || 'https://'} onChange={e => setResourceEditForm({...resourceEditForm, link_protocol: e.target.value})} style={{padding:'6px 4px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:12,flex:'0 0 auto',width:'85px',background:theme.bgSecondary,color:theme.text,boxSizing:'border-box'}}>
                          <option value="https://">https://</option>
                          <option value="http://">http://</option>
                        </select>
                        <input type="text" value={resourceEditForm.link_url || ''} onChange={e => setResourceEditForm({...resourceEditForm, link_url: stripProtocol(e.target.value)})} placeholder="URL (optional)" style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box',minWidth:0}} />
                      </div>
                    </div>
                  </div>

                  {/* Right column - Tags & Categories */}
                  <div style={{flex:'0 0 280px',borderLeft:`1px solid ${theme.borderColor}`,paddingLeft:16,overflowY:'auto',paddingRight:8}}>
                    <div style={{marginBottom:20}}>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>Tags</label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                        {(resourceEditForm.tags || []).map((tag: string) => (
                          <span key={tag} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 8px',background:'#3b82f6',color:'#fff',borderRadius:12,fontSize:12,fontWeight:500}}>
                            {tag}
                            <button onClick={() => setResourceEditForm({...resourceEditForm, tags: (resourceEditForm.tags || []).filter((t: string) => t !== tag)}) } style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:12,lineHeight:1}}>✕</button>
                          </span>
                        ))}
                      </div>
                      <button onClick={() => { setTagSearchContext('edit'); setTagSearchModalOpen(true) }} style={{padding:'4px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:4,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:12,fontWeight:500}}>+ Add Tag</button>
                    </div>

                    <div>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>Categories</label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                        {(resourceEditForm.categories || []).map((cat: string) => (
                          <span key={cat} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 8px',background:'#10b981',color:'#fff',borderRadius:12,fontSize:12,fontWeight:500}}>
                            {cat}
                            <button onClick={() => setResourceEditForm({...resourceEditForm, categories: (resourceEditForm.categories || []).filter((c: string) => c !== cat)}) } style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:12,lineHeight:1}}>✕</button>
                          </span>
                        ))}
                      </div>
                      <button onClick={() => { setCategorySearchContext('edit'); setCategorySearchModalOpen(true) }} style={{padding:'4px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:4,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:12,fontWeight:500}}>+ Add Category</button>
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,marginTop:'auto',borderTop:`1px solid ${theme.borderColor}`,paddingTop:16}}>
                  <button type="button" onClick={async () => {
                    try {
                      if (!resourceEditForm.title || !resourceEditForm.title.toString().trim()) return alert('Title required')
                      const fullUrl = resourceEditForm.link_url ? buildFullUrl(resourceEditForm.link_protocol || 'https://', resourceEditForm.link_url) : null
                      const res = await fetch(apiUrl(`/api/admin/resources/${resourceModalData.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ title: resourceEditForm.title, type: (resourceEditForm.type || '').toLowerCase(), tags: resourceEditForm.tags || [], categories: resourceEditForm.categories || [], link_url: fullUrl }) })
                      if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                      await load()
                      setIsEditingResource(false)
                      setResourceModalOpen(false)
                    } catch (err) {
                      console.error('Save resource error', err)
                      alert('Save failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'12px 16px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save</button>
                  <button onClick={() => { setIsEditingResource(false); setResourceModalOpen(false) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'12px 16px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resource Type Modal */}
      {resourceTypeModalOpen && resourceTypeModalData && (
        <div onKeyDown={(e) => { if (e.key === 'Escape') { setResourceTypeModalOpen(false); setIsEditingResourceType(false) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000, pointerEvents:'auto'}}>
          <div onKeyDown={handleModalKeyDown} style={{background:theme.bg,borderRadius:8,padding:24,width:'77.5%',maxWidth:2760,height:'76%',overflowY:'auto',overflowX:'hidden',border:`1px solid ${theme.borderColor}`, pointerEvents:'auto',position:'relative',display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:4}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:600,color:theme.text}}>Edit Resource Type</h3>
              <button onClick={() => { setResourceTypeModalOpen(false); setIsEditingResourceType(false) }} tabIndex={-1} style={{position:'absolute',top:-5,right:-5,background:'transparent',border:'none',fontSize:18,cursor:'pointer',color:'#ef4444',padding:'8px'}}>✕</button>
            </div>
            {!isEditingResourceType ? (
              <>
                <div style={{flex:1,overflowY:'auto',marginBottom:16}}>
                  <div style={{marginBottom:12}}>
                    <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Resource Type:</p>
                    <p style={{margin:0,fontSize:14,color:theme.text}}>{resourceTypeModalData.name}</p>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,marginTop:'auto'}}>
                  <button onClick={() => { setIsEditingResourceType(true); setResourceTypeEditForm({name: resourceTypeModalData.name}) }} style={{flex:1,background:'#3b82f6',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>✎ Edit</button>
                  <button onClick={async () => {
                    if (!confirm('Delete this resource type?')) return
                    try {
                      const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(originalResourceTypeName)}`), { method: 'DELETE', headers: { ...(authHeaders()) } })
                      if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                      await loadResourceTypes()
                      setResourceTypeModalOpen(false)
                    } catch (err) {
                      alert('Delete resource type failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }} style={{flex:1,background:'transparent',border:'1px solid #ef4444',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#ef4444',fontWeight:600}}>✕ Delete</button>
                </div>
              </>
            ) : (
              <>
                <div style={{flex:1,display:'flex',gap:24,marginBottom:16,minWidth:0,overflowY:'auto'}}>
                  {/* Main field */}
                  <div style={{flex:1,minWidth:0,paddingRight:12}}>
                    <div style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Resource Type Name</label>
                      <input type="text" autoFocus value={resourceTypeEditForm.name || ''} onChange={e => setResourceTypeEditForm({...resourceTypeEditForm, name: e.target.value})} placeholder="e.g., article, book, podcast" style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box',width:'100%'}} />
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,marginTop:'auto',borderTop:`1px solid ${theme.borderColor}`,paddingTop:16}}>
                  <button type="button" onClick={async () => {
                    try {
                      if (!resourceTypeEditForm.name || !resourceTypeEditForm.name.toString().trim()) return alert('Name required')
                      const url = apiUrl(`/api/admin/resource-types/${encodeURIComponent(originalResourceTypeName)}`)
                      const payload = { new_name: resourceTypeEditForm.name }
                      console.log('API URL:', url)
                      console.log('Payload:', payload)
                      console.log('Headers:', { 'content-type': 'application/json', ...(authHeaders()) })
                      const res = await fetch(url, { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify(payload) })
                      console.log('Save response status:', res.status)
                      const responseText = await res.text()
                      console.log('Response body:', responseText)
                      if (!res.ok) throw new Error(responseText || String(res.status))
                      await loadResourceTypes()
                      setIsEditingResourceType(false)
                      setResourceTypeModalOpen(false)
                    } catch (err) {
                      console.error('Save resource type error', err)
                      alert('Save failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save</button>
                  <button onClick={() => { setIsEditingResourceType(false); setResourceTypeModalOpen(false) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Health Goals Tab */}
      {activeTab === 'goals' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              {/* Goal creation form */}
              <div style={{marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Add Health Goal</h3>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <input
                    placeholder="Goal name (e.g., Weight Management)"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    style={{flex:1,padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                  />
                  <button className="btn-primary" onClick={async () => {
                    if (!newTypeName.trim()) return alert('Goal name required')
                    try {
                      const res = await supabase.from('health_goals').insert({ name: newTypeName.trim(), description: '' })
                      if (res.error) throw res.error
                      setNewTypeName('')
                      await loadHealthGoals()
                    } catch (err) {
                      alert(formatErrorMessage(err, 'health goal'))
                    }
                  }}>Add Goal</button>
                </div>
              </div>

              {/* Health Goals Grid */}
              <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{marginTop:0,marginBottom:0,fontSize:16,fontWeight:600,color:theme.text}}>Health Goals</h3>
                <button onClick={() => toggleViewMode('goals')} title={viewMode.goals === 'card' ? 'Table view' : 'Card view'} style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{viewMode.goals === 'card' ? '📋' : '🗂️'}</button>
              </div>

              {healthGoals.length === 0 ? (
                <div style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:32,textAlign:'center',color:theme.textMuted}}>
                  No health goals found. Add one above or run the migration to add defaults.
                </div>
              ) : viewMode.goals === 'table' ? (
                <div style={{border:`1px solid ${theme.borderColor}`,borderRadius:6,overflow:'auto'}}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                          <th style={{padding:12,textAlign:'left',fontWeight:600,color:'#ffffff'}}>Goal Name</th>
                            <th style={{padding:12,textAlign:'left',fontWeight:600,color:'#ffffff'}}>Description</th>
                            <th style={{padding:12,textAlign:'right',fontWeight:600,color:'#ffffff'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(healthGoals || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(goal => (
                        <tr key={goal.id} style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                          <td style={{padding:12,color:theme.text}}>{goal.name}</td>
                          <td style={{padding:12,color:theme.textMuted}}>{goal.description || '-'}</td>
                          <td style={{padding:12,textAlign:'right',verticalAlign:'middle'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',height:'100%'}}>
                              <button onClick={() => { setHealthGoalModalData(goal); setHealthGoalEditForm({name: goal.name, description: goal.description || ''}); setIsEditingHealthGoal(true); setHealthGoalModalOpen(true) }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)} aria-label={`Edit goal ${goal.name}`}>
                                ✎
                              </button>
                              <button onClick={async () => {
                                if (!confirm('Delete this health goal?')) return
                                await supabase.from('health_goals').delete().eq('id', goal.id)
                                await loadHealthGoals()
                              }} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)} aria-label={`Delete goal ${goal.name}`}>
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:12}}>
                  {(healthGoals || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(goal => {
                    const description = goal.description || 'No description'
                    const titleTooLong = goal.name.length > 25
                    const descriptionTooLong = description.length > 85
                    
                    return (
                      <div key={goal.id} style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,display:'flex',flexDirection:'column',height:'100%',position:'relative'}}>
                        <h4 style={{margin:'0 0 8px 0',fontSize:14,fontWeight:600,color:theme.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {titleTooLong ? (
                            <>
                              {goal.name.substring(0, 22)}…{' '}
                              <button onClick={() => {setHealthGoalModalData(goal); setHealthGoalEditForm({name: goal.name, description: goal.description || ''}); setIsEditingHealthGoal(true); setHealthGoalModalOpen(true)}} style={{background:'transparent',border:'none',color:'#3b82f6',cursor:'pointer',padding:0,textAlign:'left',fontSize:14,fontWeight:600,display:'inline'}}>
                                more
                              </button>
                            </>
                          ) : (
                            goal.name
                          )}
                        </h4>
                        <p style={{margin:'0 0 12px 0',fontSize:13,color:theme.textMuted,flex:1,lineHeight:'1.4',minHeight:'36.4px',maxHeight:'36.4px',overflow:'hidden',position:'relative'}}>
                          <span style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                            {description}
                          </span>
                          {descriptionTooLong && (
                            <span onClick={() => {setHealthGoalModalData(goal); setHealthGoalEditForm({name: goal.name, description: goal.description || ''}); setIsEditingHealthGoal(true); setHealthGoalModalOpen(true)}} style={{position:'absolute',bottom:0,right:0,background:theme.bg,paddingLeft:20,color:'#3b82f6',cursor:'pointer',textDecoration:'underline',fontWeight:500}}>
                              more
                            </span>
                          )}
                        </p>
                        <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                          {(Object.keys(tagsMeta || {}).filter((t: string) => Array.isArray((tagsMeta as any)[t]?.categories) && ((tagsMeta as any)[t].categories || []).includes(goal.name))).map((t: string) => (
                            <span key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 8px',background:'#3b82f6',color:'#fff',borderRadius:12,fontSize:12,fontWeight:500}}>{t}</span>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                          <button onClick={() => {setHealthGoalModalData(goal); setHealthGoalEditForm({name: goal.name, description: goal.description || ''}); setIsEditingHealthGoal(true); setHealthGoalModalOpen(true)}} style={cardButtonStyles.edit} {...getButtonHoverHandlers(false)}>
                            ✎ Edit
                          </button>
                          <button onClick={async () => {
                            if (!confirm('Delete this health goal?')) return
                            await supabase.from('health_goals').delete().eq('id', goal.id)
                            await loadHealthGoals()
                          }} style={cardButtonStyles.delete} {...getButtonHoverHandlers(true)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Health Goal Modal */}
              {healthGoalModalOpen && healthGoalModalData && (
                <div onKeyDown={(e) => { if (e.key === 'Escape') { setHealthGoalModalOpen(false); setIsEditingHealthGoal(false) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000, pointerEvents:'auto'}}>
                  <div onKeyDown={handleModalKeyDown} style={{background:theme.bg,borderRadius:8,padding:24,width:'77.5%',maxWidth:2760,height:'76%',overflowY:'auto',overflowX:'hidden',border:`1px solid ${theme.borderColor}`, pointerEvents:'auto',position:'relative',display:'flex',flexDirection:'column'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:4}}>
                    <h3 style={{margin:0,fontSize:18,fontWeight:600,color:theme.text}}>Edit Health Goal</h3>
                    <button onClick={() => { setHealthGoalModalOpen(false); setIsEditingHealthGoal(false) }} tabIndex={-1} style={{position:'absolute',top:-5,right:-5,background:'transparent',border:'none',fontSize:18,cursor:'pointer',color:'#ef4444',padding:'8px'}}>✕</button>
                  </div>
                    {!isEditingHealthGoal ? (
                      <>
                        <p style={{margin:'0 0 16px 0',fontSize:14,color:theme.textMuted,whiteSpace:'pre-wrap',flex:1}}>{healthGoalModalData.description || 'No description'}</p>
        <div style={{display:'flex',gap:8,marginTop:'auto'}}>
                          <button onClick={() => { setIsEditingHealthGoal(true); setHealthGoalEditForm({name: healthGoalModalData.name, description: healthGoalModalData.description || ''}) }} style={{flex:1,background:'#3b82f6',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>
                            Edit
                          </button>
                          <button onClick={async () => {
                            if (!confirm('Delete this health goal?')) return
                            await supabase.from('health_goals').delete().eq('id', healthGoalModalData.id)
                            await loadHealthGoals()
                            setHealthGoalModalOpen(false)
                          }} style={{flex:1,background:'transparent',border:'1px solid #ef4444',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#ef4444',fontWeight:600}}>Delete</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:8}}>Name</label>
                        <input autoFocus type="text" value={healthGoalEditForm.name || ''} onChange={e => setHealthGoalEditForm({...healthGoalEditForm, name: e.target.value})} style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,marginBottom:12}} />
                        <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:8}}>Description</label>
                        <textarea value={healthGoalEditForm.description || ''} onChange={e => setHealthGoalEditForm({...healthGoalEditForm, description: e.target.value})} style={{width:'100%',minHeight:120,padding:8,border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,flex:1,fontFamily:'inherit'}} />
                        <div style={{display:'flex',gap:8}}>
                          <button type="button" onClick={async () => {
                            console.log('HealthGoal Save clicked', { id: healthGoalModalData?.id, form: healthGoalEditForm })
                            try {
                              if (!healthGoalEditForm.name || !healthGoalEditForm.name.toString().trim()) return alert('Name required')
                              const res = await supabase.from('health_goals').update({ name: (healthGoalEditForm.name || '').toString().trim(), description: healthGoalEditForm.description || '' }).eq('id', healthGoalModalData.id)
                              if ((res as any).error) throw (res as any).error
                              await loadHealthGoals()
                              setIsEditingHealthGoal(false)
                              setHealthGoalModalOpen(false)
                            } catch (err) {
                              console.error('Save health goal error', err)
                              alert('Save failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save</button>
                          <button onClick={() => { setIsEditingHealthGoal(false); setHealthGoalModalOpen(false) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
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
              
              {/* Add new criteria form */}
              <div style={{marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Add Criteria</h3>
                <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Marker</label>
                    <input
                      type="text"
                      placeholder="Add marker..."
                      list="add-criteria-markers-list"
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                      value={ruleForm.markerName || ''}
                      onChange={e => setRuleForm(f => ({ ...f, markerName: e.target.value }))}
                    />
                    <datalist id="add-criteria-markers-list">
                      {(labMarkers || []).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(m => <option key={m.id} value={m.name} />)}
                    </datalist>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Min</label>
                    <input type="number" placeholder="Min" value={ruleForm.min_value || ''} onChange={e => setRuleForm(f => ({ ...f, min_value: e.target.value }))} style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Max</label>
                    <input type="number" placeholder="Max" value={ruleForm.max_value || ''} onChange={e => setRuleForm(f => ({ ...f, max_value: e.target.value }))} style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Tag</label>
                    <input
                      type="text"
                      placeholder="Add tag..."
                      list="add-criteria-tags-list"
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                      value={ruleForm.tag_to_apply || ''}
                      onChange={e => setRuleForm(f => ({ ...f, tag_to_apply: e.target.value }))}
                    />
                    <datalist id="add-criteria-tags-list">
                      {(allowedTags || []).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <button className="btn-primary" onClick={saveRule}>Add Criteria</button>
                </div>
              </div>
              
              <div style={styles.filterBox}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Filter Criteria</h3>
                <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#666'}}>Marker</label>
                    <input
                      type="text"
                      placeholder="(All Markers)"
                      value={filterCriteriaMarker}
                      onChange={e => setFilterCriteriaMarker(e.target.value)}
                      list="criteria-markers-list"
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
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
                        .map(m => m).slice().sort((a:any,b:any) => (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' })).map(m => <option key={m?.id} value={m?.name || ''} />)
                      }
                    </datalist>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Type</label>
                    <select
                      value={filterCriteriaValueType}
                      onChange={e => setFilterCriteriaValueType(e.target.value as 'min' | 'max' | '')}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                    >
                      <option value="">Min or Max</option>
                      <option value="min">Min</option>
                      <option value="max">Max</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Operator</label>
                    <select
                      value={filterCriteriaOperator}
                      onChange={e => setFilterCriteriaOperator(e.target.value as '<' | '>' | '=' | '<=' | '>=' | '')}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
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
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Value</label>
                    <input
                      type="number"
                      placeholder="Value..."
                      value={filterCriteriaValue}
                      onChange={e => setFilterCriteriaValue(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                    />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:'#ffffff'}}>Tag</label>
                    <input
                      type="text"
                      placeholder="(All Tags)"
                      value={filterCriteriaTag}
                      onChange={e => setFilterCriteriaTag(e.target.value)}
                      list="criteria-tags-list"
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
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
                    style={{opacity: (filterCriteriaMarker || filterCriteriaValueType || filterCriteriaOperator || filterCriteriaValue || filterCriteriaTag) ? 1 : 0.5,cursor: (filterCriteriaMarker || filterCriteriaValueType || filterCriteriaOperator || filterCriteriaValue || filterCriteriaTag) ? 'pointer' : 'default',padding:'6px 12px',fontSize:14}}
                  >
                    Clear
                  </button>
                </div>
                {(filterCriteriaMarker || filterCriteriaValueType || filterCriteriaOperator || filterCriteriaValue || filterCriteriaTag) && (
                  <div style={{fontSize:12,marginTop:8,color:theme.text}}>
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
                    <thead style={{background:'#3D7DCA',borderBottom:`1px solid ${theme.borderColor}`}}>
                      <tr>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('marker_id')}>Marker{getSortIndicator('marker_id')}</th>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('min_value')}>Min{getSortIndicator('min_value')}</th>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('max_value')}>Max{getSortIndicator('max_value')}</th>
                        <th style={{textAlign:'left',padding:8,color:'#ffffff',fontWeight:500}}>Operator</th>
                        <th style={{textAlign:'left',padding:8,cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('tag_to_apply')}>Tag{getSortIndicator('tag_to_apply')}</th>
                        <th style={{textAlign:'right',padding:8,color:'#ffffff',fontWeight:500}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        sortColumn ? sortData(logicRules
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
                          }), sortColumn)
                        : (logicRules || [])
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
                          }).slice().sort((a,b) => {
                            const aName = (labMarkers.find(m => m.id === a.marker_id)?.name || '')
                            const bName = (labMarkers.find(m => m.id === b.marker_id)?.name || '')
                            const cmp = aName.localeCompare(bName, undefined, { sensitivity: 'base' })
                            if (cmp !== 0) return cmp
                            return (a.tag_to_apply || '').localeCompare(b.tag_to_apply || '', undefined, { sensitivity: 'base' })
                          })
                      ).map(l => (
                        <tr key={l.id} data-id={l.id} style={{borderTop:`1px solid ${theme.borderColor}`}}>
                          {editingId === l.id ? (
                            <>
                              <td style={{padding:8}}>
                                <input
                                  type="text"
                                  placeholder="Marker"
                                  value={editData.markerName || ''}
                                  onChange={e => setEditData({...editData, markerName: e.target.value})}
                                  list="edit-criteria-markers-list"
                                  style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}}
                                />
                                <datalist id="edit-criteria-markers-list">
                                  {(labMarkers || []).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(m => <option key={m.id} value={m.name} />)}
                                </datalist>
                              </td>
                              <td style={{padding:8,textAlign:'left'}}><input type="number" value={editData.min_value || ''} onChange={e => setEditData({...editData, min_value: e.target.value})} style={{width:'80px',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}} /></td>
                              <td style={{padding:8,textAlign:'left'}}><input type="number" value={editData.max_value || ''} onChange={e => setEditData({...editData, max_value: e.target.value})} style={{width:'80px',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}} /></td>
                              <td style={{padding:8}}>
                                <select value={editData.operator || 'between'} onChange={e => setEditData({...editData, operator: e.target.value})} style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}}>
                                  <option value="between">between</option>
                                  <option value="<">&lt;</option>
                                  <option value=">">&gt;</option>
                                  <option value="=">=</option>
                                  <option value="<=">&lt;=</option>
                                  <option value=">=">&gt;=</option>
                                </select>
                              </td>
                              <td style={{padding:8}}>
                                <select value={editData.tag_to_apply || ''} onChange={e => setEditData({...editData, tag_to_apply: e.target.value})} style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}}>
                                  <option value="">(none)</option>
                                  {(allowedTags || []).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </td>
                              <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                                <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
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
                                }} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'6px',cursor:'pointer',fontSize:16,color:'#16a34a'}}>✓</button>
                                <button className="btn-ghost" onClick={() => setEditingId(null)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'6px',cursor:'pointer',fontSize:16,color:'#dc2626'}}>⊘</button>
                              </div>
                            </td>
                            </>
                          ) : (
                            <>
                              <td style={{padding:8}}>{(labMarkers.find(m => m.id === l.marker_id) || {}).name || l.marker_id}</td>
                              <td style={{padding:8,textAlign:'left'}}>{l.min_value}</td>
                              <td style={{padding:8,textAlign:'left'}}>{l.max_value}</td>
                              <td style={{padding:8}}>{l.operator || 'between'}</td>
                              <td style={{padding:8}}>{l.tag_to_apply}</td>
                              <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                                <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                                  <button onClick={() => {
                                    setEditingId(l.id)
                                    setEditData({
                                      marker_id: l.marker_id,
                                      markerName: (labMarkers.find(m => m.id === l.marker_id) || {}).name || '',
                                      min_value: String(l.min_value),
                                      max_value: String(l.max_value),
                                      operator: 'between',
                                      tag_to_apply: l.tag_to_apply
                                    })
                                  }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎</button>
                                  <button onClick={() => deleteRule(l.id)} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)}>✕</button>
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
          <style>{`input[list] { appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: none !important; } input[list]::-webkit-calendar-picker-indicator { display: none !important; }`}</style>
          {loading ? <div>Loading…</div> : (
            <div>
              {/* Type creation form */}
              <div style={{marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Add Resource Type</h3>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <input 
                    placeholder="Resource Type (e.g., article, book, podcast)" 
                    value={newTypeName} 
                    onChange={e => setNewTypeName(e.target.value)}
                    style={{flex:1,padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}} 
                  />
                  <button className="btn-primary" onClick={async () => {
                    if (!newTypeName.trim()) return alert('Type name required')
                    try {
                      const res = await fetch(apiUrl('/api/admin/resource-types'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ name: newTypeName.trim() }) })
                      if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                      await loadResourceTypes()
                      setNewTypeName('')
                    } catch (err) {
                      alert(formatErrorMessage(err, 'resource type'))
                    }
                  }}>Add Type</button>
                </div>
              </div>

              {/* Resource Types Search Filter */}
              <div style={styles.filterBox}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Filter Resource Types</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.text}}>Search Resource Types</label>
                    <div style={{position:'relative',display:'flex',alignItems:'center'}}>
                      <input
                        type="text"
                        placeholder="Type name..."
                        value={filterResourceTypeName}
                        onChange={e => setFilterResourceTypeName(e.target.value)}
                        list="search-resource-types-list"
                        style={{width:'100%',padding:'6px 8px',paddingRight:28,border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box'}}
                      />
                      <div style={{position:'absolute',right:8,pointerEvents:'none',color:theme.text,fontSize:12}}>▼</div>
                      <datalist id="search-resource-types-list">
                        {Array.from(new Set(resourceTypes.filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase())))).sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })).map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => setFilterResourceTypeName('')}
                    style={{opacity: filterResourceTypeName ? 1 : 0.5,cursor: filterResourceTypeName ? 'pointer' : 'default',padding:'6px 12px',fontSize:14}}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Types table/cards */}
              <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{marginTop:0,marginBottom:0,fontSize:16,fontWeight:600,color:theme.text}}>Resource Types</h3>
                <button onClick={() => toggleViewMode('types')} title={viewMode.types === 'card' ? 'Table view' : 'Card view'} style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{viewMode.types === 'card' ? '📋' : '🗂️'}</button>
              </div>

              {viewMode.types === 'table' ? (
              <div style={{border:`1px solid ${theme.borderColor}`,borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead style={{background:'#3D7DCA',borderBottom:`1px solid ${theme.borderColor}`}}>
                    <tr>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('name')}>Resource Type{getSortIndicator('name')}</th>
                      <th style={{padding:8,textAlign:'right',color:'#ffffff',fontWeight:500}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      sortColumn ? sortData(resourceTypes
                        .filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase()))
                        .map(name => ({name})), 'name').map(obj => obj.name)
                      : (resourceTypes || []).filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase())).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })) )
                      .map(rt => (
                      <tr key={rt} style={{borderTop:`1px solid ${theme.borderColor}`,cursor:'pointer'}} onClick={() => { setResourceTypeModalData({name: rt}); setOriginalResourceTypeName(rt); setResourceTypeEditForm({name: rt}); setIsEditingResourceType(true); setResourceTypeModalOpen(true) }}>
                        <td style={{padding:8}}><strong>{rt}</strong></td>
                        <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                          <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                            <button onClick={(e) => { e.stopPropagation(); setResourceTypeModalData({name: rt}); setOriginalResourceTypeName(rt); setResourceTypeEditForm({name: rt}); setIsEditingResourceType(true); setResourceTypeModalOpen(true) }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎</button>
                            <button onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`Delete type "${rt}"?`)) return
                              try {
                                const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(rt)}`), { method: 'DELETE', headers: authHeaders() })
                                if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                await loadResourceTypes()
                              } catch (err) {
                                alert('Delete type failed — ' + ((err as any)?.message || 'check server logs'))
                              }
                            }} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:12}}>
                {(
                  sortColumn ? sortData(resourceTypes
                    .filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase()))
                    .map(name => ({name})), 'name').map(obj => obj.name)
                  : (resourceTypes || []).filter(t => !filterResourceTypeName || t.toLowerCase().includes(filterResourceTypeName.toLowerCase())).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })) ).map(rt => (
                  <div key={rt} style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)'}}>
                    <h5 style={{margin:'0 0 12px 0',fontSize:16,fontWeight:600}}>{rt}</h5>
                    <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                      <button onClick={(e) => { e.stopPropagation(); setResourceTypeModalData({name: rt}); setOriginalResourceTypeName(rt); setResourceTypeEditForm({name: rt}); setIsEditingResourceType(true); setResourceTypeModalOpen(true) }} style={cardButtonStyles.edit as any} {...getButtonHoverHandlers(false)}>✎ Edit</button>
                      <button onClick={async (e) => {
                        e.stopPropagation()
                        if (!confirm(`Delete type "${rt}"?`)) return
                        try {
                          const res = await fetch(apiUrl(`/api/admin/resource-types/${encodeURIComponent(rt)}`), { method: 'DELETE', headers: authHeaders() })
                          if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                          await loadResourceTypes()
                        } catch (err) {
                          alert('Delete type failed — ' + ((err as any)?.message || 'check server logs'))
                        }
                      }} style={cardButtonStyles.delete as any} {...getButtonHoverHandlers(true)}>✕ Delete</button>
                    </div>
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
              {/* New Marker Wizard launch button */}
              <div style={{marginBottom:12,display:'flex',gap:10,alignItems:'center'}}>
                <button className="btn-primary" onClick={openWizard} style={{background:'#3D7DCA',color:'#fff',border:'none',borderRadius:6,padding:'8px 18px',fontWeight:600,fontSize:14,cursor:'pointer'}}>+ New Marker Wizard</button>
                <span style={{color:theme.textMuted,fontSize:13}}>Guided setup: creates a marker, scoring rules, and tags in one step.</span>
              </div>

              {/* Marker creation form (quick add, no rules) */}
              <div style={{marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Quick Add Marker (no rules)</h3>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <input placeholder="Marker name" value={markerName} onChange={e => setMarkerName(e.target.value)} style={{flex:1,padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}} />
                  <input placeholder="Unit (optional)" value={markerUnit} onChange={e => setMarkerUnit(e.target.value)} style={{width:120,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                  <input placeholder="Min value (optional)" type="number" value={markerMinNormal ?? ''} onChange={e => setMarkerMinNormal(e.target.value ? Number(e.target.value) : null)} style={{width:100,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                  <input placeholder="Max value (optional)" type="number" value={markerMaxNormal ?? ''} onChange={e => setMarkerMaxNormal(e.target.value ? Number(e.target.value) : null)} style={{width:100,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                  <button className="btn-primary" onClick={async () => {
                    if (!markerName.trim()) return alert('Name required')
                    try {
                      const res = await fetch(apiUrl('/api/admin/lab-markers'), { method: 'POST', headers: { 'content-type': 'application/json', ...(DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}) }, body: JSON.stringify({ name: markerName.trim(), unit: markerUnit.trim(), min_normal: markerMinNormal, max_normal: markerMaxNormal }) })
                      if (!res.ok) throw new Error('create marker failed')
                      await load()
                      setMarkerName('')
                      setMarkerUnit('')
                      setMarkerMinNormal(null)
                      setMarkerMaxNormal(null)
                    } catch (err) {
                      console.error('createMarker', err)
                      alert('Create marker failed (check server logs)')
                    }
                  }}>Add Marker</button>
                </div>
              </div>

              {/* Lab Markers Filters */}
              <div style={styles.filterBox}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Filter Lab Markers</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.text}}>Marker Name</label>
                    <input
                      type="text"
                      placeholder="(All Names)"
                      value={filterLabMarkerName}
                      onChange={e => setFilterLabMarkerName(e.target.value)}
                      list="lab-marker-names-list"
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
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
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.text}}>Unit</label>
                    <select
                      value={filterLabMarkerUnit}
                      onChange={e => setFilterLabMarkerUnit(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
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
                    style={{opacity: (filterLabMarkerName || filterLabMarkerUnit) ? 1 : 0.5,cursor: (filterLabMarkerName || filterLabMarkerUnit) ? 'pointer' : 'default',padding:'6px 12px',fontSize:14}}
                  >
                    Clear
                  </button>
                </div>
                {(filterLabMarkerName || filterLabMarkerUnit) && (
                  <div style={{fontSize:12,marginTop:8,color:theme.text}}>
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
              <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{marginTop:0,marginBottom:0,fontSize:16,fontWeight:600,color:theme.text}}>Lab Markers</h3>
                <button onClick={() => toggleViewMode('markers')} title={viewMode.markers === 'card' ? 'Table view' : 'Card view'} style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{viewMode.markers === 'table' ? '🗂️' : '📋'}</button>
              </div>

              {viewMode.markers === 'table' ? (
              <div style={{border:`1px solid ${theme.borderColor}`,borderRadius:6,overflow:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead style={{background:'#3D7DCA',borderBottom:`1px solid ${theme.borderColor}`}}>
                    <tr>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('name')}>Name{getSortIndicator('name')}</th>
                      <th style={{padding:8,textAlign:'left',cursor:'pointer',userSelect:'none',color:'#ffffff',fontWeight:500}} onClick={() => handleSort('unit')}>Unit{getSortIndicator('unit')}</th>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>Min Value</th>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>Max Value</th>
                      <th style={{padding:8,textAlign:'right',color:'#ffffff',fontWeight:500}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      sortColumn ? sortData(labMarkers
                        .filter(m => 
                          (!filterLabMarkerName || m.name === filterLabMarkerName)
                          && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                        ), sortColumn) : (labMarkers || [])
                        .filter(m => 
                          (!filterLabMarkerName || m.name === filterLabMarkerName)
                          && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                        ).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                    ).map(m => (
                      <tr key={m.id} style={{borderTop:`1px solid ${theme.borderColor}`}}>
                        {editingId === m.id ? (
                          <>
                            <td style={{padding:8}}><input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}} /></td>
                            <td style={{padding:8}}><input type="text" value={editData.unit || ''} onChange={e => setEditData({...editData, unit: e.target.value})} style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}} /></td>
                            <td style={{padding:8}}><input type="number" value={editData.min_normal ?? ''} onChange={e => setEditData({...editData, min_normal: e.target.value ? Number(e.target.value) : null})} style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}} /></td>
                            <td style={{padding:8}}><input type="number" value={editData.max_normal ?? ''} onChange={e => setEditData({...editData, max_normal: e.target.value ? Number(e.target.value) : null})} style={{width:'100%',padding:'4px 6px',border:`1px solid ${theme.borderColor}`,borderRadius:6}} /></td>
                            <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                              <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                                <button className="btn-ghost" onClick={async () => {
                                  try {
                                    const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ name: editData.name, unit: editData.unit, min_normal: editData.min_normal, max_normal: editData.max_normal }) })
                                    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                    await load()
                                    setEditingId(null)
                                  } catch (err) {
                                    alert('Save marker failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'6px',cursor:'pointer',fontSize:16,color:'#16a34a'}}>✓</button>
                                <button className="btn-ghost" onClick={() => setEditingId(null)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'6px',cursor:'pointer',fontSize:16,color:'#dc2626'}}>⊘</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{padding:8}}><strong>{m.name}</strong></td>
                            <td style={{padding:8}} className="small muted">{m.unit || '—'}</td>
                            <td style={{padding:8}} className="small muted">{m.min_normal ?? '—'}</td>
                            <td style={{padding:8}} className="small muted">{m.max_normal ?? '—'}</td>
                            <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                              <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                                <button onClick={() => {
                                  setMarkerModalOriginalId(m.id)
                                  setMarkerEditForm({ name: m.name, unit: m.unit, min_normal: m.min_normal, max_normal: m.max_normal })
                                  setMarkerModalOpen(true)
                                }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎</button>
                                <button onClick={async () => {
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
                                }} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)}>✕</button>
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
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:12}}>
                {(labMarkers || [])
                  .filter(m => 
                    (!filterLabMarkerName || m.name === filterLabMarkerName)
                    && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                  ).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                  .map(m => (
                  <div key={m.id} style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',height:'100%'}}>
                    {editingId === m.id ? (
                      <>
                        <input type="text" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} autoFocus style={styles.input} />
                        <input type="text" value={editData.unit || ''} onChange={e => setEditData({...editData, unit: e.target.value})} placeholder="Unit" style={styles.input} />
                        <input type="number" value={editData.min_normal ?? ''} onChange={e => setEditData({...editData, min_normal: e.target.value ? Number(e.target.value) : null})} placeholder="Min value" style={styles.input} />
                        <input type="number" value={editData.max_normal ?? ''} onChange={e => setEditData({...editData, max_normal: e.target.value ? Number(e.target.value) : null})} placeholder="Max value" style={styles.input} />
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                          <button className="btn-ghost" onClick={async () => {
                            try {
                              const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ name: editData.name, unit: editData.unit, min_normal: editData.min_normal, max_normal: editData.max_normal }) })
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
                        {m.unit && <p style={{margin:'0 0 2px 0',fontSize:12,color:theme.text}}>Unit: {m.unit}</p>}
                        {m.min_normal !== null && <p style={{margin:'0 0 2px 0',fontSize:12,color:theme.text}}>Min: {m.min_normal}</p>}
                        {m.max_normal !== null && <p style={{margin:'0 0 12px 0',fontSize:12,color:theme.text}}>Max: {m.max_normal}</p>}
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                          <button onClick={() => { setEditingId(null); setMarkerModalOriginalId(m.id); setMarkerEditForm({ name: m.name, unit: m.unit, min_normal: m.min_normal, max_normal: m.max_normal }); setMarkerModalOpen(true) }} style={cardButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎ Edit</button>
                          <button onClick={async () => {
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
                          }} style={cardButtonStyles.delete} {...getButtonHoverHandlers(true)}>✕ Delete</button>
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          {loading ? <div>Loading...</div> : (
            <div>
              {/* Category creation form */}
              <div style={{marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Add Category</h3>
                <div style={{display:'flex',gap:12,alignItems:'flex-start',flexDirection:'column'}}>
                  <input
                    placeholder="Category name (e.g., Diabetes, Heart Health)"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={categoryDescription}
                    onChange={e => setCategoryDescription(e.target.value)}
                    style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,minHeight:'80px',fontFamily:'inherit'}}
                  />
                  <button className="btn-primary" onClick={async () => {
                    if (!newTypeName.trim()) return alert('Category name required')
                    try {
                      await fetchJson('/api/admin/categories', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: newTypeName.trim(), description: categoryDescription.trim(), is_active: true }) })
                      setNewTypeName('')
                      setCategoryDescription('')
                      await loadCategories()
                    } catch (err) {
                      console.error('Create category error:', err)
                      alert(formatErrorMessage(err, 'category'))

                    }
                  }}>Add Category</button>
                </div>
              </div>

              {/* Categories Grid */}
              <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{marginTop:0,marginBottom:0,fontSize:16,fontWeight:600,color:theme.text}}>Categories</h3>
                <button onClick={() => toggleViewMode('categories')} title={viewMode.categories === 'card' ? 'Table view' : 'Card view'} style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{viewMode.categories === 'card' ? '📋' : '🗂️'}</button>
              </div>

              {categories.length === 0 ? (
                <div style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:32,textAlign:'center',color:theme.textMuted}}>
                  {categoriesError ? (
                    <div>
                      <p style={{margin:0}}>Failed to load categories: {categoriesError}</p>
                      <p style={{marginTop:8,fontSize:13}}>Ensure the backend is running and VITE_BACKEND_API_KEY is set for the Admin UI.</p>
                    </div>
                  ) : (
                    <div>No categories found. Add one above or run the migration to add defaults.</div>
                  )}
                </div>
              ) : viewMode.categories === 'table' ? (
                <>
                <div style={{border:`1px solid ${theme.borderColor}`,borderRadius:6,overflow:'auto'}}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={{padding:12,textAlign:'left',fontWeight:600,color:'#ffffff'}}>Category Name</th>
                        <th style={{padding:12,textAlign:'left',fontWeight:600,color:'#ffffff'}}>Description</th>
                        <th style={{padding:12,textAlign:'right',fontWeight:600,color:'#ffffff'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(categories || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(cat => (
                        <tr key={cat.id} style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                          <td style={{padding:12,color:theme.text}}>{cat.name}</td>
                          <td style={{padding:12,color:theme.textMuted}}>{cat.description || '-'}</td>
                          <td style={{padding:12,textAlign:'right',verticalAlign:'middle'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8,justifyContent:'flex-end',height:'100%'}}>
                              <button onClick={() => {
                                  const tagsForCat = (Object.keys(tagsMeta || {})).filter(t => Array.isArray((tagsMeta as any)[t]?.categories) && ((tagsMeta as any)[t].categories || []).includes(cat.name))
                                  setCategoryModalData(cat); setCategoryEditForm({name: cat.name, description: cat.description || '', tags: tagsForCat}); setIsEditingCategory(true); setCategoryModalOpen(true)
                                }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)} aria-label={`Edit category ${cat.name}`}>
                                ✎
                              </button>
                              <button onClick={async () => {
                                if (!confirm('Delete this category?')) return
                                try {
                                  await fetchJson(`/api/admin/categories/${encodeURIComponent(cat.id)}`, { method: 'DELETE' })
                                  await loadCategories()
                                } catch (err) {
                                  console.error('Delete category error:', err)
                                  alert('Delete failed — ' + ((err as any)?.message || 'check server logs'))
                                }
                              }} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)} aria-label={`Delete category ${cat.name}`}>
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              ) : (
                <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))',gap:12}}>
                  {(categories || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map(cat => {
                    const description = cat.description || 'No description'
                    const titleTooLong = cat.name.length > 25
                    const descriptionTooLong = description.length > 85
                    const isTruncated = titleTooLong || descriptionTooLong
                    
                    return (
                      <div key={cat.id} style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,display:'flex',flexDirection:'column',height:'100%',position:'relative'}}>
                        <h4 style={{margin:'0 0 8px 0',fontSize:14,fontWeight:600,color:theme.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {titleTooLong ? (
                            <>
                              {cat.name.substring(0, 22)}…{' '}
                              <button onClick={() => {
                                  const tagsForCat = (Object.keys(tagsMeta || {})).filter(t => Array.isArray((tagsMeta as any)[t]?.categories) && ((tagsMeta as any)[t].categories || []).includes(cat.name))
                                  setCategoryModalData(cat); setCategoryEditForm({name: cat.name, description: cat.description || '', tags: tagsForCat}); setIsEditingCategory(true); setCategoryModalOpen(true)
                                }} style={{background:'transparent',border:'none',color:'#3b82f6',cursor:'pointer',padding:0,textAlign:'left',fontSize:14,fontWeight:600,display:'inline'}}>
                                more
                              </button>
                            </>
                          ) : (
                            cat.name
                          )}
                        </h4>
                        <p style={{margin:'0 0 12px 0',fontSize:13,color:theme.textMuted,flex:1,lineHeight:'1.4',minHeight:'36.4px',maxHeight:'36.4px',overflow:'hidden',position:'relative'}}>
                          <span style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                            {description}
                          </span>
                          {descriptionTooLong && (
                            <span onClick={() => {
                                const tagsForCat = (Object.keys(tagsMeta || {})).filter(t => Array.isArray((tagsMeta as any)[t]?.categories) && ((tagsMeta as any)[t].categories || []).includes(cat.name))
                                setCategoryModalData(cat); setCategoryEditForm({name: cat.name, description: cat.description || '', tags: tagsForCat}); setIsEditingCategory(true); setCategoryModalOpen(true)
                              }} style={{position:'absolute',bottom:0,right:0,background:theme.bg,paddingLeft:20,color:'#3b82f6',cursor:'pointer',textDecoration:'underline',fontWeight:500}}>
                              more
                            </span>
                          )}
                        </p>
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                          <button onClick={() => {
                              const tagsForCat = (Object.keys(tagsMeta || {})).filter(t => Array.isArray((tagsMeta as any)[t]?.categories) && ((tagsMeta as any)[t].categories || []).includes(cat.name))
                              setCategoryModalData(cat); setCategoryEditForm({name: cat.name, description: cat.description || '', tags: tagsForCat}); setIsEditingCategory(true); setCategoryModalOpen(true)
                            }} style={cardButtonStyles.edit as any} {...getButtonHoverHandlers(false)}>
                            ✎ Edit
                          </button>
                          <button onClick={async () => {
                            if (!confirm('Delete this category?')) return
                            try {
                              await fetchJson(`/api/admin/categories/${encodeURIComponent(cat.id)}`, { method: 'DELETE' })
                              await loadCategories()
                            } catch (err) {
                              console.error('Delete category error:', err)
                              alert('Delete failed — ' + ((err as any)?.message || 'check server logs'))
                            }
                          }} style={cardButtonStyles.delete as any} {...getButtonHoverHandlers(true)}>
                            ✕ Delete
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Category Edit Modal - Outside categories view */}
      {categoryModalOpen && categoryModalData && (
        <div onKeyDown={(e) => { if (e.key === 'Escape') { setCategoryModalOpen(false); setIsEditingCategory(false) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
          <div onKeyDown={handleModalKeyDown} style={{background:theme.bg,borderRadius:8,padding:24,width:'77.5%',maxWidth:2760,height:'76%',overflowY:'auto',overflowX:'hidden',border:`1px solid ${theme.borderColor}`,display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:4}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:600,color:theme.text}}>Edit Category</h3>
              <button onClick={() => {setCategoryModalOpen(false); setIsEditingCategory(false)}} style={{background:'transparent',border:'none',fontSize:24,cursor:'pointer',color:theme.text,padding:0}}>✕</button>
            </div>
            {!isEditingCategory ? (
              <>
                <p style={{margin:'0 0 8px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Name:</p>
                <p style={{margin:'0 0 16px 0',fontSize:14,color:theme.text}}>{categoryModalData.name}</p>
                <p style={{margin:'0 0 8px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Description:</p>
                <p style={{margin:'0 0 16px 0',fontSize:14,color:theme.text,whiteSpace:'pre-wrap'}}>{categoryModalData.description || 'No description'}</p>
                <p style={{margin:'0 0 8px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Tags:</p>
                <p style={{margin:'0 0 16px 0',fontSize:14,color:theme.text}}>{(Object.keys(tagsMeta || {}).filter(t => Array.isArray((tagsMeta as any)[t]?.categories) && ((tagsMeta as any)[t].categories || []).includes(categoryModalData.name)).join(', ')) || 'No tags'}</p>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={() => setIsEditingCategory(true)} style={{flex:1,background:'#3b82f6',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>
                    Edit
                  </button>
                  <button onClick={async () => {
                    if (!confirm('Delete this category?')) return
                    try {
                      await fetchJson(`/api/admin/categories/${encodeURIComponent(categoryModalData.id)}`, { method: 'DELETE' })
                      await loadCategories()
                      setCategoryModalOpen(false)
                    } catch (err) {
                      console.error('Delete category error:', err)
                      alert('Delete failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }} style={{flex:1,background:'transparent',border:'1px solid #ef4444',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#ef4444',fontWeight:600}}>
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Name:</label>
                <input autoFocus type="text" value={categoryEditForm.name || ''} onChange={e => setCategoryEditForm({...categoryEditForm, name: e.target.value})} style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,marginBottom:16}} />
                <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Description:</label>
                <textarea value={categoryEditForm.description || ''} onChange={e => setCategoryEditForm({...categoryEditForm, description: e.target.value})} style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,minHeight:'150px',fontFamily:'inherit',marginBottom:12,flex:1}} />
                <label style={{display:'block',marginBottom:8,fontSize:12,fontWeight:600,color:theme.text}}>Tags:</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
                  {(allowedTags || []).map((t: string) => {
                    const checked = Array.isArray(categoryEditForm.tags) && (categoryEditForm.tags || []).includes(t)
                    return (
                      <label key={t} style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background: checked ? '#2563eb' : theme.bg, color: checked ? '#fff' : theme.text, cursor:'pointer'}}>
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          if (e.target.checked) setCategoryEditForm({...categoryEditForm, tags: Array.from(new Set([...(categoryEditForm.tags || []), t]))})
                          else setCategoryEditForm({...categoryEditForm, tags: (categoryEditForm.tags || []).filter((x: string) => x !== t)})
                        }} style={{marginRight:6}} />
                        {t}
                      </label>
                    )
                  })}
                </div>
                <div style={{display:'flex',gap:8,marginTop:'auto'}}>
                  <button onClick={async () => {
                    if (!categoryEditForm.name?.trim()) return alert('Category name required')
                    try {
                      // Update category name/description first
                      const newName = categoryEditForm.name.trim()
                      await fetchJson(`/api/admin/categories/${encodeURIComponent(categoryModalData.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: newName, description: categoryEditForm.description?.trim() || '' }) })

                      // Update tag<->category mappings for tags that changed
                      const desiredTags = Array.isArray(categoryEditForm.tags) ? categoryEditForm.tags : []
                      const categoryName = newName
                      await Promise.all((allowedTags || []).map(async (tagName: string) => {
                        try {
                          const existing = Array.isArray((tagsMeta as any)[tagName]?.categories) ? (tagsMeta as any)[tagName].categories : []
                          const shouldHave = desiredTags.includes(tagName)
                          const newCategories = shouldHave ? Array.from(new Set([...(existing || []), categoryName])) : (existing || []).filter((c: string) => c !== categoryName)
                          const sortedExisting = (existing || []).slice().sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
                          const sortedNew = (newCategories || []).slice().sort((a,b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }))
                          if (JSON.stringify(sortedExisting) !== JSON.stringify(sortedNew)) {
                            await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(tagName)}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ new_name: tagName, categories: newCategories }) })
                          }
                        } catch (err) {
                          console.error('Failed to update tag categories for', tagName, err)
                        }
                      }))

                      await loadTags()
                      await loadCategories()
                      setCategoryModalOpen(false)
                      setIsEditingCategory(false)
                    } catch (err) {
                      console.error('Update error:', err)
                      alert('Update failed — ' + ((err as any)?.message || 'check server logs'))
                    }
                  }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>
                    Save
                  </button>
                  <button onClick={() => { setIsEditingCategory(false); setCategoryModalOpen(false) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tags Tab */}
      {activeTab === 'tags' && (
        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              {/* Tag creation form */}
              <div style={{marginBottom:16,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Add Tag</h3>
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
                    style={{flex:3,minWidth:360,padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text}}
                  />
                  <select value={tagCreateCategory} onChange={e => setTagCreateCategory(e.target.value)} style={{width:180,flexShrink:0,padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                    <option value="">(no category)</option>
                    {(categories || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button className="btn-primary" onClick={async () => {
                    if (!tagInput.trim()) return
                    await addTag(tagInput.trim())
                    setTagInput('')
                  }}>Add Tag</button>
                </div>
              </div>

              {/* Tags Search Filter */}
              <div style={styles.filterBox}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Filter Tags</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'end'}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.text}}>Search Tags</label>
                    <input
                      type="text"
                      placeholder="Tag name..."
                      value={filterTagName}
                      onChange={e => setFilterTagName(e.target.value)}
                      list="search-tags-list"
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                    />
                    <datalist id="search-tags-list">
                      {Array.from(new Set(allowedTags.filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase())))).sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => setFilterTagName('')}
                    style={{opacity: filterTagName ? 1 : 0.5,cursor: filterTagName ? 'pointer' : 'default',padding:'6px 12px',fontSize:14}}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Tags Grid */}
              <div style={{marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{marginTop:0,marginBottom:0,fontSize:16,fontWeight:600,color:theme.text}}>Tags</h3>
                <button onClick={() => toggleViewMode('tags')} title={viewMode.tags === 'card' ? 'Table view' : 'Card view'} style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 10px',cursor:'pointer',fontSize:16,color:theme.text}}>{viewMode.tags === 'table' ? '🗂️' : '📋'}</button>
              </div>

              {viewMode.tags === 'table' ? (
              <div style={{border:`1px solid ${theme.borderColor}`,borderRadius:6,overflow:'auto'}}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={{padding:12,textAlign:'left',fontWeight:600,color:'#ffffff'}}>Tag Name</th>
                      <th style={{padding:12,textAlign:'left',fontWeight:600,color:'#ffffff'}}>Usage</th>
                      <th style={{padding:12,textAlign:'right',fontWeight:600,color:'#ffffff'}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      sortColumn ? sortData(allowedTags
                        .filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase()))
                        .map(name => ({name})), 'name').map(obj => obj.name)
                      : (allowedTags || []).filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase())).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                    ).map(t => {
                      const usageCount = getTagUsageCount(t)
                      return (
                        <tr key={t} style={styles.tableRow}>
                          <td style={{padding:12,fontWeight:500}}>{t}</td>
                          <td style={{padding:12,fontSize:12,color:theme.textMuted}}>Used in {usageCount} place{usageCount !== 1 ? 's' : ''}</td>
                          <td style={{padding:12,textAlign:'right',verticalAlign:'middle'}}>
                            <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                              <button onClick={() => { setTagModalOriginalName(t); setTagEditForm({ name: t, categories: tagsMeta[t]?.categories || [] }); setTagModalOpen(true) }} style={tableButtonStyles.edit} {...getButtonHoverHandlers(false)} aria-label={`Edit tag ${t}`}>✎</button>
                              <button onClick={async () => {
                                if (!confirm(`Delete tag "${t}"?`)) return
                                try {
                                  const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(t)}`), { method: 'DELETE', headers: authHeaders() })
                                  if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                  await load()
                                } catch (err) {
                                  alert('Delete tag failed — ' + ((err as any)?.message || 'check server logs'))
                                }
                              }} style={tableButtonStyles.delete} {...getButtonHoverHandlers(true)} aria-label={`Delete tag ${t}`}>✕</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(4, 1fr)',gap:12}}>
                {(
                  sortColumn ? sortData(allowedTags
                    .filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase()))
                    .map(name => ({name})), 'name').map(obj => obj.name)
                  : (allowedTags || []).filter(t => !filterTagName || t.toLowerCase().includes(filterTagName.toLowerCase())).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                ).map(t => {
                  const usageCount = getTagUsageCount(t)
                  const titleTooLong = t.length > 30
                  return (
                    <div key={t} style={{
                      background:theme.bg,
                      border:`1px solid ${theme.borderColor}`,
                      borderRadius:8,
                      padding:16,
                      boxShadow:'0 1px 2px rgba(0,0,0,0.05)',
                      transition:'all 0.2s',
                      display:'flex',
                      flexDirection:'column',
                      minHeight:160
                    }}>
                      {editingId === `tag-${t}` ? (
                        <>
                          <input 
                            type="text" 
                            value={editData.name || ''} 
                            onChange={e => setEditData({...editData, name: e.target.value})}
                            autoFocus
                            style={{width:'100%',padding:'8px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,fontWeight:500}}
                          />
                          <select value={(editData.categories && editData.categories[0]) || ''} onChange={e => setEditData({...editData, categories: e.target.value ? [e.target.value] : []})} style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                            <option value="">(no category)</option>
                            {(categories || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                          </select>
                          <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:'auto'}}>
                            <button className="btn-ghost" onClick={async () => {
                              try {
                                const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(t)}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ new_name: editData.name.trim(), categories: editData.categories || undefined }) })
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
                          <strong style={{fontSize:16,display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.4,marginBottom:12}}>{t}</strong>
                          <div style={{fontSize:12,color:'#666',marginBottom:12}}>
                            Used in <span style={{fontWeight:600,color:'#1F2937'}}>{usageCount || 0}</span> {usageCount === 1 ? 'place' : 'places'}
                          </div>
                          {tagsMeta[t] && Array.isArray(tagsMeta[t].categories) && tagsMeta[t].categories.length > 0 && (
                            <div style={{fontSize:12,color:theme.textMuted,marginBottom:12}}>Category: <span style={{fontWeight:600,color:theme.text}}>{tagsMeta[t].categories.join(', ')}</span></div>
                          )}
                          <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                            <button onClick={() => {
                              setTagModalOriginalName(t)
                              setTagEditForm({ name: t, categories: tagsMeta[t]?.categories || [] })
                              setTagModalOpen(true)
                            }} style={cardButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎ Edit</button>
                            <button onClick={async () => {
                              if (!confirm(`Delete tag "${t}"? This will remove it from resources and delete any criteria referencing it.`)) return
                              try {
                                const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(t)}`), { method: 'DELETE', headers: authHeaders() })
                                if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                await loadTags()
                                await load()
                              } catch (err) {
                                alert('Delete tag failed — ' + ((err as any)?.message || 'check server logs'))
                              }
                            }} style={cardButtonStyles.delete} {...getButtonHoverHandlers(true)}>✕ Delete</button>
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

      {/* Tag Search Modal */}
      {tagSearchModalOpen && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001}}>
          <div style={{background:theme.card,border:`2px solid ${theme.borderColor}`,borderRadius:8,padding:24,maxWidth:800,width:'90%',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <h3 style={{marginTop:0,marginBottom:16,color:theme.text}}>
              {tagSearchContext === 'filter-type' ? 'Select Resource Types' : 'Select Tags'}
            </h3>
            <input
              type="text"
              placeholder={tagSearchContext === 'filter-type' ? 'Search types...' : 'Search tags...'}
              value={tagSearchInput}
              onChange={e => setTagSearchInput(e.target.value)}
              autoFocus
              style={{padding:12,border:`2px solid #2563eb`,borderRadius:6,marginBottom:16,background:theme.bgSecondary,color:theme.text,fontSize:14,fontWeight:500,boxShadow:'0 2px 4px rgba(37, 99, 235, 0.1)'}}
            />
            <div style={{flex:1,overflowY:'auto',marginBottom:12}}>
              {(tagSearchContext === 'filter-type' ? resourceTypes : allowedTags || [])
                .filter((t: string) => {
                  const isFilterContext = tagSearchContext === 'filter-type' || tagSearchContext === 'filter-tag'
                  const count = tagSearchContext === 'filter-type' ? getResourceTypeCount(t) : getTagCount(t)
                  if (isFilterContext && count === 0) return false
                  return t.toLowerCase().includes(tagSearchInput.toLowerCase()) &&
                    (tagSearchContext === 'create' ? !selectedTags.includes(t) :
                     tagSearchContext === 'edit' ? (resourceModalOpen && isEditingResource ? !(resourceEditForm.tags || []).includes(t) : !(editData.tags || []).includes(t)) :
                     tagSearchContext === 'filter-type' ? !filterTypes.includes(t) :
                     !filterTags.includes(t))
                }).slice().sort((a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                .map((t: string) => {
                  const isFilterContext = tagSearchContext === 'filter-type' || tagSearchContext === 'filter-tag'
                  const count = tagSearchContext === 'filter-type' ? getResourceTypeCount(t) : getTagCount(t)
                  const badgeColor = tagSearchContext === 'filter-type' ? '#3D7DCA' : '#2563eb'
                  return (
                    <div
                      key={t}
                      onClick={() => handleTagSelect(t)}
                      style={{
                        padding:10,
                        background:theme.bg,
                        border:`1px solid ${theme.borderColor}`,
                        borderRadius:6,
                        marginBottom:8,
                        cursor:'pointer',
                        color:theme.text,
                        transition:'all 0.2s',
                        display:'flex',
                        justifyContent:'space-between',
                        alignItems:'center'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.bgSecondary)}
                      onMouseLeave={e => (e.currentTarget.style.background = theme.bg)}
                    >
                      <span>{t}</span>
                      {isFilterContext && <span style={{fontSize:12,fontWeight:600,background:badgeColor,color:'#fff',padding:'2px 8px',borderRadius:12}}>{count}</span>}
                    </div>
                  )
                })}
            </div>
            <button
              onClick={() => setTagSearchModalOpen(false)}
              style={{padding:10,background:theme.text,color:theme.card,border:'none',borderRadius:6,cursor:'pointer',fontWeight:600}}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Category Search Modal */}
      {categorySearchModalOpen && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001}}>
          <div style={{background:theme.card,border:`2px solid ${theme.borderColor}`,borderRadius:8,padding:24,maxWidth:800,width:'90%',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <h3 style={{marginTop:0,marginBottom:16,color:theme.text}}>Select Categories</h3>
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearchInput}
              onChange={e => setCategorySearchInput(e.target.value)}
              autoFocus
              style={{padding:12,border:`2px solid #10b981`,borderRadius:6,marginBottom:16,background:theme.bgSecondary,color:theme.text,fontSize:14,fontWeight:500,boxShadow:'0 2px 4px rgba(16, 185, 129, 0.1)'}}
            />
            <div style={{flex:1,overflowY:'auto',marginBottom:12}}>
              {categories
                .filter((c: any) => {
                  const count = getCategoryCount(c.name)
                  if (categorySearchContext === 'filter' && count === 0) return false
                  return c.is_active &&
                    c.name.toLowerCase().includes(categorySearchInput.toLowerCase()) &&
                    (categorySearchContext === 'create' ? !selectedCategories.includes(c.name) :
                     categorySearchContext === 'edit' ? (resourceModalOpen && isEditingResource ? !(resourceEditForm.categories || []).includes(c.name) : !(editData.categories || []).includes(c.name)) :
                     !filterCategories.includes(c.name))
                })
                .map((c: any) => {
                  const count = getCategoryCount(c.name)
                  const isFilterContext = categorySearchContext === 'filter'
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleCategorySelect(c.name)}
                      style={{
                        padding:10,
                        background:theme.bg,
                        border:`1px solid ${theme.borderColor}`,
                        borderRadius:6,
                        marginBottom:8,
                        display:'flex',
                        justifyContent:'space-between',
                        alignItems:'center',
                        cursor:'pointer',
                        color:theme.text,
                        transition:'all 0.2s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.bgSecondary)}
                      onMouseLeave={e => (e.currentTarget.style.background = theme.bg)}
                    >
                      <span>{c.name}</span>
                      {isFilterContext && <span style={{fontSize:12,fontWeight:600,background:'#10b981',color:'#fff',padding:'2px 8px',borderRadius:12}}>{count}</span>}
                    </div>
                  )
                })}
            </div>
            <button
              onClick={() => setCategorySearchModalOpen(false)}
              style={{padding:10,background:theme.text,color:theme.card,border:'none',borderRadius:6,cursor:'pointer',fontWeight:600}}
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* Tag Edit Modal */}
      {tagModalOpen && (
        <div onKeyDown={(e) => { if (e.key === 'Escape') { setTagModalOpen(false); setTagModalOriginalName(null); setTagEditForm({}) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001}}>
          <div onKeyDown={handleModalKeyDown} style={{background:theme.card,border:`2px solid ${theme.borderColor}`,borderRadius:8,padding:24,width:'77.5%',maxWidth:2760,height:'76%',overflowY:'auto',overflowX:'hidden',display:'flex',flexDirection:'column'}}>
            <h3 style={{marginTop:0,marginBottom:4,color:theme.text}}>Edit Tag</h3>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:8}}>Name</label>
            <input autoFocus value={tagEditForm.name || ''} onChange={e => setTagEditForm(prev => ({...prev, name: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text}} />

            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:8}}>Categories</label>
            <div style={{marginBottom:12,maxHeight:220,overflowY:'auto',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'2px 8px 6px 8px',background:theme.bg,flex:1}}>
              {(categories || []).slice().sort((a:any,b:any) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })).map((c:any) => (
                <label key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'0 6px',marginBottom:3,cursor:'pointer',color:theme.text,lineHeight:1.1}}>
                  <input type="checkbox" checked={(tagEditForm.categories || []).includes(c.name)} onChange={e => {
                    const checked = e.target.checked
                    setTagEditForm(prev => {
                      const current = Array.isArray(prev.categories) ? prev.categories.slice() : []
                      if (checked) {
                        if (!current.includes(c.name)) current.push(c.name)
                      } else {
                        const idx = current.indexOf(c.name)
                        if (idx !== -1) current.splice(idx,1)
                      }
                      return {...prev, categories: current}
                    })
                  }} />
                  <span style={{flex:1}}>{c.name}</span>
                </label>
              ))}
              {categories.length === 0 && <div style={{color:theme.textMuted}}>No categories available</div>}
            </div>

            <div style={{display:'flex',gap:8,marginTop:'auto'}}>
              <button onClick={async () => {
                try {
                  const payload: any = { new_name: (tagEditForm.name || '').trim(), categories: tagEditForm.categories || [] }
                  const nameToPatch = tagModalOriginalName || (tagEditForm.name || '').trim()
                  const res = await fetch(apiUrl(`/api/admin/tags/${encodeURIComponent(nameToPatch)}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify(payload) })
                  if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}))
                    alert(formatErrorMessage(errorData, 'tag'))
                    console.warn('tag PATCH error:', errorData)
                    return
                  }
                  await loadTags()
                  await load()
                  setTagModalOpen(false)
                  setTagModalOriginalName(null)
                  setTagEditForm({})
                } catch (err) {
                  alert(formatErrorMessage(err, 'tag'))
                  console.error('tag PATCH error:', err)
                }
              }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save</button>
              <button onClick={() => { setTagModalOpen(false); setTagModalOriginalName(null); setTagEditForm({}) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Marker Edit Modal */}
      {markerModalOpen && (
        <div onKeyDown={(e) => { if (e.key === 'Escape') { setMarkerModalOpen(false); setMarkerModalOriginalId(null) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001}}>
          <div onKeyDown={handleModalKeyDown} style={{background:theme.card,border:`2px solid ${theme.borderColor}`,borderRadius:8,padding:24,width:'77.5%',maxWidth:2760,height:'76%',overflowY:'auto',overflowX:'hidden',display:'flex',flexDirection:'column'}}>
            <h3 style={{marginTop:0,marginBottom:4,color:theme.text}}>Edit Lab Marker</h3>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:8}}>Name</label>
            <input autoFocus value={markerEditForm.name || ''} onChange={e => setMarkerEditForm(prev => ({...prev, name: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text}} />
            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:8}}>Unit</label>
            <input value={markerEditForm.unit || ''} onChange={e => setMarkerEditForm(prev => ({...prev, unit: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text}} />
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <div style={{flex:1}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6}}>Min Value</label>
                <input type="number" value={markerEditForm.min_normal ?? ''} onChange={e => setMarkerEditForm(prev => ({...prev, min_normal: e.target.value ? Number(e.target.value) : null}))} style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bgSecondary,color:theme.text}} />
              </div>
              <div style={{flex:1}}>
                <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6}}>Max Value</label>
                <input type="number" value={markerEditForm.max_normal ?? ''} onChange={e => setMarkerEditForm(prev => ({...prev, max_normal: e.target.value ? Number(e.target.value) : null}))} style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bgSecondary,color:theme.text}} />
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginTop:'auto'}}>
              <button onClick={async () => {
                try {
                  const id = markerModalOriginalId
                  if (!id) throw new Error('Missing marker id')
                  const res = await fetch(apiUrl(`/api/admin/lab-markers/${id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ name: markerEditForm.name, unit: markerEditForm.unit, min_normal: markerEditForm.min_normal, max_normal: markerEditForm.max_normal }) })
                  if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                  await load()
                  setMarkerModalOpen(false)
                  setMarkerModalOriginalId(null)
                } catch (err) {
                  alert('Save marker failed — ' + ((err as any)?.message || 'check server logs'))
                }
              }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save</button>
              <button onClick={() => { setMarkerModalOpen(false); setMarkerModalOriginalId(null) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* ── New Marker Wizard Modal ── */}
      {wizardOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:10,padding:28,width:560,maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',position:'relative'}}>
            <button onClick={() => setWizardOpen(false)} style={{position:'absolute',top:12,right:16,background:'transparent',border:'none',fontSize:20,cursor:'pointer',color:theme.textMuted}}>×</button>

            {/* Step indicator */}
            <div style={{display:'flex',gap:0,marginBottom:24}}>
              {[1,2,3].map(n => (
                <div key={n} style={{flex:1,textAlign:'center',paddingBottom:8,borderBottom:`3px solid ${wizardStep === n ? '#3D7DCA' : wizardStep > n ? '#16a34a' : theme.borderColor}`,fontSize:13,fontWeight:600,color:wizardStep === n ? '#3D7DCA' : wizardStep > n ? '#16a34a' : theme.textMuted}}>
                  {n === 1 ? 'Step 1 — Create Marker' : n === 2 ? 'Step 2 — Scoring Rules' : 'Step 3 — Review & Save'}
                </div>
              ))}
            </div>

            {/* Step 1 */}
            {wizardStep === 1 && (
              <div>
                <p style={{marginTop:0,marginBottom:16,fontSize:14,color:theme.textMuted}}>Enter a name and optional unit for the new lab marker.</p>
                <div style={{marginBottom:14}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Marker Name *</label>
                  <input
                    autoFocus
                    placeholder="e.g. Blood Glucose"
                    value={wizardMarkerName}
                    onChange={e => setWizardMarkerName(e.target.value)}
                    style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box'}}
                  />
                </div>
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Unit (optional)</label>
                  <input
                    placeholder="e.g. mg/dL"
                    value={wizardMarkerUnit}
                    onChange={e => setWizardMarkerUnit(e.target.value)}
                    style={{width:'100%',padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box'}}
                  />
                </div>
                {wizardError && <p style={{color:'#dc2626',fontSize:13,marginBottom:12}}>{wizardError}</p>}
                <div style={{display:'flex',justifyContent:'flex-end'}}>
                  <button
                    disabled={!wizardMarkerName.trim()}
                    onClick={() => {
                      if (!wizardMarkerName.trim()) return
                      setWizardError(null)
                      autoSuggestTags(wizardMarkerName)
                      setWizardStep(2)
                    }}
                    style={{background:'#3D7DCA',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',fontWeight:600,fontSize:14,cursor:'pointer',opacity:!wizardMarkerName.trim()?0.5:1}}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {wizardStep === 2 && (
              <div>
                <p style={{marginTop:0,marginBottom:4,fontSize:14,color:theme.textMuted}}>Define scoring rules for <strong style={{color:theme.text}}>{wizardMarkerName}</strong>. At least the Optimal row is required.</p>
                <p style={{marginTop:0,marginBottom:16,fontSize:12,color:theme.textMuted}}>Rows with empty Min, Max, or Tag will be skipped.</p>
                <div style={{marginBottom:16}}>
                  <div style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr 1fr',gap:8,marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Label</div>
                    <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Min Value</div>
                    <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Max Value</div>
                    <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Tag Name</div>
                  </div>
                  {wizardRules.map((rule, i) => (
                    <div key={i} style={{display:'grid',gridTemplateColumns:'100px 1fr 1fr 1fr',gap:8,marginBottom:8,alignItems:'center'}}>
                      <div style={{fontSize:13,fontWeight:600,color:i === 0 ? '#16a34a' : i === 1 ? '#ca8a04' : '#dc2626'}}>{rule.label}</div>
                      <input
                        type="number"
                        placeholder="Min"
                        value={rule.min_value}
                        onChange={e => updateWizardRule(i, 'min_value', e.target.value)}
                        style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={rule.max_value}
                        onChange={e => updateWizardRule(i, 'max_value', e.target.value)}
                        style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}}
                      />
                      <input
                        placeholder="Tag name"
                        value={rule.tag_name}
                        onChange={e => updateWizardRule(i, 'tag_name', e.target.value)}
                        style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}}
                      />
                    </div>
                  ))}
                </div>
                {wizardError && <p style={{color:'#dc2626',fontSize:13,marginBottom:12}}>{wizardError}</p>}
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <button onClick={() => setWizardStep(1)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'8px 16px',fontSize:14,cursor:'pointer',color:theme.text}}>← Back</button>
                  <button
                    onClick={() => {
                      const valid = wizardRules.filter(r => r.tag_name.trim() && r.min_value !== '' && r.max_value !== '')
                      if (valid.length === 0) { setWizardError('Fill in at least the Optimal row (Min, Max, and Tag).'); return }
                      if (!wizardRules[0].tag_name.trim() || wizardRules[0].min_value === '' || wizardRules[0].max_value === '') {
                        setWizardError('The Optimal row is required.')
                        return
                      }
                      setWizardError(null)
                      setWizardStep(3)
                    }}
                    style={{background:'#3D7DCA',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',fontWeight:600,fontSize:14,cursor:'pointer'}}
                  >Next →</button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {wizardStep === 3 && (
              <div>
                <p style={{marginTop:0,marginBottom:16,fontSize:14,color:theme.textMuted}}>Review what will be created, then click <strong>Create All</strong>.</p>
                <div style={{background:theme.bgSecondary,borderRadius:8,padding:16,marginBottom:16,border:`1px solid ${theme.borderColor}`}}>
                  <div style={{marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:theme.textMuted,textTransform:'uppercase'}}>Marker</span>
                    <div style={{marginTop:4,fontSize:14,color:theme.text}}>
                      <strong>{wizardMarkerName}</strong>{wizardMarkerUnit ? <span style={{color:theme.textMuted}}> ({wizardMarkerUnit})</span> : null}
                    </div>
                  </div>
                  <div style={{marginBottom:10}}>
                    <span style={{fontSize:12,fontWeight:700,color:theme.textMuted,textTransform:'uppercase'}}>Scoring Rules</span>
                    {wizardRules.filter(r => r.tag_name.trim() && r.min_value !== '' && r.max_value !== '').map((r, i) => (
                      <div key={i} style={{marginTop:4,fontSize:13,color:theme.text}}>
                        <span style={{fontWeight:600,color:i === 0 ? '#16a34a' : i === 1 ? '#ca8a04' : '#dc2626'}}>{r.label}:</span>{' '}
                        {r.min_value} – {r.max_value} → <code style={{background:theme.bgTertiary,padding:'1px 4px',borderRadius:3,fontSize:12}}>{r.tag_name}</code>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span style={{fontSize:12,fontWeight:700,color:theme.textMuted,textTransform:'uppercase'}}>Tags to Create</span>
                    <div style={{marginTop:4,display:'flex',flexWrap:'wrap',gap:6}}>
                      {[...new Set(wizardRules.filter(r => r.tag_name.trim()).map(r => r.tag_name.trim()))].map(t => (
                        <span key={t} style={{background:'#dbeafe',color:'#1d4ed8',borderRadius:4,padding:'2px 8px',fontSize:12,fontWeight:500}}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{background:'#fef9c3',border:'1px solid #fde047',borderRadius:6,padding:10,marginBottom:16,fontSize:12,color:'#713f12'}}>
                  <strong>Developer note:</strong> For BHAS scoring, add the Optimal tag to <code>OPTIMAL_TAGS</code> and the Improvement tag to <code>IMPROVEMENT_TAGS</code> in <code>src/utils/evaluateRules.ts</code> — this requires a code change and redeploy.
                </div>
                {wizardError && <p style={{color:'#dc2626',fontSize:13,marginBottom:12}}>{wizardError}</p>}
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <button onClick={() => setWizardStep(2)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'8px 16px',fontSize:14,cursor:'pointer',color:theme.text}}>← Back</button>
                  <button
                    disabled={wizardSaving}
                    onClick={wizardSave}
                    style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:6,padding:'8px 24px',fontWeight:700,fontSize:14,cursor:'pointer',opacity:wizardSaving?0.6:1}}
                  >{wizardSaving ? 'Creating…' : 'Create All'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
