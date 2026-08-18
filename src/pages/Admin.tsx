import React, { useEffect, useState, useCallback } from 'react'
import { supabase, directFetch } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AffiliateProductsTab from '../components/AffiliateProductsTab'
import AdminBrokersTab from '../components/AdminBrokersTab'
import AdminProvidersTab from '../components/AdminProvidersTab'
import AdminLeaguesTab from '../components/AdminLeaguesTab'
import AdminUsersTab from '../components/AdminUsersTab'
import AdminLabResultsTab from '../components/AdminLabResultsTab'
import AdminChallengesTab from '../components/AdminChallengesTab'
import AdminLabSetsPanel from '../components/AdminLabSetsPanel'

type Resource = { id?: string; type: string; title: string; description?: string | null; tags: string[]; categories?: string[]; link_url?: string | null; duration_type?: 'short' | 'long' | 'both' }
type EditData = { tags?: string[]; categories?: string[]; [key: string]: any }

export default function Admin({ onResourcesChanged, initialTab }: { onResourcesChanged?: () => void; initialTab?: string }) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkProtocol, setLinkProtocol] = useState('https://')
  const [type, setType] = useState('video')
  // tag-manager state
  const [allowedTags, setAllowedTags] = useState<string[]>([])
  const [tagsMeta, setTagsMeta] = useState<Record<string, { categories?: string[]; scoring_tier?: string | null }>>({})
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tagCreateCategory, setTagCreateCategory] = useState<string>('')

  // criteria / logic_rules state
  const [labMarkers, setLabMarkers] = useState<Array<any>>([])
  const [logicRules, setLogicRules] = useState<Array<any>>([])
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [ruleForm, setRuleForm] = useState<{ markerName?: string; min_value?: string; max_value?: string; tag_to_apply?: string }>({})


  const VALID_TABS = ['resources','types','markers','tags','categories','criteria','goals','audit','organizations','products','brokers','providers','leagues','users','challenges','lab-results','lab-sets'] as const
  type AdminTab = typeof VALID_TABS[number]
  const [activeTab, setActiveTab] = useState<AdminTab>(VALID_TABS.includes(initialTab as AdminTab) ? (initialTab as AdminTab) : 'resources')
  // Use global theme context
  const { darkMode, theme: globalTheme } = useTheme()
  const { isSuperAdmin, user } = useAuth()
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
  const [filterLabMarkerActive, setFilterLabMarkerActive] = useState<string>('')
  const [filterLabMarkerSex, setFilterLabMarkerSex] = useState<string>('')
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
  const [markerEditForm, setMarkerEditForm] = useState<{name?: string; unit?: string; cpt_code?: string; applicable_sex?: string; marker_category?: string}>({})
  const [markerEditRules, setMarkerEditRules] = useState<Array<{ label: string; min_value: string; max_value: string; tag_name: string }>>([
    { label: 'Optimal', min_value: '', max_value: '', tag_name: '' },
    { label: 'Improvement', min_value: '', max_value: '', tag_name: '' },
    { label: 'Out of Range', min_value: '', max_value: '', tag_name: '' },
  ])
  const [markerEditTierMessages, setMarkerEditTierMessages] = useState<Record<number, string>>({})
  const [markerEditSaving, setMarkerEditSaving] = useState(false)
  const [markerEditError, setMarkerEditError] = useState<string | null>(null)
  // Marker aliases state (F87)
  const [markerEditAliases, setMarkerEditAliases] = useState<Array<{ id: string; alias: string }>>([])
  const [mergeSourceId, setMergeSourceId] = useState('')
  const [mergeSaving, setMergeSaving] = useState(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  // health goal modal state
  const [healthGoalModalOpen, setHealthGoalModalOpen] = useState(false)
  const [healthGoalModalData, setHealthGoalModalData] = useState<any>(null)
  const [isEditingHealthGoal, setIsEditingHealthGoal] = useState(false)
  const [healthGoalEditForm, setHealthGoalEditForm] = useState<{name?: string; description?: string}>({})
  // resource modal state
  const [resourceModalOpen, setResourceModalOpen] = useState(false)
  const [resourceModalData, setResourceModalData] = useState<any>(null)
  const [isEditingResource, setIsEditingResource] = useState(false)
  const [resourceEditForm, setResourceEditForm] = useState<{title?: string; type?: string; tags?: string[]; categories?: string[]; link_url?: string; link_protocol?: string; thumbnail_url?: string; duration_type?: string}>({})
  const [thumbnailUploading, setThumbnailUploading] = useState(false)
  const [thumbnailError, setThumbnailError] = useState<string | null>(null)
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
  const [wizardRules, setWizardRules] = useState<Array<{ label: string; min_value: string; max_value: string; tag_name: string }>>([
    { label: 'Optimal', min_value: '', max_value: '', tag_name: '' },
    { label: 'Improvement', min_value: '', max_value: '', tag_name: '' },
    { label: 'Out of Range', min_value: '', max_value: '', tag_name: '' }
  ])
  const [wizardTierMessages, setWizardTierMessages] = useState<Record<string, string>>({
    'Optimal': '', 'Improvement': '', 'Out of Range': '',
  })
  const [wizardSaving, setWizardSaving] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)

  // Organizations state (Feature 14)
  const [orgs, setOrgs] = useState<Array<{id: string; name: string; slug: string; created_at: string; member_count: number; invite_code: string | null}>>([])
  const [orgMembers, setOrgMembers] = useState<Record<string, Array<{id: string; user_id: string; role: string; team: string|null; joined_at: string; username: string|null; public_id: string|null}>>>({})
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null)
  const [orgCreateName, setOrgCreateName] = useState('')
  const [orgCreateSlug, setOrgCreateSlug] = useState('')
  const [orgCreateError, setOrgCreateError] = useState<string | null>(null)
  const [orgCreateSaving, setOrgCreateSaving] = useState(false)
  const [orgAddUserId, setOrgAddUserId] = useState('')
  const [orgAddRole, setOrgAddRole] = useState<'member'|'admin'>('member')
  const [orgAddTeam, setOrgAddTeam] = useState<''|'fire'|'water'|'wind'|'earth'>('')
  const [orgAddError, setOrgAddError] = useState<string | null>(null)
  const [orgAddSaving, setOrgAddSaving] = useState(false)
  const [assigningTeams, setAssigningTeams] = useState<Record<string, boolean>>({})
  const [assignTeamsMsg, setAssignTeamsMsg] = useState<Record<string, string | null>>({})
  const [allPublicIds, setAllPublicIds] = useState<string[]>([])
  const [publicIdsLoaded, setPublicIdsLoaded] = useState(false)
  const [orgTeams, setOrgTeams] = useState<Record<string, Array<{id: string; name: string}>>>({})
  const [orgTeamInput, setOrgTeamInput] = useState<Record<string, string>>({})
  const [orgTeamEditId, setOrgTeamEditId] = useState<string | null>(null)
  const [orgTeamEditVal, setOrgTeamEditVal] = useState('')
  const [orgTeamError, setOrgTeamError] = useState<Record<string, string | null>>({})
  // Feature 18: per-team BHAS score summary for each org (keyed by org.slug)
  const [orgTeamScores, setOrgTeamScores] = useState<Record<string, Array<{team: string; member_count: number; avg_bhas_pct: number | null; optimal_pct: number | null}>>>({})

  // F70: invite codes per org
  const [orgInviteCodes, setOrgInviteCodes] = useState<Record<string, string>>({})
  const [orgInviteCodeLoading, setOrgInviteCodeLoading] = useState<Record<string, boolean>>({})

  // Feature 18a: Org list filters
  const [orgSearch, setOrgSearch] = useState('')
  const [orgMinMembers, setOrgMinMembers] = useState('')
  const [orgSortBy, setOrgSortBy] = useState<'name' | 'members'>('name')

  // Feature 18a: Member table filters (per org, keyed by org.id)
  const [memberPubIdSearch, setMemberPubIdSearch] = useState<Record<string, string>>({})
  const [memberTeamFilter, setMemberTeamFilter] = useState<Record<string, string>>({})
  const [memberRoleFilter, setMemberRoleFilter] = useState<Record<string, string>>({})
  const [memberUnassignedOnly, setMemberUnassignedOnly] = useState<Record<string, boolean>>({})

  // Feature 18a: Team score summary filters (per org, keyed by org.slug)
  const [teamScoreMinAvg, setTeamScoreMinAvg] = useState<Record<string, string>>({})
  const [teamScoreHasMembersOnly, setTeamScoreHasMembersOnly] = useState<Record<string, boolean>>({})

  // Column sort state for sortable tables
  type SortDir = 'asc' | 'desc'
  const [teamScoreSort, setTeamScoreSort] = useState<Record<string, {col: string; dir: SortDir}>>({})
  const [memberSort, setMemberSort] = useState<Record<string, {col: string; dir: SortDir}>>({})
  const [identitySort, setIdentitySort] = useState<{col: string; dir: SortDir}>({col: 'name', dir: 'asc'})

  // User identity mapping state (Feature 15)
  const [showIdentityPanel, setShowIdentityPanel] = useState<boolean>(() => localStorage.getItem('bhi_show_identity_panel') === 'true')
  const [allUsers, setAllUsers] = useState<Array<{id: string; name: string; email: string; username: string|null; public_id: string|null; role: string; created_at: string}>>([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [editingUsernameId, setEditingUsernameId] = useState<string | null>(null)
  const [editingUsernameVal, setEditingUsernameVal] = useState('')
  const [usernameOverrideError, setUsernameOverrideError] = useState<string | null>(null)
  const [usernameOverrideSaving, setUsernameOverrideSaving] = useState(false)

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
    setWizardRules(prev => prev.map(r => {
      if (r.tag_name) return r // don't overwrite user edits
      const prefix = r.label === 'Optimal' ? 'Normal' : r.label === 'Improvement' ? 'Borderline' : 'High'
      return { ...r, tag_name: `${prefix}_${base}` }
    }))
  }

  function updateWizardRule(index: number, field: string, value: string) {
    setWizardRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function addWizardRow(label: string) {
    setWizardRules(prev => {
      // Insert after last row with same label
      const lastIdx = prev.map((r, i) => r.label === label ? i : -1).filter(i => i >= 0).pop() ?? prev.length - 1
      const next = [...prev]
      next.splice(lastIdx + 1, 0, { label, min_value: '', max_value: '', tag_name: '' })
      return next
    })
  }

  function removeWizardRow(index: number) {
    setWizardRules(prev => {
      const label = prev[index].label
      const sameCount = prev.filter(r => r.label === label).length
      if (sameCount <= 1) return prev // keep at least one row per tier
      return prev.filter((_, i) => i !== index)
    })
  }

  function addMarkerEditRow(label: string) {
    setMarkerEditRules(prev => {
      const lastIdx = prev.map((r, i) => r.label === label ? i : -1).filter(i => i >= 0).pop() ?? prev.length - 1
      const next = [...prev]
      next.splice(lastIdx + 1, 0, { label, min_value: '', max_value: '', tag_name: '' })
      return next
    })
  }

  function removeMarkerEditRow(index: number) {
    setMarkerEditRules(prev => {
      const label = prev[index].label
      const sameCount = prev.filter(r => r.label === label).length
      if (sameCount <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  function updateMarkerEditRule(index: number, field: string, value: string) {
    setMarkerEditRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  async function wizardSave() {
    setWizardSaving(true)
    setWizardError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/new-marker-wizard'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: wizardMarkerName.trim(), unit: wizardMarkerUnit.trim(), rules: wizardRules, tierMessages: wizardTierMessages })
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
  // Tracks whether the initial mount has completed — used to skip the tab useEffect on first render
  const initialMountRef = React.useRef(true)

  async function load() {
    // cancel previous load
    try { loadControllerRef.current?.abort() } catch {}
    loadCategories()
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

  // Organizations loaders (Feature 14)
  async function loadOrgs() {
    setLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/organizations'), { headers: authHeaders() })
      const body = await res.json()
      const orgsData = body || []
      setOrgs(orgsData)
      const codes: Record<string, string> = {}
      for (const o of orgsData) { if (o.invite_code) codes[o.id] = o.invite_code }
      setOrgInviteCodes(codes)
    } catch (err) {
      console.error('loadOrgs', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadOrgMembers(orgId: string) {
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/members`), { headers: authHeaders() })
      const body = await res.json()
      setOrgMembers(prev => ({ ...prev, [orgId]: Array.isArray(body) ? body : [] }))
    } catch (err) {
      console.error('loadOrgMembers', err)
    }
  }

  async function loadOrgTeams(orgId: string) {
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/teams`), { headers: authHeaders() })
      const body = await res.json()
      setOrgTeams(prev => ({ ...prev, [orgId]: Array.isArray(body) ? body : [] }))
    } catch (err) {
      console.error('loadOrgTeams', err)
    }
  }

  async function addOrgTeam(orgId: string) {
    const name = (orgTeamInput[orgId] || '').trim()
    if (!name) return
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/teams`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name })
      })
      if (res.status === 409) { setOrgTeamError(prev => ({ ...prev, [orgId]: 'Team name already exists.' })); return }
      if (!res.ok) { setOrgTeamError(prev => ({ ...prev, [orgId]: 'Error adding team.' })); return }
      setOrgTeamInput(prev => ({ ...prev, [orgId]: '' }))
      setOrgTeamError(prev => ({ ...prev, [orgId]: null }))
      await loadOrgTeams(orgId)
    } catch {
      setOrgTeamError(prev => ({ ...prev, [orgId]: 'Network error.' }))
    }
  }

  async function saveOrgTeamEdit(orgId: string, teamId: string) {
    const name = orgTeamEditVal.trim()
    if (!name) return
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/teams/${teamId}`), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name })
      })
      if (res.status === 409) { setOrgTeamError(prev => ({ ...prev, [orgId]: 'Team name already exists.' })); return }
      if (!res.ok) { setOrgTeamError(prev => ({ ...prev, [orgId]: 'Error renaming team.' })); return }
      setOrgTeamEditId(null)
      setOrgTeamError(prev => ({ ...prev, [orgId]: null }))
      await loadOrgTeams(orgId)
    } catch {
      setOrgTeamError(prev => ({ ...prev, [orgId]: 'Network error.' }))
    }
  }

  async function deleteOrgTeam(orgId: string, teamId: string) {
    if (!confirm('Delete this team? Members assigned to it will become unassigned.')) return
    try {
      await fetch(apiUrl(`/api/admin/organizations/${orgId}/teams/${teamId}`), {
        method: 'DELETE', headers: authHeaders()
      })
      await loadOrgTeams(orgId)
    } catch (err) {
      console.error('deleteOrgTeam', err)
    }
  }

  async function loadAllPublicIds() {
    if (publicIdsLoaded) return
    try {
      const res = await fetch(apiUrl('/api/admin/public-ids'), { headers: authHeaders() })
      const body = await res.json()
      setAllPublicIds(Array.isArray(body) ? body : [])
      setPublicIdsLoaded(true)
    } catch (err) {
      console.error('loadAllPublicIds', err)
    }
  }

  async function createOrg() {
    if (!orgCreateName.trim() || !orgCreateSlug.trim()) { setOrgCreateError('Name and slug are required.'); return }
    setOrgCreateSaving(true); setOrgCreateError(null)
    try {
      const res = await fetch(apiUrl('/api/admin/organizations'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: orgCreateName.trim(), slug: orgCreateSlug.trim() })
      })
      if (res.status === 409) { setOrgCreateError('Slug already in use — choose another.'); return }
      if (!res.ok) { setOrgCreateError('Server error creating org.'); return }
      setOrgCreateName(''); setOrgCreateSlug(''); setOrgCreateError(null)
      await loadOrgs()
    } catch (err) {
      setOrgCreateError('Network error.')
    } finally {
      setOrgCreateSaving(false)
    }
  }

  async function regenerateInviteCode(orgId: string) {
    setOrgInviteCodeLoading(prev => ({ ...prev, [orgId]: true }))
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/regenerate-code`), { method: 'POST', headers: authHeaders() })
      const body = await res.json()
      if (body.invite_code) setOrgInviteCodes(prev => ({ ...prev, [orgId]: body.invite_code }))
    } catch (err) {
      console.error('regenerateInviteCode', err)
    } finally {
      setOrgInviteCodeLoading(prev => ({ ...prev, [orgId]: false }))
    }
  }

  async function deleteOrg(orgId: string) {
    if (!confirm('Delete this organization and all its memberships?')) return
    try {
      await fetch(apiUrl(`/api/admin/organizations/${orgId}`), { method: 'DELETE', headers: authHeaders() })
      await loadOrgs()
      if (expandedOrgId === orgId) setExpandedOrgId(null)
    } catch (err) {
      console.error('deleteOrg', err)
    }
  }

  async function addOrgMember(orgId: string) {
    if (!orgAddUserId.trim()) { setOrgAddError('Public ID is required.'); return }
    setOrgAddSaving(true); setOrgAddError(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/members`), {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ public_id: orgAddUserId.trim(), role: orgAddRole, team: orgAddTeam || null })
      })
      if (res.status === 404) { setOrgAddError('No user found with that Public ID.'); return }
      if (res.status === 409) { setOrgAddError('User is already a member.'); return }
      if (!res.ok) { setOrgAddError('Server error adding member.'); return }
      setOrgAddUserId(''); setOrgAddRole('member'); setOrgAddTeam('')
      await loadOrgMembers(orgId)
      await loadOrgs()
    } catch (err) {
      setOrgAddError('Network error.')
    } finally {
      setOrgAddSaving(false)
    }
  }

  async function removeOrgMember(orgId: string, userId: string) {
    if (!confirm('Remove this member from the organization?')) return
    try {
      await fetch(apiUrl(`/api/admin/organizations/${orgId}/members/${userId}`), { method: 'DELETE', headers: authHeaders() })
      await loadOrgMembers(orgId)
      await loadOrgs()
    } catch (err) {
      console.error('removeOrgMember', err)
    }
  }

  // Feature 18: load per-team BHAS score breakdown for an org (via employer endpoint)
  async function loadOrgTeamScores(orgSlug: string) {
    if (!user?.id) return
    try {
      const res = await fetch(apiUrl(`/api/employer/${encodeURIComponent(orgSlug)}`), {
        headers: { 'x-user-id': user.id }
      })
      if (!res.ok) return
      const body = await res.json()
      if (body.team_breakdown) {
        setOrgTeamScores(prev => ({ ...prev, [orgSlug]: body.team_breakdown }))
      }
    } catch {
      // non-fatal — team scores are read-only display
    }
  }

  // Feature 17: auto-assign unassigned members to teams (balanced)
  async function assignTeams(orgId: string) {
    setAssigningTeams(prev => ({ ...prev, [orgId]: true }))
    setAssignTeamsMsg(prev => ({ ...prev, [orgId]: null }))
    try {
      const res = await fetch(apiUrl(`/api/admin/organizations/${orgId}/assign-teams`), {
        method: 'POST',
        headers: authHeaders()
      })
      const body = await res.json()
      if (!res.ok) {
        setAssignTeamsMsg(prev => ({ ...prev, [orgId]: body.error || 'Assignment failed.' }))
        return
      }
      const msg = body.assigned === 0
        ? 'No unassigned members.'
        : `Assigned ${body.assigned} member${body.assigned !== 1 ? 's' : ''} to teams.`
      setAssignTeamsMsg(prev => ({ ...prev, [orgId]: msg }))
      await loadOrgMembers(orgId)
      const orgSlug = orgs.find(o => o.id === orgId)?.slug
      if (orgSlug) loadOrgTeamScores(orgSlug)
    } catch {
      setAssignTeamsMsg(prev => ({ ...prev, [orgId]: 'Network error.' }))
    } finally {
      setAssigningTeams(prev => ({ ...prev, [orgId]: false }))
    }
  }

  // User identity mapping (Feature 15)
  async function loadAllUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch(apiUrl('/api/admin/users'), { headers: authHeaders() })
      const body = await res.json()
      setAllUsers(body || [])
      setUsersLoaded(true)
    } catch (err) {
      console.error('loadAllUsers', err)
    } finally {
      setUsersLoading(false)
    }
  }

  async function saveUsernameOverride(userId: string) {
    if (!editingUsernameVal.trim()) return
    setUsernameOverrideSaving(true); setUsernameOverrideError(null)
    try {
      const res = await fetch(apiUrl(`/api/admin/users/${userId}/username`), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ username: editingUsernameVal.trim() }),
      })
      if (res.status === 409) { setUsernameOverrideError('Username already taken.'); return }
      if (!res.ok) { setUsernameOverrideError('Server error.'); return }
      setEditingUsernameId(null); setEditingUsernameVal(''); setUsernameOverrideError(null)
      await loadAllUsers()
    } catch {
      setUsernameOverrideError('Network error.')
    } finally {
      setUsernameOverrideSaving(false)
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
        objs.forEach(o => { if (o && o.name) meta[String(o.name)] = { categories: Array.isArray(o.categories) ? o.categories : (o.category ? [o.category] : []), scoring_tier: o.scoring_tier || null } })
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

  // On mount: only fetch what the default tab (resources) needs
  useEffect(() => {
    load()
    loadTags()
    loadResourceTypes()
    initialMountRef.current = false
  }, [])

  // On tab change: lazy-load the data for whichever tab was just opened.
  // Skip on initial render — the mount effect above already handles that.
  useEffect(() => {
    if (initialMountRef.current) return
    if (activeTab === 'resources') load()
    else if (activeTab === 'types') loadResourceTypes()
    else if (activeTab === 'tags') loadTags()
    else if (activeTab === 'categories') loadCategories()
    else if (activeTab === 'goals') loadHealthGoals()
    else if (activeTab === 'markers') load()
    else if (activeTab === 'criteria') load()
    else if (activeTab === 'audit') loadAudit()
    else if (activeTab === 'organizations') loadOrgs()
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
      {/* Global mobile-responsive safety net for the whole Admin page.
          Admin.tsx has many fixed multi-column grids and un-scrollable tables written
          as inline styles across every tab. Rather than editing each one individually,
          this catches them all at once via attribute selectors matching their rendered
          inline CSS, and forces single-column / scrollable behavior below 700px. */}
      <style>{`
        @media (max-width: 700px) {
          table { display: block; overflow-x: auto; white-space: nowrap; max-width: 100%; }
          div[style*="1.5fr 1fr 1fr 1fr 1fr auto"],
          div[style*="1.5fr 1fr 1fr 1fr auto"],
          div[style*="1fr 1fr 1fr auto"],
          div[style*="1fr 1fr auto"],
          div[style*="1fr 1fr 1fr 28px"],
          div[style*="2fr 1fr 1fr auto"],
          div[style*="repeat(4, 1fr)"],
          div[style*="grid-template-columns:1fr auto"],
          div[style*="grid-template-columns: 1fr auto"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      <h3 style={{color:theme.text}}>Admin — Content manager (dev)</h3>



      <div style={{height:12}} />

      {/* Tab Navigation — Option D: icon + label tiles */}
      {(() => {
        const tabs: { id: AdminTab; icon: string; label: string }[] = [
          { id: 'resources',     icon: '📄', label: 'Resources' },
          { id: 'types',         icon: '🏷️', label: 'Types' },
          { id: 'categories',    icon: '📂', label: 'Categories' },
          { id: 'tags',          icon: '🔖', label: 'Tags' },
          { id: 'markers',       icon: '🧪', label: 'Markers' },
          { id: 'goals',         icon: '🎯', label: 'Goals' },
          { id: 'criteria',      icon: '⚖️', label: 'Criteria' },
          { id: 'organizations', icon: '🏢', label: 'Orgs' },
          { id: 'products',      icon: '🛍️', label: 'Products' },
          { id: 'brokers',       icon: '🤝', label: 'Brokers' },
          { id: 'providers',     icon: '👨‍⚕️', label: 'Providers' },
          { id: 'leagues',       icon: '🏆', label: 'Leagues' },
          { id: 'users',         icon: '👤', label: 'Users' },
          { id: 'challenges',    icon: '⚡', label: 'Challenges' },
          ...(isSuperAdmin ? [{ id: 'lab-results' as AdminTab, icon: '🔬', label: 'Lab Data' }] : []),
          { id: 'lab-sets' as AdminTab, icon: '📋', label: 'Lab Sets' },
        ]
        return (
          <div style={{
            display: 'flex', flexWrap: 'nowrap', gap: 4, marginBottom: 28,
            overflowX: 'auto', borderBottom: `2px solid ${theme.borderColor}`, paddingBottom: 12,
            scrollbarWidth: 'thin',
          }}>
            {tabs.map(t => {
              const isActive = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    padding: '7px 14px', borderRadius: 6, whiteSpace: 'nowrap',
                    border: `1px solid ${isActive ? (theme.blue ?? '#3b82f6') : theme.borderColor}`,
                    background: isActive ? (theme.blue ?? '#3b82f6') : 'transparent',
                    color: isActive ? '#fff' : theme.textMuted,
                    fontWeight: isActive ? 600 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{t.icon}</span>
                  {t.label}
                </button>
              )
            })}
          </div>
        )
      })()}

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
          <style>{`
            input[list] { appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: none !important; }
            input[list]::-webkit-calendar-picker-indicator { display: none !important; }
            @media (max-width: 700px) {
              .admin-create-row { flex-wrap: wrap !important; }
              .admin-create-row > * { min-width: 0 !important; width: 100% !important; }
              .admin-two-col-grid, .admin-filter-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          {loading ? <div>Loading…</div> : (
            <div>
              {/* Create New Resource - Always Visible */}
              <div style={{marginBottom:40,padding:16,background:theme.bgSecondary,borderRadius:6,border:`1px solid ${theme.borderColor}`}}>
                  <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Create New Resource</h3>
                  <div className="admin-create-row" style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
                    <select value={type} onChange={e => { console.info('type select changed:', e.target.value); setType(e.target.value) }} style={{width:100,flexShrink:0,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                      {(resourceTypes || []).slice().sort((a,b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(rt => <option key={rt} value={rt}>{rt}</option>)}
                    </select>
                    <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} style={{flex:1,minWidth:160,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                    <div style={{display:'flex',gap:6,flex:1,minWidth:220}}>
                      <select value={linkProtocol} onChange={e => setLinkProtocol(e.target.value)} style={{width:100,flexShrink:0,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}}>
                        <option value="https://">https://</option>
                        <option value="http://">http://</option>
                      </select>
                      <input placeholder="example.com" value={linkUrl} onChange={e => setLinkUrl(stripProtocol(e.target.value))} style={{flex:1,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'6px 8px',background:theme.bgSecondary,color:theme.text,fontSize:14}} />
                    </div>
                    <button className="btn-primary" onClick={create} disabled={!title}>Create</button>
                  </div>
                  <div className="admin-two-col-grid" style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
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
                <div className="admin-filter-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:16,alignItems:'start'}}>
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
                  {resourceModalData.thumbnail_url && (
                    <div style={{marginBottom:12}}>
                      <img src={resourceModalData.thumbnail_url} alt="Thumbnail" style={{width:'100%',maxHeight:160,objectFit:'cover',borderRadius:6,border:`1px solid ${theme.borderColor}`}} />
                    </div>
                  )}
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
                    const formData = {title: resourceModalData.title, type: capitalizedType, tags: resourceModalData.tags || [], categories: resourceModalData.categories || [], link_url: stripProtocol(resourceModalData.link_url || ''), link_protocol: getProtocol(resourceModalData.link_url || ''), thumbnail_url: resourceModalData.thumbnail_url || '', duration_type: resourceModalData.duration_type || 'both'}
                    console.log('Setting form data:', formData)
                    setThumbnailError(null)
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
                        {(resourceTypes || []).slice().sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })).map(t => <option key={t} value={t}>{t}</option>)}
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
                    <div style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Thumbnail</label>
                      {resourceEditForm.thumbnail_url ? (
                        <div style={{marginBottom:8,position:'relative',display:'inline-block'}}>
                          <img src={resourceEditForm.thumbnail_url} alt="Thumbnail preview" style={{width:'100%',maxHeight:120,objectFit:'cover',borderRadius:6,border:`1px solid ${theme.borderColor}`,display:'block'}} />
                          <button
                            type="button"
                            onClick={() => setResourceEditForm({...resourceEditForm, thumbnail_url: ''})}
                            style={{position:'absolute',top:4,right:4,background:'rgba(0,0,0,0.6)',border:'none',borderRadius:4,color:'#fff',cursor:'pointer',fontSize:12,padding:'2px 6px',fontWeight:600}}
                          >Remove</button>
                        </div>
                      ) : (
                        <div style={{border:`2px dashed ${theme.borderColor}`,borderRadius:6,padding:'16px 12px',textAlign:'center',color:theme.textMuted,fontSize:13}}>
                          No thumbnail
                        </div>
                      )}
                      <label style={{display:'inline-block',marginTop:8,cursor:thumbnailUploading?'wait':'pointer'}}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{display:'none'}}
                          disabled={thumbnailUploading}
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (file.size > 5 * 1024 * 1024) { setThumbnailError('Image must be under 5 MB'); return }
                            setThumbnailUploading(true)
                            setThumbnailError(null)
                            try {
                              const ext = file.name.split('.').pop() || 'jpg'
                              const path = `${resourceModalData.id}.${ext}`
                              console.log('[Thumbnail] Uploading to path:', path, 'size:', file.size, 'type:', file.type)
                              const { data: upData, error: upErr } = await supabase.storage
                                .from('resource-thumbnails')
                                .upload(path, file, { upsert: true, contentType: file.type })
                              console.log('[Thumbnail] Upload result:', { upData, upErr })
                              if (upErr) throw upErr
                              const { data: urlData } = supabase.storage
                                .from('resource-thumbnails')
                                .getPublicUrl(path)
                              console.log('[Thumbnail] Public URL:', urlData.publicUrl)
                              setResourceEditForm(prev => ({...prev, thumbnail_url: urlData.publicUrl}))
                            } catch (err: any) {
                              console.error('[Thumbnail] Upload error:', err)
                              setThumbnailError(err.message || err.error_description || JSON.stringify(err) || 'Upload failed')
                            } finally {
                              setThumbnailUploading(false)
                              e.target.value = ''
                            }
                          }}
                        />
                        <span style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'4px 10px',fontSize:12,fontWeight:600,color:theme.text,pointerEvents:'none'}}>
                          {thumbnailUploading ? 'Uploading…' : 'Upload Image'}
                        </span>
                      </label>
                      {thumbnailError && <div style={{color:'#dc2626',fontSize:12,marginTop:4}}>{thumbnailError}</div>}
                    </div>
                    <div style={{marginBottom:12}}>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Duration Type</label>
                      <select value={resourceEditForm.duration_type || 'both'} onChange={e => setResourceEditForm({...resourceEditForm, duration_type: e.target.value})} style={{padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,width:'100%',boxSizing:'border-box'}}>
                        <option value="both">Both (Short &amp; Long)</option>
                        <option value="short">Short</option>
                        <option value="long">Long</option>
                      </select>
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
                      console.log('[Save] thumbnail_url being sent:', resourceEditForm.thumbnail_url)
                      const res = await fetch(apiUrl(`/api/admin/resources/${resourceModalData.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ title: resourceEditForm.title, type: (resourceEditForm.type || '').toLowerCase(), tags: resourceEditForm.tags || [], categories: resourceEditForm.categories || [], link_url: fullUrl, thumbnail_url: resourceEditForm.thumbnail_url || null, duration_type: resourceEditForm.duration_type || 'both' }) })
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


              {/* Lab Markers Filters */}
              <div style={styles.filterBox}>
                <h3 style={{marginTop:0,marginBottom:16,fontSize:16,fontWeight:600,color:theme.text}}>Filter Lab Markers</h3>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
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
                          (!filterLabMarkerName || m.name.toLowerCase().includes(filterLabMarkerName.toLowerCase()))
                        )
                        .map(m => m.unit).filter(u => u)))
                        .sort((a, b) => (a || '').localeCompare(b || ''))
                        .map(unit => <option key={unit} value={unit || ''}>{unit}</option>)
                      }
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.text}}>Status</label>
                    <select
                      value={filterLabMarkerActive}
                      onChange={e => setFilterLabMarkerActive(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                    >
                      <option value="">(All)</option>
                      <option value="active">Active only</option>
                      <option value="inactive">Inactive only</option>
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:500,marginBottom:4,color:theme.text}}>Sex</label>
                    <select
                      value={filterLabMarkerSex}
                      onChange={e => setFilterLabMarkerSex(e.target.value)}
                      style={{width:'100%',padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14}}
                    >
                      <option value="">(All)</option>
                      <option value="both">Universal</option>
                      <option value="male">Male only</option>
                      <option value="female">Female only</option>
                    </select>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setFilterLabMarkerName('')
                      setFilterLabMarkerUnit('')
                      setFilterLabMarkerActive('')
                      setFilterLabMarkerSex('')
                    }}
                    style={{opacity: (filterLabMarkerName || filterLabMarkerUnit || filterLabMarkerActive || filterLabMarkerSex) ? 1 : 0.5,cursor: (filterLabMarkerName || filterLabMarkerUnit || filterLabMarkerActive || filterLabMarkerSex) ? 'pointer' : 'default',padding:'6px 12px',fontSize:14}}
                  >
                    Clear
                  </button>
                </div>
                {(filterLabMarkerName || filterLabMarkerUnit || filterLabMarkerActive || filterLabMarkerSex) && (
                  <div style={{fontSize:12,marginTop:8,color:theme.text}}>
                    Showing {labMarkers
                      .filter(m =>
                        (!filterLabMarkerName || m.name.toLowerCase().includes(filterLabMarkerName.toLowerCase()))
                        && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                        && (!filterLabMarkerActive || (filterLabMarkerActive === 'active' ? m.is_active !== false : m.is_active === false))
                          && (!filterLabMarkerSex || (m.applicable_sex || 'both') === filterLabMarkerSex)
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
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>CPT Code</th>
                      <th style={{padding:8,textAlign:'left',color:'#ffffff',fontWeight:500}}>Sex</th>
                      <th style={{padding:8,textAlign:'center',color:'#ffffff',fontWeight:500}}>Active</th>
                      <th style={{padding:8,textAlign:'right',color:'#ffffff',fontWeight:500}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      sortColumn ? sortData(labMarkers
                        .filter(m =>
                          (!filterLabMarkerName || m.name.toLowerCase().includes(filterLabMarkerName.toLowerCase()))
                          && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                          && (!filterLabMarkerActive || (filterLabMarkerActive === 'active' ? m.is_active !== false : m.is_active === false))
                          && (!filterLabMarkerSex || (m.applicable_sex || 'both') === filterLabMarkerSex)
                        ), sortColumn) : (labMarkers || [])
                        .filter(m =>
                          (!filterLabMarkerName || m.name.toLowerCase().includes(filterLabMarkerName.toLowerCase()))
                          && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                          && (!filterLabMarkerActive || (filterLabMarkerActive === 'active' ? m.is_active !== false : m.is_active === false))
                          && (!filterLabMarkerSex || (m.applicable_sex || 'both') === filterLabMarkerSex)
                        ).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                    ).map(m => (
                      <tr key={m.id} style={{borderTop:`1px solid ${theme.borderColor}`,opacity: m.is_active === false ? 0.45 : 1}}>
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
                            <td style={{padding:8}} className="small muted">{m.cpt_code || '—'}</td>
                            <td style={{padding:8}}>
                              {m.applicable_sex && m.applicable_sex !== 'both' ? (
                                <span style={{background: m.applicable_sex === 'male' ? '#dbeafe' : '#fce7f3', color: m.applicable_sex === 'male' ? '#1d4ed8' : '#9d174d', borderRadius:4, padding:'2px 7px', fontSize:11, fontWeight:600}}>
                                  {m.applicable_sex === 'male' ? 'M' : 'F'}
                                </span>
                              ) : <span style={{color:'#9ca3af',fontSize:12}}>—</span>}
                            </td>
                            <td style={{padding:8,textAlign:'center',verticalAlign:'middle'}}>
                              <div
                                title={m.is_active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'}
                                onClick={async () => {
                                  const next = m.is_active === false ? true : false
                                  setLabMarkers(prev => prev.map(x => x.id === m.id ? { ...x, is_active: next } : x))
                                  try {
                                    const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ is_active: next }) })
                                    if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                                  } catch (err) {
                                    setLabMarkers(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !next } : x))
                                    alert('Toggle failed — ' + ((err as any)?.message || 'check server logs'))
                                  }
                                }}
                                style={{display:'inline-flex',alignItems:'center',cursor:'pointer',width:40,height:22,borderRadius:11,background: m.is_active === false ? '#d1d5db' : '#16a34a',position:'relative',transition:'background 0.2s',flexShrink:0}}
                              >
                                <div style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.3)',top:3,left: m.is_active === false ? 3 : 21,transition:'left 0.2s'}} />
                              </div>
                            </td>
                            <td style={{padding:8,textAlign:'right',verticalAlign:'middle'}}>
                              <div style={{display:'flex',alignItems:'center',gap:4,justifyContent:'flex-end',height:'100%'}}>
                                <button onClick={() => {
                                  setMarkerModalOriginalId(m.id)
                                  setMarkerEditForm({ name: m.name, unit: m.unit, cpt_code: m.cpt_code, applicable_sex: m.applicable_sex || 'both', marker_category: m.marker_category || 'additional' })
                                  const existing = logicRules.filter((r: any) => r.marker_id === m.id)
                                  const TIERS = ['Optimal', 'Improvement', 'Out of Range']
                                  const rows = TIERS.flatMap(lbl => {
                                    const tier = lbl === 'Optimal' ? 'optimal' : lbl === 'Improvement' ? 'improvement' : 'out_of_range'
                                    const matches = existing.filter((r: any) => (tagsMeta[r.tag_to_apply]?.scoring_tier || 'out_of_range') === tier)
                                    if (matches.length > 0) return matches.map((r: any) => ({ label: lbl, min_value: String(r.min_value ?? ''), max_value: String(r.max_value ?? ''), tag_name: r.tag_to_apply || '', alert_message: r.alert_message || '' }))
                                    return [{ label: lbl, min_value: '', max_value: '', tag_name: '', alert_message: '' }]
                                  })
                                  setMarkerEditRules(rows)
                                  const msgs: Record<number, string> = {}
                                  rows.forEach((r, i) => { if (r.alert_message) msgs[i] = r.alert_message })
                                  setMarkerEditTierMessages(msgs)
                                  setMarkerEditError(null)
                                  setMarkerEditAliases([])
                                  setMergeSourceId('')
                                  setMergeError(null)
                                  setMarkerModalOpen(true)
                                  // Load aliases async — non-blocking
                                  fetch(apiUrl(`/api/admin/lab-markers/${m.id}/aliases`), { headers: authHeaders() })
                                    .then(r => r.ok ? r.json() : { aliases: [] })
                                    .then(({ aliases }) => setMarkerEditAliases(aliases || []))
                                    .catch(() => {})
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
                    (!filterLabMarkerName || m.name.toLowerCase().includes(filterLabMarkerName.toLowerCase()))
                    && (!filterLabMarkerUnit || m.unit === filterLabMarkerUnit)
                    && (!filterLabMarkerActive || (filterLabMarkerActive === 'active' ? m.is_active !== false : m.is_active === false))
                          && (!filterLabMarkerSex || (m.applicable_sex || 'both') === filterLabMarkerSex)
                  ).slice().sort((a,b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }))
                  .map(m => (
                  <div key={m.id} style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,boxShadow:'0 1px 2px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',height:'100%',opacity: m.is_active === false ? 0.45 : 1}}>
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
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                          <h5 style={{margin:0,fontSize:16,fontWeight:600}}>{m.name}</h5>
                          <div
                            title={m.is_active === false ? 'Inactive — click to activate' : 'Active — click to deactivate'}
                            onClick={async () => {
                              const next = m.is_active === false ? true : false
                              setLabMarkers(prev => prev.map(x => x.id === m.id ? { ...x, is_active: next } : x))
                              try {
                                const res = await fetch(apiUrl(`/api/admin/lab-markers/${m.id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...(authHeaders()) }, body: JSON.stringify({ is_active: next }) })
                                if (!res.ok) throw new Error(await res.text().catch(() => String(res.status)))
                              } catch (err) {
                                setLabMarkers(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !next } : x))
                                alert('Toggle failed — ' + ((err as any)?.message || 'check server logs'))
                              }
                            }}
                            style={{display:'inline-flex',alignItems:'center',cursor:'pointer',width:40,height:22,borderRadius:11,background: m.is_active === false ? '#d1d5db' : '#16a34a',position:'relative',transition:'background 0.2s',flexShrink:0}}
                          >
                            <div style={{position:'absolute',width:16,height:16,borderRadius:'50%',background:'#fff',boxShadow:'0 1px 3px rgba(0,0,0,0.3)',top:3,left: m.is_active === false ? 3 : 21,transition:'left 0.2s'}} />
                          </div>
                        </div>
                        {m.unit && <p style={{margin:'0 0 2px 0',fontSize:12,color:theme.text}}>Unit: {m.unit}</p>}
                        {(() => {
                          const mRules = logicRules.filter((r: any) => r.marker_id === m.id)
                          if (mRules.length === 0) return null
                          const mins = mRules.map((r: any) => r.min_value).filter((v: any) => v !== null && v !== undefined)
                          const maxs = mRules.map((r: any) => r.max_value).filter((v: any) => v !== null && v !== undefined)
                          const overallMin = mins.length > 0 ? Math.min(...mins) : null
                          const overallMax = maxs.length > 0 ? Math.max(...maxs) : null
                          return (<>
                            {overallMin !== null && <p style={{margin:'0 0 2px 0',fontSize:12,color:theme.text}}>Min: {overallMin}</p>}
                            {overallMax !== null && <p style={{margin:'0 0 2px 0',fontSize:12,color:theme.text}}>Max: {overallMax}</p>}
                          </>)
                        })()}
                        {m.cpt_code && <p style={{margin:'0 0 4px 0',fontSize:11,color:theme.textMuted}}>CPT: {m.cpt_code}</p>}
                        {!m.cpt_code && <p style={{margin:'0 0 4px 0',fontSize:11,color:theme.textMuted,opacity:0.5}}>No CPT code</p>}
                        {m.applicable_sex && m.applicable_sex !== 'both' && (
                          <span style={{display:'inline-block',background: m.applicable_sex === 'male' ? '#dbeafe' : '#fce7f3', color: m.applicable_sex === 'male' ? '#1d4ed8' : '#9d174d', borderRadius:4, padding:'2px 7px', fontSize:11, fontWeight:600, marginBottom:8}}>
                            {m.applicable_sex === 'male' ? 'Male only' : 'Female only'}
                          </span>
                        )}
                        <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:'auto'}}>
                          <button onClick={() => {
                            setEditingId(null)
                            setMarkerModalOriginalId(m.id)
                            setMarkerEditForm({ name: m.name, unit: m.unit, cpt_code: m.cpt_code, applicable_sex: m.applicable_sex || 'both', marker_category: m.marker_category || 'additional' })
                            const existing = logicRules.filter((r: any) => r.marker_id === m.id)
                            const TIERS = ['Optimal', 'Improvement', 'Out of Range']
                            const rows = TIERS.flatMap(lbl => {
                              const tier = lbl === 'Optimal' ? 'optimal' : lbl === 'Improvement' ? 'improvement' : 'out_of_range'
                              const matches = existing.filter((r: any) => (tagsMeta[r.tag_to_apply]?.scoring_tier || 'out_of_range') === tier)
                              if (matches.length > 0) return matches.map((r: any) => ({ label: lbl, min_value: String(r.min_value ?? ''), max_value: String(r.max_value ?? ''), tag_name: r.tag_to_apply || '', alert_message: r.alert_message || '' }))
                              return [{ label: lbl, min_value: '', max_value: '', tag_name: '', alert_message: '' }]
                            })
                            setMarkerEditRules(rows)
                            const msgs2: Record<number, string> = {}
                            rows.forEach((r, i) => { if (r.alert_message) msgs2[i] = r.alert_message })
                            setMarkerEditTierMessages(msgs2)
                            setMarkerEditError(null)
                            setMarkerEditAliases([])
                            setMergeSourceId('')
                            setMergeError(null)
                            setMarkerModalOpen(true)
                            // Load aliases async — non-blocking
                            fetch(apiUrl(`/api/admin/lab-markers/${m.id}/aliases`), { headers: authHeaders() })
                              .then(r => r.ok ? r.json() : { aliases: [] })
                              .then(({ aliases }) => setMarkerEditAliases(aliases || []))
                              .catch(() => {})
                          }} style={cardButtonStyles.edit} {...getButtonHoverHandlers(false)}>✎ Edit</button>
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
                .sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
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
      {markerModalOpen && (() => {
        const EDIT_TIERS: Array<{ label: string; color: string }> = [
          { label: 'Optimal', color: '#16a34a' },
          { label: 'Improvement', color: '#ca8a04' },
          { label: 'Out of Range', color: '#dc2626' },
        ]
        return (
        <div onKeyDown={(e) => { if (e.key === 'Escape') { setMarkerModalOpen(false); setMarkerModalOriginalId(null) } }} style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10001}}>
          <div onKeyDown={handleModalKeyDown} style={{background:theme.card,border:`2px solid ${theme.borderColor}`,borderRadius:8,padding:24,width:'560px',maxWidth:'95vw',maxHeight:'90vh',overflowY:'auto',overflowX:'hidden',display:'flex',flexDirection:'column',gap:0}}>
            <h3 style={{marginTop:0,marginBottom:16,color:theme.text}}>Edit Lab Marker</h3>

            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Name</label>
            <input autoFocus value={markerEditForm.name || ''} onChange={e => setMarkerEditForm(prev => ({...prev, name: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text,width:'100%',boxSizing:'border-box'}} />

            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Unit</label>
            <input value={markerEditForm.unit || ''} onChange={e => setMarkerEditForm(prev => ({...prev, unit: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text,width:'100%',boxSizing:'border-box'}} />

            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>CPT Code</label>
            <input value={markerEditForm.cpt_code || ''} onChange={e => setMarkerEditForm(prev => ({...prev, cpt_code: e.target.value}))} placeholder="e.g. 82652" style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text,width:'100%',boxSizing:'border-box'}} />

            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Applicable Sex</label>
            <select value={markerEditForm.applicable_sex || 'both'} onChange={e => setMarkerEditForm(prev => ({...prev, applicable_sex: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:12,background:theme.bgSecondary,color:theme.text,width:'100%'}}>
              <option value="both">Both (universal)</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select>

            <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Category</label>
            <select value={markerEditForm.marker_category || 'additional'} onChange={e => setMarkerEditForm(prev => ({...prev, marker_category: e.target.value}))} style={{padding:'8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,marginBottom:16,background:theme.bgSecondary,color:theme.text,width:'100%'}}>
              <option value="nhls_score">NHLS Score (scored in v2.3)</option>
              <option value="hormone">Hormone Panel (tracking only)</option>
              <option value="additional">Additional Markers</option>
            </select>

            <div style={{borderTop:`1px solid ${theme.borderColor}`,paddingTop:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:theme.text,marginBottom:2}}>Merge Another Marker Into This One</div>
              <p style={{margin:'0 0 10px 0',fontSize:12,color:theme.textMuted}}>
                Select a duplicate marker to absorb — all its lab results and scoring rules will be moved here, then it will be deleted.
              </p>
              <div style={{display:'flex',gap:6,marginBottom:8}}>
                <select
                  value={mergeSourceId}
                  onChange={e => { setMergeSourceId(e.target.value); setMergeError(null) }}
                  style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,background:theme.bgSecondary,color:mergeSourceId ? theme.text : theme.textMuted,fontSize:12}}
                >
                  <option value=''>— Select a marker to merge in…</option>
                  {[...labMarkers]
                    .filter(m => m.id !== markerModalOriginalId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.name}{m.is_active === false ? ' (inactive)' : ''}</option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={mergeSaving || !mergeSourceId}
                  onClick={async () => {
                    if (!mergeSourceId || !markerModalOriginalId) return
                    const sourceName = labMarkers.find(m => m.id === mergeSourceId)?.name || mergeSourceId
                    const targetName = markerEditForm.name || markerModalOriginalId
                    if (!confirm(`Merge "${sourceName}" into "${targetName}"?\n\nAll lab results and scoring rules under "${sourceName}" will be moved to "${targetName}", then "${sourceName}" will be permanently deleted.\n\nThis cannot be undone.`)) return
                    setMergeSaving(true)
                    setMergeError(null)
                    try {
                      const res = await fetch(apiUrl(`/api/admin/lab-markers/${markerModalOriginalId}/merge-from/${mergeSourceId}`), {
                        method: 'POST', headers: authHeaders(),
                      })
                      const data = await res.json()
                      if (!res.ok) { setMergeError(data.error || 'Merge failed'); return }
                      setMergeSourceId('')
                      // Remove the merged marker from the local labMarkers list and close modal
                      setLabMarkers(prev => prev.filter(m => m.id !== mergeSourceId))
                      setMarkerModalOpen(false)
                      await load()
                      alert(`Done — moved ${data.moved_results} result(s) and ${data.moved_rules} rule(s) from "${data.deleted_marker}" into "${data.target_marker}".`)
                    } finally { setMergeSaving(false) }
                  }}
                  style={{padding:'6px 14px',background:'#EF4444',border:'none',borderRadius:6,color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',opacity:mergeSaving||!mergeSourceId?0.5:1,whiteSpace:'nowrap'}}
                >{mergeSaving ? 'Merging…' : 'Merge'}</button>
              </div>
              {mergeError && <p style={{margin:'4px 0 0',fontSize:12,color:'#EF4444'}}>{mergeError}</p>}
              {markerEditAliases.length > 0 && (
                <div style={{marginTop:12}}>
                  <div style={{fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6}}>PDF aliases (auto-created from uploads)</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {markerEditAliases.map(a => (
                      <span key={a.id} style={{display:'inline-flex',alignItems:'center',gap:4,background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:12,padding:'2px 10px',fontSize:12,color:theme.text}}>
                        {a.alias}
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await fetch(apiUrl(`/api/admin/lab-markers/aliases/${a.id}`), { method: 'DELETE', headers: authHeaders() })
                            if (res.ok) setMarkerEditAliases(prev => prev.filter(x => x.id !== a.id))
                          }}
                          style={{background:'transparent',border:'none',cursor:'pointer',color:theme.textMuted,fontSize:14,lineHeight:1,padding:0,marginLeft:2}}
                          title="Remove alias"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{borderTop:`1px solid ${theme.borderColor}`,paddingTop:16,marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:700,color:theme.text,marginBottom:4}}>Scoring Rules</div>
              <p style={{margin:'0 0 12px 0',fontSize:12,color:theme.textMuted}}>Each tier can have multiple ranges. Rows with empty Min, Max, or Tag are skipped.</p>
              {EDIT_TIERS.map(({ label, color }) => {
                const tierRows = markerEditRules.map((r, i) => ({ r, i })).filter(({ r }) => r.label === label)
                return (
                  <div key={label} style={{marginBottom:20}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                      <div style={{fontSize:12,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
                      <button type="button" onClick={() => addMarkerEditRow(label)} style={{background:'transparent',border:`1px solid ${color}`,borderRadius:4,padding:'2px 10px',fontSize:12,color,cursor:'pointer',fontWeight:600}}>+ Add Range</button>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 28px',gap:6,marginBottom:4}}>
                      <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Min Value</div>
                      <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Max Value</div>
                      <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Tag Name</div>
                      <div />
                    </div>
                    {tierRows.map(({ r, i }) => (
                      <div key={i} style={{marginBottom:10}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 28px',gap:6,marginBottom: label !== 'Optimal' ? 4 : 0,alignItems:'center'}}>
                          <input type="number" placeholder="Min" value={r.min_value} onChange={e => updateMarkerEditRule(i, 'min_value', e.target.value)} style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}} />
                          <input type="number" placeholder="Max" value={r.max_value} onChange={e => updateMarkerEditRule(i, 'max_value', e.target.value)} style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}} />
                          <input placeholder="Tag name" value={r.tag_name} onChange={e => updateMarkerEditRule(i, 'tag_name', e.target.value)} style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}} />
                          <button type="button" onClick={() => removeMarkerEditRow(i)} disabled={tierRows.length <= 1} title="Remove this range" style={{background:'transparent',border:'none',color:tierRows.length <= 1 ? theme.borderColor : '#dc2626',cursor:tierRows.length <= 1 ? 'default' : 'pointer',fontSize:16,padding:0,lineHeight:1}}>×</button>
                        </div>
                        {label !== 'Optimal' && (
                          <textarea
                            rows={2}
                            placeholder="Alert message shown to user (leave blank for no popup)"
                            value={markerEditTierMessages[i] || ''}
                            onChange={e => setMarkerEditTierMessages(prev => ({ ...prev, [i]: e.target.value }))}
                            style={{width:'100%',padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:12,background:theme.bgSecondary,color:theme.text,resize:'vertical',boxSizing:'border-box'}}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>

            {markerEditError && <p style={{color:'#dc2626',fontSize:13,margin:'0 0 12px 0'}}>{markerEditError}</p>}
            <div style={{display:'flex',gap:8,marginTop:'auto'}}>
              <button
                disabled={markerEditSaving}
                onClick={async () => {
                  setMarkerEditSaving(true)
                  setMarkerEditError(null)
                  try {
                    const id = markerModalOriginalId
                    if (!id) throw new Error('Missing marker id')
                    const patchRes = await fetch(apiUrl(`/api/admin/lab-markers/${id}`), { method: 'PATCH', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name: markerEditForm.name, unit: markerEditForm.unit, cpt_code: markerEditForm.cpt_code || null, applicable_sex: markerEditForm.applicable_sex || 'both', marker_category: markerEditForm.marker_category || 'additional' }) })
                    if (!patchRes.ok) throw new Error(await patchRes.text().catch(() => String(patchRes.status)))
                    const rulesRes = await fetch(apiUrl(`/api/admin/lab-markers/${id}/rules`), { method: 'PUT', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify({ rules: markerEditRules, tierMessages: markerEditTierMessages }) })
                    if (!rulesRes.ok) throw new Error(await rulesRes.text().catch(() => String(rulesRes.status)))
                    await load()
                    setMarkerModalOpen(false)
                    setMarkerModalOriginalId(null)
                  } catch (err) {
                    setMarkerEditError('Save failed — ' + ((err as any)?.message || 'check server logs'))
                  } finally {
                    setMarkerEditSaving(false)
                  }
                }}
                style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600,opacity:markerEditSaving?0.6:1}}
              >{markerEditSaving ? 'Saving…' : 'Save'}</button>
              <button onClick={() => { setMarkerModalOpen(false); setMarkerModalOriginalId(null) }} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
            </div>
          </div>
        </div>
        )
      })()}
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
            {wizardStep === 2 && (() => {
              const TIERS: Array<{ label: string; color: string }> = [
                { label: 'Optimal', color: '#16a34a' },
                { label: 'Improvement', color: '#ca8a04' },
                { label: 'Out of Range', color: '#dc2626' },
              ]
              return (
              <div>
                <p style={{marginTop:0,marginBottom:4,fontSize:14,color:theme.textMuted}}>Define scoring rules for <strong style={{color:theme.text}}>{wizardMarkerName}</strong>. At least one Optimal row is required.</p>
                <p style={{marginTop:0,marginBottom:16,fontSize:12,color:theme.textMuted}}>Each tier can have multiple ranges (e.g. Optimal = 1–5 OR 10–15). Rows with empty Min, Max, or Tag are skipped.</p>
                <div style={{marginBottom:16}}>
                  {TIERS.map(({ label, color }) => {
                    const tierRows = wizardRules.map((r, i) => ({ r, i })).filter(({ r }) => r.label === label)
                    return (
                      <div key={label} style={{marginBottom:16}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                          <div style={{fontSize:12,fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.04em'}}>{label}</div>
                          <button
                            type="button"
                            onClick={() => addWizardRow(label)}
                            style={{background:'transparent',border:`1px solid ${color}`,borderRadius:4,padding:'2px 10px',fontSize:12,color,cursor:'pointer',fontWeight:600}}
                          >+ Add Range</button>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 28px',gap:6,marginBottom:4}}>
                          <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Min Value</div>
                          <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Max Value</div>
                          <div style={{fontSize:11,fontWeight:600,color:theme.textMuted}}>Tag Name</div>
                          <div />
                        </div>
                        {tierRows.map(({ r, i }) => (
                          <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 28px',gap:6,marginBottom:6,alignItems:'center'}}>
                            <input
                              type="number"
                              placeholder="Min"
                              value={r.min_value}
                              onChange={e => updateWizardRule(i, 'min_value', e.target.value)}
                              style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}}
                            />
                            <input
                              type="number"
                              placeholder="Max"
                              value={r.max_value}
                              onChange={e => updateWizardRule(i, 'max_value', e.target.value)}
                              style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}}
                            />
                            <input
                              placeholder="Tag name"
                              value={r.tag_name}
                              onChange={e => updateWizardRule(i, 'tag_name', e.target.value)}
                              style={{padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:13,background:theme.bgSecondary,color:theme.text}}
                            />
                            <button
                              type="button"
                              onClick={() => removeWizardRow(i)}
                              disabled={tierRows.length <= 1}
                              title="Remove this range"
                              style={{background:'transparent',border:'none',color:tierRows.length <= 1 ? theme.borderColor : '#dc2626',cursor:tierRows.length <= 1 ? 'default' : 'pointer',fontSize:16,padding:0,lineHeight:1}}
                            >×</button>
                          </div>
                        ))}
                        {label !== 'Optimal' && (
                          <div style={{marginTop:6}}>
                            <div style={{fontSize:11,color:theme.textMuted,marginBottom:3}}>Alert message shown to user <span style={{fontWeight:400}}>(leave blank for no popup)</span></div>
                            <textarea
                              rows={2}
                              placeholder={label === 'Improvement' ? 'e.g. Your value is approaching the out-of-range threshold.' : 'e.g. Your value is outside the healthy range.'}
                              value={wizardTierMessages[label] || ''}
                              onChange={e => setWizardTierMessages(prev => ({ ...prev, [label]: e.target.value }))}
                              style={{width:'100%',padding:'7px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:12,background:theme.bgSecondary,color:theme.text,resize:'vertical',boxSizing:'border-box'}}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                {wizardError && <p style={{color:'#dc2626',fontSize:13,marginBottom:12}}>{wizardError}</p>}
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <button onClick={() => setWizardStep(1)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'8px 16px',fontSize:14,cursor:'pointer',color:theme.text}}>← Back</button>
                  <button
                    onClick={() => {
                      const optimalRows = wizardRules.filter(r => r.label === 'Optimal')
                      const hasValidOptimal = optimalRows.some(r => r.tag_name.trim() && r.min_value !== '' && r.max_value !== '')
                      if (!hasValidOptimal) { setWizardError('At least one Optimal row must have Min, Max, and Tag filled in.'); return }
                      setWizardError(null)
                      setWizardStep(3)
                    }}
                    style={{background:'#3D7DCA',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',fontWeight:600,fontSize:14,cursor:'pointer'}}
                  >Next →</button>
                </div>
              </div>
              )
            })()}

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
                    {wizardRules.filter(r => r.tag_name.trim() && r.min_value !== '' && r.max_value !== '').map((r, i) => {
                      const labelColor = r.label === 'Optimal' ? '#16a34a' : r.label === 'Improvement' ? '#ca8a04' : '#dc2626'
                      return (
                        <div key={i} style={{marginTop:4,fontSize:13,color:theme.text}}>
                          <span style={{fontWeight:600,color:labelColor}}>{r.label}:</span>{' '}
                          {r.min_value} – {r.max_value} → <code style={{background:theme.bgTertiary,padding:'1px 4px',borderRadius:3,fontSize:12}}>{r.tag_name}</code>
                        </div>
                      )
                    })}
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

      {/* ── Organizations Tab (Feature 14) ─────────────────────────── */}
      {activeTab === 'organizations' && (
        <div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
            <h3 style={{margin:0,fontSize:16,fontWeight:600,color:theme.text}}>Organizations</h3>
          </div>

          {/* PHI notice */}
          <div style={{background:'#fef9c3',border:'1px solid #fde047',borderRadius:6,padding:10,marginBottom:16,fontSize:12,color:'#713f12'}}>
            <strong>PHI rule:</strong> Employer-facing views must never expose real names, emails, or raw lab values — only de-identified usernames, public IDs, and aggregate scores.
          </div>

          {/* User Identity Mapping (Feature 15) — admin-only, PHI-bearing, hidden by default */}
          <div style={{marginBottom:20}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom: showIdentityPanel ? 10 : 0}}>
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:12,color:theme.textMuted,userSelect:'none'}}>
                <input
                  type="checkbox"
                  checked={showIdentityPanel}
                  onChange={e => {
                    const val = e.target.checked
                    setShowIdentityPanel(val)
                    localStorage.setItem('bhi_show_identity_panel', String(val))
                    if (!val) { setUsersLoaded(false) }
                  }}
                  style={{cursor:'pointer'}}
                />
                Show User Identity Mapping (PHI — demo/admin use only)
              </label>
            </div>

            {showIdentityPanel && (
            <div style={{background:theme.bgSecondary,border:`1px solid #f59e0b`,borderRadius:8,padding:16}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div>
                <h4 style={{margin:0,fontSize:14,fontWeight:600,color:theme.text}}>User Identity Mapping</h4>
                <p style={{margin:'4px 0 0 0',fontSize:12,color:theme.textMuted}}>Admin-only: real name + email ↔ username + public ID. Never share with employers.</p>
              </div>
              <button
                onClick={() => { if (!usersLoaded) loadAllUsers(); else setUsersLoaded(false) }}
                style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'5px 12px',fontSize:13,cursor:'pointer',color:theme.text}}
              >{usersLoaded ? 'Hide' : 'Show Users'}</button>
            </div>
            {usersLoaded && (
              usersLoading ? <div style={{color:theme.textMuted,fontSize:13}}>Loading…</div> :
              allUsers.length === 0 ? <p style={{color:theme.textMuted,fontSize:13}}>No users found.</p> : (() => {
                const iCol = identitySort.col
                const iDir = identitySort.dir
                const sortedUsers = [...allUsers].sort((a, b) => {
                  let av = '', bv = ''
                  if (iCol === 'name') { av = a.name || ''; bv = b.name || '' }
                  else if (iCol === 'email') { av = a.email || ''; bv = b.email || '' }
                  else if (iCol === 'username') { av = a.username || ''; bv = b.username || '' }
                  else if (iCol === 'public_id') { av = a.public_id || ''; bv = b.public_id || '' }
                  else if (iCol === 'role') { av = a.role || ''; bv = b.role || '' }
                  const cmp = av.localeCompare(bv)
                  return iDir === 'asc' ? cmp : -cmp
                })
                const iToggle = (col: string) => setIdentitySort(prev => prev.col === col ? {...prev, dir: prev.dir === 'asc' ? 'desc' : 'asc'} : {col, dir: 'asc'})
                const iArrow = (col: string) => iCol === col ? (iDir === 'asc' ? ' ↑' : ' ↓') : ''
                return (
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                      {(['name','email','username','public_id','role'] as const).map(col => (
                        <th key={col} onClick={() => iToggle(col)} style={{textAlign:'left',padding:'5px 8px',color:theme.textMuted,fontWeight:600,fontSize:11,textTransform:'uppercase',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
                          {col.replace('_',' ')}{iArrow(col)}
                        </th>
                      ))}
                      <th style={{padding:'5px 8px'}} />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map(u => (
                      <tr key={u.id} style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                        <td style={{padding:'6px 8px',color:theme.text}}>{u.name}</td>
                        <td style={{padding:'6px 8px',color:theme.textMuted}}>{u.email}</td>
                        <td style={{padding:'6px 8px'}}>
                          {editingUsernameId === u.id ? (
                            <div style={{display:'flex',gap:6,alignItems:'center'}}>
                              <input
                                value={editingUsernameVal}
                                onChange={e => setEditingUsernameVal(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                style={{padding:'3px 6px',borderRadius:4,border:`1px solid ${theme.borderColor}`,background:theme.bg,color:theme.text,fontSize:12,width:130}}
                              />
                              <button onClick={() => saveUsernameOverride(u.id)} disabled={usernameOverrideSaving} style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:4,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>Save</button>
                              <button onClick={() => { setEditingUsernameId(null); setUsernameOverrideError(null) }} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'3px 8px',fontSize:11,cursor:'pointer',color:theme.text}}>Cancel</button>
                            </div>
                          ) : (
                            <span style={{fontFamily:'monospace',color:theme.text}}>{u.username || <em style={{color:theme.textMuted}}>not set</em>}</span>
                          )}
                        </td>
                        <td style={{padding:'6px 8px',fontFamily:'monospace',fontSize:11,color:theme.textMuted}}>{u.public_id || '—'}</td>
                        <td style={{padding:'6px 8px'}}>
                          <span style={{background:u.role==='admin'||u.role==='super_admin'?'#dbeafe':'#f3f4f6',color:u.role==='admin'||u.role==='super_admin'?'#1d4ed8':'#374151',borderRadius:4,padding:'1px 6px',fontSize:11,fontWeight:600}}>{u.role}</span>
                        </td>
                        <td style={{padding:'6px 8px'}}>
                          <button
                            onClick={() => { setEditingUsernameId(u.id); setEditingUsernameVal(u.username || ''); setUsernameOverrideError(null) }}
                            style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'3px 9px',fontSize:11,cursor:'pointer',color:theme.text}}
                          >Edit Username</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )
              })()
            )}
            {usernameOverrideError && <p style={{color:'#dc2626',fontSize:12,margin:'8px 0 0 0'}}>{usernameOverrideError}</p>}
            </div>
            )}
          </div>

          {/* Create org form — super admin only */}
          {isSuperAdmin && <div style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:16,marginBottom:20}}>
            <h4 style={{margin:'0 0 12px 0',fontSize:14,fontWeight:600,color:theme.text}}>Create Organization</h4>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:10,alignItems:'end'}}>
              <div>
                <label style={{display:'block',fontSize:12,color:theme.textMuted,marginBottom:4}}>Name</label>
                <input
                  value={orgCreateName}
                  onChange={e => { const v = e.target.value; setOrgCreateName(v); setOrgCreateSlug(v.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) }}
                  placeholder="Acme Corp"
                  style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:14,boxSizing:'border-box'}}
                />
              </div>
              <div>
                <label style={{display:'block',fontSize:12,color:theme.textMuted,marginBottom:4}}>Slug (URL-safe)</label>
                <input
                  value={orgCreateSlug}
                  onChange={e => setOrgCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                  placeholder="acme-corp"
                  style={{width:'100%',padding:'8px 10px',borderRadius:6,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:14,boxSizing:'border-box'}}
                />
              </div>
              <button
                onClick={createOrg}
                disabled={orgCreateSaving}
                style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:6,padding:'8px 18px',fontWeight:600,fontSize:14,cursor:'pointer',opacity:orgCreateSaving?0.6:1,whiteSpace:'nowrap'}}
              >{orgCreateSaving ? 'Creating…' : '+ Create'}</button>
            </div>
            {orgCreateError && <p style={{color:'#dc2626',fontSize:13,margin:'8px 0 0 0'}}>{orgCreateError}</p>}
          </div>}

          {/* Org list filters — F18a */}
          {!loading && orgs.length > 0 && (
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap',marginBottom:14,background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:8,padding:'10px 14px'}}>
              <div>
                <label style={{display:'block',fontSize:11,color:theme.textMuted,marginBottom:3}}>Search</label>
                <input
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                  placeholder="Name or slug…"
                  style={{padding:'5px 9px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13,width:160}}
                />
              </div>
              <div>
                <label style={{display:'block',fontSize:11,color:theme.textMuted,marginBottom:3}}>Min Members</label>
                <input
                  type="number"
                  min={0}
                  value={orgMinMembers}
                  onChange={e => setOrgMinMembers(e.target.value)}
                  placeholder="0"
                  style={{padding:'5px 9px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13,width:80}}
                />
              </div>
              <div>
                <label style={{display:'block',fontSize:11,color:theme.textMuted,marginBottom:3}}>Sort By</label>
                <select
                  value={orgSortBy}
                  onChange={e => setOrgSortBy(e.target.value as 'name' | 'members')}
                  style={{padding:'5px 9px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13}}
                >
                  <option value="name">Name A→Z</option>
                  <option value="members">Most Members</option>
                </select>
              </div>
              {(orgSearch || orgMinMembers || orgSortBy !== 'name') && (
                <button
                  onClick={() => { setOrgSearch(''); setOrgMinMembers(''); setOrgSortBy('name') }}
                  style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:5,padding:'5px 10px',fontSize:12,cursor:'pointer',color:theme.textMuted,alignSelf:'flex-end'}}
                >Clear</button>
              )}
            </div>
          )}

          {/* Org list */}
          {loading ? <div style={{color:theme.textMuted}}>Loading…</div> : orgs.length === 0 ? (
            <p style={{color:theme.textMuted,fontSize:14}}>No organizations yet.</p>
          ) : (() => {
            const minM = orgMinMembers !== '' ? parseInt(orgMinMembers, 10) : 0
            const filtered = orgs
              .filter(o => {
                const q = orgSearch.toLowerCase()
                if (q && !o.name.toLowerCase().includes(q) && !o.slug.toLowerCase().includes(q)) return false
                if (orgMinMembers !== '' && !isNaN(minM) && o.member_count < minM) return false
                return true
              })
              .sort((a, b) => orgSortBy === 'members' ? b.member_count - a.member_count : a.name.localeCompare(b.name))
            if (filtered.length === 0) return <p style={{color:theme.textMuted,fontSize:14}}>No organizations match the current filters.</p>
            return (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {filtered.map(org => (
                <div key={org.id} style={{background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:8,overflow:'hidden'}}>
                  {/* Org header row */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px'}}>
                    <div>
                      <span style={{fontWeight:600,fontSize:15,color:theme.text}}>{org.name}</span>
                      <span style={{marginLeft:10,fontSize:12,color:theme.textMuted}}>/{org.slug}</span>
                      <span style={{marginLeft:12,fontSize:12,color:theme.textMuted}}>{org.member_count} member{org.member_count !== 1 ? 's' : ''}</span>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <button
                        onClick={() => {
                          if (expandedOrgId === org.id) {
                            setExpandedOrgId(null)
                          } else {
                            setExpandedOrgId(org.id)
                            loadOrgMembers(org.id)
                            loadOrgTeams(org.id)
                            loadAllPublicIds()
                            loadOrgTeamScores(org.slug)
                          }
                        }}
                        style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'5px 12px',fontSize:13,cursor:'pointer',color:theme.text}}
                      >{expandedOrgId === org.id ? 'Hide Members' : 'View Members'}</button>
                      <a
                        href={`#/employer/${org.slug}`}
                        style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'5px 12px',fontSize:13,cursor:'pointer',color:theme.text,textDecoration:'none',display:'inline-block'}}
                      >Employer View</a>
                      <button
                        onClick={() => assignTeams(org.id)}
                        disabled={!!assigningTeams[org.id]}
                        title="Assign unassigned members to teams (balanced)"
                        style={{background:'transparent',border:`1px solid #7c3aed`,borderRadius:6,padding:'5px 12px',fontSize:13,cursor:'pointer',color:'#7c3aed',opacity:assigningTeams[org.id]?0.6:1,whiteSpace:'nowrap'}}
                      >{assigningTeams[org.id] ? 'Assigning…' : 'Auto-assign Teams'}</button>
                      {isSuperAdmin && <button
                        onClick={() => deleteOrg(org.id)}
                        style={{background:'transparent',border:'1px solid #dc2626',borderRadius:6,padding:'5px 12px',fontSize:13,cursor:'pointer',color:'#dc2626'}}
                      >Delete</button>}
                    </div>
                  </div>

                  {/* Auto-assign feedback */}
                  {assignTeamsMsg[org.id] && (
                    <div style={{padding:'6px 16px',fontSize:12,borderTop:`1px solid ${theme.borderColor}`,color:assignTeamsMsg[org.id]?.includes('error')||assignTeamsMsg[org.id]?.includes('failed')?'#dc2626':'#15803d',background:assignTeamsMsg[org.id]?.includes('error')||assignTeamsMsg[org.id]?.includes('failed')?'#fef2f2':'#f0fdf4'}}>
                      {assignTeamsMsg[org.id]}
                    </div>
                  )}

                  {/* F70: Invite code row */}
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px',borderTop:`1px solid ${theme.borderColor}`,background:theme.bg,fontSize:13}}>
                    <span style={{color:theme.textMuted,fontWeight:500}}>Invite Code:</span>
                    <span style={{fontFamily:'monospace',fontWeight:700,letterSpacing:2,color:theme.text,background:theme.bgSecondary,padding:'3px 10px',borderRadius:4,border:`1px solid ${theme.borderColor}`}}>
                      {orgInviteCodes[org.id] || '—'}
                    </span>
                    <button
                      onClick={() => regenerateInviteCode(org.id)}
                      disabled={!!orgInviteCodeLoading[org.id]}
                      style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:5,padding:'3px 10px',fontSize:12,cursor:'pointer',color:theme.textMuted,opacity:orgInviteCodeLoading[org.id]?0.5:1}}
                    >{orgInviteCodeLoading[org.id] ? 'Regenerating…' : 'Regenerate'}</button>
                    <span style={{fontSize:11,color:theme.textMuted}}>Share this code with employees to join anonymously.</span>
                  </div>

                  {/* Expanded members panel */}
                  {expandedOrgId === org.id && (
                    <div style={{borderTop:`1px solid ${theme.borderColor}`,padding:'16px'}}>
                      {/* Add member form */}
                      <div style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:12,marginBottom:14}}>
                        <h5 style={{margin:'0 0 10px 0',fontSize:13,fontWeight:600,color:theme.text}}>Add Member</h5>
                        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr auto',gap:8,alignItems:'end'}}>
                          <div>
                            <label style={{display:'block',fontSize:11,color:theme.textMuted,marginBottom:3}}>Public ID</label>
                            <select
                              value={orgAddUserId}
                              onChange={e => setOrgAddUserId(e.target.value)}
                              style={{width:'100%',padding:'6px 8px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13,fontFamily:'monospace'}}
                            >
                              <option value="">— select —</option>
                              {allPublicIds.map(pid => (
                                <option key={pid} value={pid}>{pid}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{display:'block',fontSize:11,color:theme.textMuted,marginBottom:3}}>Role</label>
                            <select
                              value={orgAddRole}
                              onChange={e => setOrgAddRole(e.target.value as 'member'|'admin')}
                              style={{width:'100%',padding:'6px 8px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13}}
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div>
                            <label style={{display:'block',fontSize:11,color:theme.textMuted,marginBottom:3}}>Team</label>
                            <select
                              value={orgAddTeam}
                              onChange={e => setOrgAddTeam(e.target.value as ''|'fire'|'water'|'wind'|'earth')}
                              style={{width:'100%',padding:'6px 8px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13}}
                            >
                              <option value="">— none —</option>
                              {(orgTeams[org.id] || []).map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => addOrgMember(org.id)}
                            disabled={orgAddSaving}
                            style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:6,padding:'6px 14px',fontWeight:600,fontSize:13,cursor:'pointer',opacity:orgAddSaving?0.6:1,whiteSpace:'nowrap'}}
                          >Add</button>
                        </div>
                        {orgAddError && <p style={{color:'#dc2626',fontSize:12,margin:'6px 0 0 0'}}>{orgAddError}</p>}
                      </div>

                      {/* Teams management */}
                      <div style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:12,marginBottom:14}}>
                        <h5 style={{margin:'0 0 10px 0',fontSize:13,fontWeight:600,color:theme.text}}>Teams</h5>
                        {/* Existing teams */}
                        {(orgTeams[org.id] || []).length === 0 ? (
                          <p style={{color:theme.textMuted,fontSize:12,margin:'0 0 8px 0'}}>No teams yet. Add one below.</p>
                        ) : (
                          <div style={{display:'flex',flexDirection:'column',gap:4,marginBottom:10}}>
                            {(orgTeams[org.id] || []).map(t => (
                              <div key={t.id} style={{display:'flex',alignItems:'center',gap:8}}>
                                {orgTeamEditId === t.id ? (
                                  <>
                                    <input
                                      value={orgTeamEditVal}
                                      onChange={e => setOrgTeamEditVal(e.target.value)}
                                      style={{flex:1,padding:'4px 8px',borderRadius:4,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13}}
                                      onKeyDown={e => { if (e.key === 'Enter') saveOrgTeamEdit(org.id, t.id); if (e.key === 'Escape') setOrgTeamEditId(null) }}
                                      autoFocus
                                    />
                                    <button onClick={() => saveOrgTeamEdit(org.id, t.id)} style={{background:'#2563eb',color:'#fff',border:'none',borderRadius:4,padding:'3px 10px',fontSize:12,cursor:'pointer'}}>Save</button>
                                    <button onClick={() => setOrgTeamEditId(null)} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'3px 10px',fontSize:12,cursor:'pointer',color:theme.text}}>Cancel</button>
                                  </>
                                ) : (
                                  <>
                                    <span style={{flex:1,fontSize:13,color:theme.text}}>{t.name}</span>
                                    <button onClick={() => { setOrgTeamEditId(t.id); setOrgTeamEditVal(t.name) }} style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'2px 9px',fontSize:12,cursor:'pointer',color:theme.text}}>Rename</button>
                                    <button onClick={() => deleteOrgTeam(org.id, t.id)} style={{background:'transparent',border:'1px solid #dc2626',borderRadius:4,padding:'2px 9px',fontSize:12,cursor:'pointer',color:'#dc2626'}}>Delete</button>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Add team */}
                        <div style={{display:'flex',gap:8}}>
                          <input
                            value={orgTeamInput[org.id] || ''}
                            onChange={e => setOrgTeamInput(prev => ({ ...prev, [org.id]: e.target.value }))}
                            placeholder="New team name"
                            onKeyDown={e => { if (e.key === 'Enter') addOrgTeam(org.id) }}
                            style={{flex:1,padding:'5px 8px',borderRadius:5,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:13}}
                          />
                          <button onClick={() => addOrgTeam(org.id)} style={{background:'#16a34a',color:'#fff',border:'none',borderRadius:5,padding:'5px 14px',fontSize:13,fontWeight:600,cursor:'pointer'}}>Add Team</button>
                        </div>
                        {orgTeamError[org.id] && <p style={{color:'#dc2626',fontSize:12,margin:'6px 0 0 0'}}>{orgTeamError[org.id]}</p>}
                      </div>

                      {/* Feature 18: Team score summary — F18a: with filters + sortable headers */}
                      {(orgTeamScores[org.slug] || []).length > 0 && (() => {
                        const minAvgVal = teamScoreMinAvg[org.slug] !== undefined ? parseFloat(teamScoreMinAvg[org.slug]) : NaN
                        const hasMembersToggle = teamScoreHasMembersOnly[org.slug] ?? true
                        const tsSort = teamScoreSort[org.slug] || {col: 'avg_bhas', dir: 'desc' as SortDir}
                        const filteredTeams = (orgTeamScores[org.slug] || [])
                          .filter(t => {
                            if (hasMembersToggle && t.member_count === 0) return false
                            if (!isNaN(minAvgVal) && (t.avg_bhas_pct === null || t.avg_bhas_pct < minAvgVal)) return false
                            return true
                          })
                          .sort((a, b) => {
                            const dir = tsSort.dir === 'asc' ? 1 : -1
                            if (tsSort.col === 'team') return dir * a.team.localeCompare(b.team)
                            if (tsSort.col === 'members') return dir * (a.member_count - b.member_count)
                            if (tsSort.col === 'optimal') return dir * ((a.optimal_pct ?? -1) - (b.optimal_pct ?? -1))
                            return dir * ((a.avg_bhas_pct ?? -1) - (b.avg_bhas_pct ?? -1))
                          })
                        const tToggle = (col: string) => setTeamScoreSort(prev => {
                          const cur = prev[org.slug] || {col: 'avg_bhas', dir: 'desc' as SortDir}
                          return {...prev, [org.slug]: cur.col === col ? {...cur, dir: cur.dir === 'asc' ? 'desc' : 'asc'} : {col, dir: 'asc'}}
                        })
                        const tArrow = (col: string) => tsSort.col === col ? (tsSort.dir === 'asc' ? ' ↑' : ' ↓') : ''
                        return (
                        <div style={{background:theme.bg,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:12,marginBottom:14}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,flexWrap:'wrap',gap:8}}>
                            <h5 style={{margin:0,fontSize:13,fontWeight:600,color:theme.text}}>Team Score Summary</h5>
                            <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                              <div style={{display:'flex',alignItems:'center',gap:5}}>
                                <label style={{fontSize:11,color:theme.textMuted}}>Min Avg NHLS %</label>
                                <input
                                  type="number"
                                  min={0} max={100}
                                  value={teamScoreMinAvg[org.slug] ?? ''}
                                  onChange={e => setTeamScoreMinAvg(prev => ({...prev,[org.slug]:e.target.value}))}
                                  placeholder="0"
                                  style={{width:60,padding:'3px 6px',borderRadius:4,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:12}}
                                />
                              </div>
                              <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:theme.textMuted,cursor:'pointer',userSelect:'none'}}>
                                <input
                                  type="checkbox"
                                  checked={teamScoreHasMembersOnly[org.slug] ?? true}
                                  onChange={e => setTeamScoreHasMembersOnly(prev => ({...prev,[org.slug]:e.target.checked}))}
                                  style={{cursor:'pointer'}}
                                />
                                Has members only
                              </label>
                            </div>
                          </div>
                          {filteredTeams.length === 0 ? (
                            <p style={{color:theme.textMuted,fontSize:12,margin:0}}>No teams match the current filters.</p>
                          ) : (
                          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                            <thead>
                              <tr style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                                {([['team','Team'],['members','Members'],['avg_bhas','Avg NHLS'],['optimal','% at Optimal']] as [string,string][]).map(([col,label]) => (
                                  <th key={col} onClick={() => tToggle(col)} style={{textAlign:'left',padding:'4px 8px',color:theme.textMuted,fontWeight:600,fontSize:11,textTransform:'uppercase',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
                                    {label}{tArrow(col)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTeams.map((t) => (
                                <tr key={t.team} style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                                  <td style={{padding:'5px 8px',color:theme.text,fontWeight:500}}>{t.team}</td>
                                  <td style={{padding:'5px 8px',color:theme.textMuted}}>{t.member_count}</td>
                                  <td style={{padding:'5px 8px'}}>
                                    {t.avg_bhas_pct !== null ? (
                                      <span style={{
                                        background: t.avg_bhas_pct >= 80 ? '#dcfce7' : t.avg_bhas_pct >= 50 ? '#fef3c7' : '#fee2e2',
                                        color: t.avg_bhas_pct >= 80 ? '#15803d' : t.avg_bhas_pct >= 50 ? '#b45309' : '#b91c1c',
                                        borderRadius:4, padding:'1px 7px', fontWeight:700, fontSize:12
                                      }}>{t.avg_bhas_pct}%</span>
                                    ) : <span style={{color:theme.textMuted}}>—</span>}
                                  </td>
                                  <td style={{padding:'5px 8px',color:theme.textMuted}}>{t.optimal_pct !== null ? `${t.optimal_pct}%` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          )}
                        </div>
                        )
                      })()}

                      {/* Member table — F18a: with filters + sortable headers */}
                      {!orgMembers[org.id] ? (
                        <p style={{color:theme.textMuted,fontSize:13}}>Loading members…</p>
                      ) : orgMembers[org.id].length === 0 ? (
                        <p style={{color:theme.textMuted,fontSize:13}}>No members yet.</p>
                      ) : (() => {
                        const pubQ = (memberPubIdSearch[org.id] || '').toLowerCase()
                        const teamF = memberTeamFilter[org.id] || ''
                        const roleF = memberRoleFilter[org.id] || ''
                        const unassigned = memberUnassignedOnly[org.id] || false
                        const mSort = memberSort[org.id] || {col: 'public_id', dir: 'asc' as SortDir}
                        const filtered = orgMembers[org.id]
                          .filter(m => {
                            if (pubQ && !(m.public_id || '').toLowerCase().includes(pubQ)) return false
                            if (teamF && m.team !== teamF) return false
                            if (roleF && m.role !== roleF) return false
                            if (unassigned && m.team) return false
                            return true
                          })
                          .sort((a, b) => {
                            const dir = mSort.dir === 'asc' ? 1 : -1
                            if (mSort.col === 'role') return dir * (a.role || '').localeCompare(b.role || '')
                            if (mSort.col === 'team') return dir * (a.team || '').localeCompare(b.team || '')
                            if (mSort.col === 'joined') return dir * ((a.joined_at || '').localeCompare(b.joined_at || ''))
                            return dir * (a.public_id || '').localeCompare(b.public_id || '')
                          })
                        const hasActiveFilter = pubQ || teamF || roleF || unassigned
                        const availableTeams = Array.from(new Set(orgMembers[org.id].map(m => m.team).filter(Boolean))) as string[]
                        const mToggle = (col: string) => setMemberSort(prev => {
                          const cur = prev[org.id] || {col: 'public_id', dir: 'asc' as SortDir}
                          return {...prev, [org.id]: cur.col === col ? {...cur, dir: cur.dir === 'asc' ? 'desc' : 'asc'} : {col, dir: 'asc'}}
                        })
                        const mArrow = (col: string) => mSort.col === col ? (mSort.dir === 'asc' ? ' ↑' : ' ↓') : ''
                        return (
                          <>
                            {/* Member filter bar */}
                            <div style={{display:'flex',gap:8,alignItems:'flex-end',flexWrap:'wrap',marginBottom:10,background:theme.bgSecondary,border:`1px solid ${theme.borderColor}`,borderRadius:6,padding:'8px 12px'}}>
                              <div>
                                <label style={{display:'block',fontSize:10,color:theme.textMuted,marginBottom:2}}>Public ID</label>
                                <input
                                  value={memberPubIdSearch[org.id] || ''}
                                  onChange={e => setMemberPubIdSearch(prev => ({...prev,[org.id]:e.target.value}))}
                                  placeholder="NHL-…"
                                  style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:12,width:130,fontFamily:'monospace'}}
                                />
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:10,color:theme.textMuted,marginBottom:2}}>Team</label>
                                <select
                                  value={memberTeamFilter[org.id] || ''}
                                  onChange={e => setMemberTeamFilter(prev => ({...prev,[org.id]:e.target.value}))}
                                  style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:12}}
                                >
                                  <option value="">All teams</option>
                                  {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label style={{display:'block',fontSize:10,color:theme.textMuted,marginBottom:2}}>Role</label>
                                <select
                                  value={memberRoleFilter[org.id] || ''}
                                  onChange={e => setMemberRoleFilter(prev => ({...prev,[org.id]:e.target.value}))}
                                  style={{padding:'4px 8px',borderRadius:4,border:`1px solid ${theme.borderColor}`,background:theme.bgInput||theme.bg,color:theme.text,fontSize:12}}
                                >
                                  <option value="">All roles</option>
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>
                              <label style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:theme.textMuted,cursor:'pointer',userSelect:'none',alignSelf:'flex-end',paddingBottom:2}}>
                                <input
                                  type="checkbox"
                                  checked={memberUnassignedOnly[org.id] || false}
                                  onChange={e => setMemberUnassignedOnly(prev => ({...prev,[org.id]:e.target.checked}))}
                                  style={{cursor:'pointer'}}
                                />
                                Unassigned only
                              </label>
                              {hasActiveFilter && (
                                <button
                                  onClick={() => {
                                    setMemberPubIdSearch(prev => ({...prev,[org.id]:''}))
                                    setMemberTeamFilter(prev => ({...prev,[org.id]:''}))
                                    setMemberRoleFilter(prev => ({...prev,[org.id]:''}))
                                    setMemberUnassignedOnly(prev => ({...prev,[org.id]:false}))
                                  }}
                                  style={{background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'4px 9px',fontSize:11,cursor:'pointer',color:theme.textMuted,alignSelf:'flex-end',marginBottom:2}}
                                >Clear</button>
                              )}
                              <span style={{fontSize:11,color:theme.textMuted,alignSelf:'flex-end',paddingBottom:3,marginLeft:'auto'}}>
                                {filtered.length} / {orgMembers[org.id].length}
                              </span>
                            </div>
                            {filtered.length === 0 ? (
                              <p style={{color:theme.textMuted,fontSize:13}}>No members match the current filters.</p>
                            ) : (
                            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                              <thead>
                                <tr style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                                  {([['public_id','Public ID'],['role','Role'],['team','Team'],['joined','Joined']] as [string,string][]).map(([col,label]) => (
                                    <th key={col} onClick={() => mToggle(col)} style={{textAlign:'left',padding:'6px 8px',color:theme.textMuted,fontWeight:600,fontSize:11,textTransform:'uppercase',cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
                                      {label}{mArrow(col)}
                                    </th>
                                  ))}
                                  <th style={{padding:'6px 8px'}} />
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map(m => (
                                  <tr key={m.id} style={{borderBottom:`1px solid ${theme.borderColor}`}}>
                                    <td style={{padding:'7px 8px',color:theme.text,fontFamily:'monospace',fontSize:12}}>{m.public_id || '—'}</td>
                                    <td style={{padding:'7px 8px'}}>
                                      <span style={{background:m.role==='admin'?'#dbeafe':'#f0fdf4',color:m.role==='admin'?'#1d4ed8':'#15803d',borderRadius:4,padding:'2px 7px',fontSize:11,fontWeight:600}}>{m.role}</span>
                                    </td>
                                    <td style={{padding:'7px 8px',color:theme.text,textTransform:'capitalize'}}>{m.team || '—'}</td>
                                    <td style={{padding:'7px 8px',color:theme.textMuted}}>{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</td>
                                    <td style={{padding:'7px 8px'}}>
                                      <button
                                        onClick={() => removeOrgMember(org.id, m.user_id)}
                                        style={{background:'transparent',border:'1px solid #dc2626',borderRadius:4,padding:'3px 9px',fontSize:12,cursor:'pointer',color:'#dc2626'}}
                                      >Remove</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
          })()}
        </div>
      )}

      {/* ── Products Tab (F24) ───────────────────────────────────────── */}
      {activeTab === 'products' && (
        <AffiliateProductsTab theme={theme} allowedTags={allowedTags} />
      )}

      {/* ── Brokers Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'brokers' && (
        <AdminBrokersTab theme={theme} />
      )}

      {/* ── Providers Tab ────────────────────────────────────────────────── */}
      {activeTab === 'providers' && (
        <AdminProvidersTab theme={theme} />
      )}

      {/* ── Leagues Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'leagues' && (
        <AdminLeaguesTab theme={theme} />
      )}

      {/* ── Users Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <AdminUsersTab theme={theme} isSuperAdmin={isSuperAdmin} />
      )}

      {/* ── Challenges Tab (F66) ─────────────────────────────────────────── */}
      {activeTab === 'challenges' && (
        <AdminChallengesTab theme={theme} />
      )}

      {/* ── Lab Results Tab (F72 — super_admin only) ─────────────────────── */}
      {activeTab === 'lab-results' && isSuperAdmin && (
        <AdminLabResultsTab theme={theme} />
      )}

      {/* ── Lab Sets Tab (F90) ─────────────────────────────────────────── */}
      {activeTab === 'lab-sets' && (
        <AdminLabSetsPanel theme={theme} />
      )}

    </div>
  )
}

