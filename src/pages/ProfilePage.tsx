import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { directFetch, supabase, getStoredJwt } from '../lib/supabase'
import { generatePublicId } from '../utils/publicId'

interface ProfilePageProps {
  userEmail?: string
  userName?: string
  onNavigate?: (page: string) => void
}

interface Category {
  id: string
  name: string
  description?: string
  is_active: boolean
}

export default function Profile({ userEmail, userName, onNavigate }: ProfilePageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()

  // Use auth context user data, falling back to props
  const displayEmail = user?.email || userEmail || ''
  const displayName = user?.name || userName || ''

  const [formData, setFormData] = useState({
    fullName: displayName,
    email: displayEmail,
    age: '',
    sex: '' as 'male' | 'female' | 'other' | '',
    waistCircumference: '',
    waistUnit: 'in' as 'in' | 'cm',
    gripStrength: '',
    // BHAS v2.3 fields — stored in American units in state, converted to metric on save
    heightFt: '',
    heightIn: '',
    weightLbs: '',
    isType1Diabetes: false,
    totalDailyInsulinUnits: '',
    hasAdvancedCarePlan: false,
    acuteVisits: '',
    categoryPreferences: [] as string[],
    preferredResourceTypes: [] as string[],
    notificationsEnabled: true,
    emailUpdates: false,
  })
  const [isPublic, setIsPublic] = useState(false)
  const [publicId, setPublicId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Org invite code state (F70)
  const [inviteCode, setInviteCode] = useState('')
  const [joinStatus, setJoinStatus] = useState<'idle' | 'loading' | 'success' | 'already_member' | 'invalid' | 'error'>('idle')
  const [joinOrgName, setJoinOrgName] = useState('')

  // Username state (Feature 15)
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saving' | 'saved' | 'error'>('idle')
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [resourceTypes, setResourceTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadControllerRef = useRef<AbortController | null>(null)

  // Update form data when user changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      fullName: displayName,
      email: displayEmail,
    }))
  }, [displayName, displayEmail])

  // Load saved profile fields from Supabase
  // Uses plain fetch + user JWT to avoid Supabase client auth deadlock
  useEffect(() => {
    if (!user?.id) return
    const jwt = getStoredJwt()
    if (!jwt) return
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string
    const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string
    const cols = 'name,age,sex,waist_circumference,waist_unit,grip_strength,is_public,public_id,username,height_cm,weight_kg,is_type1_diabetes,total_daily_insulin_units,has_advanced_care_plan,acute_visits'
    fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=${cols}&limit=1`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${jwt}`,
          'Accept': 'application/json',
        },
      }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((rows: any[]) => {
        const data = rows?.[0]
        if (!data) return
        setFormData(prev => ({
          ...prev,
          fullName: data.name || prev.fullName,
          age: data.age != null ? String(data.age) : '',
          sex: data.sex || '',
          waistCircumference: data.waist_circumference != null ? String(data.waist_circumference) : '',
          waistUnit: data.waist_unit || 'in',
          gripStrength: data.grip_strength != null ? String(data.grip_strength) : '',
          // Convert stored cm → ft/in for display
          heightFt: data.height_cm != null ? String(Math.floor(data.height_cm / 30.48)) : '',
          heightIn: data.height_cm != null ? String(Math.round((data.height_cm % 30.48) / 2.54)) : '',
          // Convert stored kg → lbs for display
          weightLbs: data.weight_kg != null ? String(Math.round(data.weight_kg * 2.205)) : '',
          isType1Diabetes: data.is_type1_diabetes ?? false,
          totalDailyInsulinUnits: data.total_daily_insulin_units != null ? String(data.total_daily_insulin_units) : '',
          hasAdvancedCarePlan: data.has_advanced_care_plan ?? false,
          acuteVisits: data.acute_visits != null ? String(data.acute_visits) : '',
        }))
        setIsPublic(data.is_public ?? false)
        setPublicId(data.public_id ?? null)
        setUsername(data.username ?? '')
        setUsernameInput(data.username ?? '')
      })
      .catch(err => console.error('[ProfilePage] profile load failed:', err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!user?.id) return
    setSaving(true)
    setSaveMessage(null)
    try {
      const payload = {
        name: formData.fullName,
        age: formData.age ? parseInt(formData.age) : null,
        sex: formData.sex || null,
        waist_circumference: formData.waistCircumference ? parseFloat(formData.waistCircumference) : null,
        waist_unit: formData.waistUnit,
        grip_strength: formData.gripStrength ? parseFloat(formData.gripStrength) : null,
        is_public: isPublic,
        // BHAS v2.3 fields — convert American units to metric before saving
        height_cm: (formData.heightFt || formData.heightIn)
          ? (parseFloat(formData.heightFt || '0') * 30.48) + (parseFloat(formData.heightIn || '0') * 2.54)
          : null,
        weight_kg: formData.weightLbs ? parseFloat(formData.weightLbs) / 2.205 : null,
        is_type1_diabetes: formData.isType1Diabetes,
        total_daily_insulin_units: formData.isType1Diabetes && formData.totalDailyInsulinUnits ? parseFloat(formData.totalDailyInsulinUnits) : null,
        has_advanced_care_plan: formData.hasAdvancedCarePlan,
        acute_visits: formData.acuteVisits ? parseInt(formData.acuteVisits) : null,
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const jwt = getStoredJwt()
      console.debug('[ProfilePage] jwt present:', !!jwt, 'user.id:', user.id)

      const res = await fetch(
        `${((import.meta as any).env.VITE_SUPABASE_URL as string)}/rest/v1/profiles`,
        {
          method: 'POST',
          headers: {
            'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${jwt ?? (import.meta as any).env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            id: user.id,
            email: user.email ?? userEmail ?? '',
            name: payload.name || user.email || 'User',
            // role intentionally omitted — only PATCH /api/admin/users/:id/role may change it
            // public_id only set on INSERT (merge-duplicates won't overwrite existing value)
            public_id: publicId ?? generatePublicId(),
            ...payload,
          }),
          signal: controller.signal,
        }
      )
      clearTimeout(timeoutId)

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Save failed (${res.status}): ${body}`)
      }
      setSaveMessage({ type: 'success', text: 'Profile saved.' })
    } catch (err) {
      setSaveMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed — check your connection.' })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // F70: Join org by invite code
  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function backendUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  async function handleJoinOrg() {
    if (!inviteCode.trim() || !user?.id) return
    setJoinStatus('loading')
    try {
      const jwt = getStoredJwt()
      const res = await fetch(backendUrl('/api/org/join'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id, 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      })
      const body = await res.json()
      if (res.status === 404) { setJoinStatus('invalid'); return }
      if (!res.ok) { setJoinStatus('error'); return }
      setJoinOrgName(body.org_name || '')
      setJoinStatus(body.already_member ? 'already_member' : 'success')
      setInviteCode('')
    } catch {
      setJoinStatus('error')
    }
  }

  // Username: debounced availability check


  function onUsernameInputChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsernameInput(clean)
    if (usernameCheckRef.current) clearTimeout(usernameCheckRef.current)
    if (!clean) { setUsernameStatus('idle'); return }
    if (clean === username) { setUsernameStatus('idle'); return }
    if (clean.length < 3) { setUsernameStatus('invalid'); return }
    setUsernameStatus('checking')
    usernameCheckRef.current = setTimeout(async () => {
      try {
        const res = await fetch(backendUrl(`/api/username/check?username=${encodeURIComponent(clean)}`))
        const body = await res.json()
        setUsernameStatus(body.available ? 'available' : 'taken')
      } catch {
        setUsernameStatus('error')
      }
    }, 400)
  }

  async function saveUsername() {
    if (!user?.id || !usernameInput || usernameStatus !== 'available') return
    setUsernameStatus('saving')
    try {
      const res = await fetch(backendUrl('/api/username'), {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify({ username: usernameInput }),
      })
      const body = await res.json()
      if (res.status === 409) { setUsernameStatus('taken'); return }
      if (!res.ok) { setUsernameStatus('error'); return }
      setUsername(body.username)
      setUsernameInput(body.username)
      setUsernameStatus('saved')
      setTimeout(() => setUsernameStatus('idle'), 2000)
    } catch {
      setUsernameStatus('error')
    }
  }

  // Load categories and resource types using direct fetch (more reliable)
  const loadOptions = async (retryCount = 0) => {
    setLoading(true)
    setLoadError(null)
    try { loadControllerRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadControllerRef.current = controller

    try {
      const [catsResult, typesResult] = await Promise.all([
        directFetch<Category>('categories', {
          eq: { column: 'is_active', value: true },
          order: { column: 'name', ascending: true },
          timeout: 8000
        }),
        directFetch<{ name: string }>('resource_types', {
          select: 'name',
          order: { column: 'name', ascending: true },
          timeout: 8000
        })
      ])

      if (catsResult.error) throw catsResult.error
      if (typesResult.error) throw typesResult.error

      if (controller.signal.aborted) return
      setCategories(catsResult.data || [])
      setResourceTypes((typesResult.data || []).map((t: { name: string }) => t.name))
      setLoadError(null)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      if (errorMsg.includes('timeout') && retryCount < 2 && !controller.signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 500))
        if (!controller.signal.aborted) { loadOptions(retryCount + 1); return }
      }
      if (!controller.signal.aborted) setLoadError(errorMsg)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      if (loadControllerRef.current === controller) loadControllerRef.current = null
    }
  }

  // Load user's saved category preferences
  useEffect(() => {
    if (!user?.id) return
    const jwt = getStoredJwt()
    if (!jwt) return
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string
    const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string
    fetch(
      `${supabaseUrl}/rest/v1/user_category_preferences?user_id=eq.${encodeURIComponent(user.id)}&select=category_name`,
      { headers: { 'apikey': anonKey, 'Authorization': `Bearer ${jwt}` } }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((rows: { category_name: string }[]) => {
        setFormData(prev => ({ ...prev, categoryPreferences: rows.map(r => r.category_name) }))
      })
      .catch(() => {})
  }, [user?.id])

  useEffect(() => {
    loadOptions()
  }, [])

  const handleCategoryToggle = async (categoryName: string) => {
    if (!user?.id) return
    const jwt = getStoredJwt()
    if (!jwt) return
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string
    const anonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string
    const isSelected = formData.categoryPreferences.includes(categoryName)

    // Optimistic update
    setFormData(prev => ({
      ...prev,
      categoryPreferences: isSelected
        ? prev.categoryPreferences.filter(c => c !== categoryName)
        : [...prev.categoryPreferences, categoryName],
    }))

    if (isSelected) {
      await fetch(
        `${supabaseUrl}/rest/v1/user_category_preferences?user_id=eq.${encodeURIComponent(user.id)}&category_name=eq.${encodeURIComponent(categoryName)}`,
        { method: 'DELETE', headers: { 'apikey': anonKey, 'Authorization': `Bearer ${jwt}` } }
      ).catch(() => {})
    } else {
      await fetch(
        `${supabaseUrl}/rest/v1/user_category_preferences`,
        {
          method: 'POST',
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates',
          },
          body: JSON.stringify({ user_id: user.id, category_name: categoryName }),
        }
      ).catch(() => {})
    }
  }

  const handleResourceTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      preferredResourceTypes: prev.preferredResourceTypes.includes(type) ? prev.preferredResourceTypes.filter(t => t !== type) : [...prev.preferredResourceTypes, type],
    }))
  }

  // ── Presentation only below this line ───────────────────────────────────────
  // Every state setter and handler is the one that was here before (setFormData, saveUsername,
  // onUsernameInputChange, handleJoinOrg, handleCategoryToggle, handleResourceTypeToggle,
  // setIsPublic, handleSave, setSaveMessage, onNavigate). Only markup and styling changed.

  const usernameTone =
    usernameStatus === 'available' || usernameStatus === 'saved' ? 'ok'
    : usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'bad'
    : ''

  return (
    <div className="pf-root">
      <div className="pf-head">
        <h2>Profile Settings</h2>
        <p>Manage your account and preferences</p>
      </div>

      {/* Personal Information */}
      <div className="pf-card">
        <h3>Personal Information</h3>
        <div className="pf-fields">
          <div className="pf-field">
            <label className="pf-label">Full Name</label>
            <input
              className="pf-input"
              type="text"
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          <div className="pf-field">
            <label className="pf-label">Email</label>
            <input className="pf-input" type="email" value={formData.email} disabled />
          </div>
          {/* Username (Feature 15) */}
          <div className="pf-field">
            <label className="pf-label">Username</label>
            <div className="pf-row">
              <input
                className={`pf-input${usernameStatus === 'available' ? ' ok' : usernameStatus === 'taken' || usernameStatus === 'invalid' ? ' bad' : ''}`}
                type="text"
                value={usernameInput}
                onChange={e => onUsernameInputChange(e.target.value)}
                placeholder="your_username"
                maxLength={30}
              />
              <button
                className="pf-btn primary sm"
                onClick={saveUsername}
                disabled={usernameStatus !== 'available'}
              >{usernameStatus === 'saving' ? 'Saving…' : 'Save Username'}</button>
            </div>
            <div className={`pf-status ${usernameTone}`}>
              {usernameStatus === 'checking' && 'Checking…'}
              {usernameStatus === 'available' && 'Available'}
              {usernameStatus === 'taken' && 'Already taken — choose another'}
              {usernameStatus === 'invalid' && 'At least 3 characters (letters, numbers, underscores)'}
              {usernameStatus === 'saved' && 'Username saved'}
              {usernameStatus === 'error' && 'Error — try again'}
              {usernameStatus === 'idle' && username && <span>Current: <strong>{username}</strong></span>}
            </div>
          </div>
          <div className="pf-field">
            <label className="pf-label">Age</label>
            <input
              className="pf-input"
              type="number"
              value={formData.age}
              onChange={e => setFormData({ ...formData, age: e.target.value })}
              placeholder="Enter your age"
            />
          </div>
          <div className="pf-field">
            <label className="pf-label">Sex</label>
            <div className="pf-pills">
              {(['male', 'female'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`pf-pill${formData.sex === s ? ' on' : ''}`}
                  aria-pressed={formData.sex === s}
                  onClick={() => setFormData({ ...formData, sex: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Biometrics */}
      <div className="pf-card">
        <h3>Biometrics</h3>
        <p className="pf-sub">
          Used for NHLS scoring. Waist thresholds vary by sex — set your sex above first.
        </p>
        <div className="pf-grid">
          <div className="pf-field">
            <label className="pf-label">Waist Circumference</label>
            <div className="pf-row">
              <input
                className="pf-input"
                type="number"
                step="0.1"
                value={formData.waistCircumference}
                onChange={e => setFormData({ ...formData, waistCircumference: e.target.value })}
                placeholder={formData.waistUnit === 'in' ? 'e.g. 34' : 'e.g. 86'}
              />
              <select
                className="pf-select"
                aria-label="Waist unit"
                value={formData.waistUnit}
                onChange={e => setFormData({ ...formData, waistUnit: e.target.value as 'in' | 'cm' })}
              >
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
          <div className="pf-field">
            <label className="pf-label">Grip Strength (kg)</label>
            <input
              className="pf-input"
              type="number"
              step="0.1"
              value={formData.gripStrength}
              onChange={e => setFormData({ ...formData, gripStrength: e.target.value })}
              placeholder="e.g. 38"
            />
          </div>
          <div className="pf-field">
            <label className="pf-label">Height</label>
            <div className="pf-split">
              <div>
                <input
                  className="pf-input"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.heightFt}
                  onChange={e => setFormData({ ...formData, heightFt: e.target.value })}
                  placeholder="ft"
                />
                <div className="pf-cap">feet</div>
              </div>
              <div>
                <input
                  className="pf-input"
                  type="number"
                  min="0"
                  max="11"
                  step="1"
                  value={formData.heightIn}
                  onChange={e => setFormData({ ...formData, heightIn: e.target.value })}
                  placeholder="in"
                />
                <div className="pf-cap">inches</div>
              </div>
            </div>
          </div>
          <div className="pf-field">
            <label className="pf-label">Body Weight (lbs)</label>
            <input
              className="pf-input"
              type="number"
              step="1"
              value={formData.weightLbs}
              onChange={e => setFormData({ ...formData, weightLbs: e.target.value })}
              placeholder="e.g. 175"
            />
          </div>
        </div>
      </div>

      {/* BHAS v2.3 Clinical Inputs */}
      <div className="pf-card">
        <h3>Clinical Information</h3>
        <p className="pf-sub">
          Used for NHLS scoring. These affect which metrics are calculated.
        </p>

        <div className="pf-fields">
          {/* Type 1 Diabetes toggle */}
          <label className="pf-check">
            <input
              type="checkbox"
              checked={formData.isType1Diabetes}
              onChange={e => setFormData({ ...formData, isType1Diabetes: e.target.checked, totalDailyInsulinUnits: '' })}
            />
            <div>
              <b>Type 1 Diabetes</b>
              <span>Switches NHLS scoring from HOMA-IR to Insulin Units/kg</span>
            </div>
          </label>

          {/* Total Daily Insulin — only shown for Type 1 */}
          {formData.isType1Diabetes && (
            <div className="pf-field">
              <label className="pf-label">Total Daily Insulin Units (units/day)</label>
              <input
                className="pf-input"
                type="number"
                step="0.5"
                value={formData.totalDailyInsulinUnits}
                onChange={e => setFormData({ ...formData, totalDailyInsulinUnits: e.target.value })}
                placeholder="e.g. 42"
              />
            </div>
          )}

          {/* Advanced Care Plan */}
          <label className="pf-check">
            <input
              type="checkbox"
              checked={formData.hasAdvancedCarePlan}
              onChange={e => setFormData({ ...formData, hasAdvancedCarePlan: e.target.checked })}
            />
            <div>
              <b>Advance Care Plan documented</b>
              <span>Living will, healthcare proxy, or similar document on file. Worth 1 point in your NHLS score.</span>
            </div>
          </label>

          {/* Acute Care Visits */}
          <div className="pf-field">
            <label className="pf-label">Acute Care Visits (past 12 months)</label>
            <input
              className="pf-input"
              type="number"
              min="0"
              step="1"
              value={formData.acuteVisits}
              onChange={e => setFormData({ ...formData, acuteVisits: e.target.value })}
              placeholder="e.g. 0"
            />
            <div className="pf-help">
              ER or urgent care visits. Used as a tie-breaker in leaderboard ranking — not directly scored.
            </div>
          </div>
        </div>
      </div>

      {/* Video Category Preferences */}
      <div className="pf-card">
        <h3>Video Category Preferences</h3>
        <p className="pf-sub">Select health topics you want to see content for. Your dashboard feed will filter to these categories.</p>
        {loading ? (
          <div className="pf-note">Loading categories...</div>
        ) : loadError ? (
          <div className="pf-note err">{loadError}</div>
        ) : categories.length === 0 ? (
          <div className="pf-note">No categories configured yet.</div>
        ) : (
          <div className="pf-opts">
            {categories.map(cat => {
              const on = formData.categoryPreferences.includes(cat.name)
              return (
                <label key={cat.id} className={`pf-opt${on ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => handleCategoryToggle(cat.name)}
                  />
                  <span>{cat.name}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* Resource Type Preferences */}
      <div className="pf-card">
        <h3>Preferred Resource Types</h3>
        <p className="pf-sub">Choose which types of resources you prefer to see</p>
        {loading ? (
          <div className="pf-note">Loading options...</div>
        ) : loadError ? (
          <div className="pf-note err">{loadError}</div>
        ) : resourceTypes.length === 0 ? (
          <div className="pf-note">No resource types configured yet.</div>
        ) : (
          <div className="pf-opts">
            {resourceTypes.map(type => {
              const on = formData.preferredResourceTypes.includes(type)
              return (
                <label key={type} className={`pf-opt${on ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => handleResourceTypeToggle(type)}
                  />
                  <span>{type}</span>
                </label>
              )
            })}
          </div>
        )}
      </div>

      {/* F70: Join Organization */}
      <div className="pf-card">
        <h3>Join an Organization</h3>
        <p className="pf-sub">
          Enter the invite code provided by your employer or organization. Your real name and email are never shared — only your username and NHLS score are visible to org admins.
        </p>
        <div className="pf-row">
          <input
            className="pf-input mono"
            type="text"
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value.toUpperCase()); setJoinStatus('idle') }}
            placeholder="e.g. ABC12345"
            maxLength={12}
          />
          <button
            className="pf-btn primary sm"
            onClick={handleJoinOrg}
            disabled={joinStatus === 'loading' || !inviteCode.trim()}
          >
            {joinStatus === 'loading' ? 'Joining…' : 'Join'}
          </button>
        </div>
        {joinStatus === 'success' && <div className="pf-status ok">Joined {joinOrgName} successfully.</div>}
        {joinStatus === 'already_member' && <div className="pf-status info">You're already a member of {joinOrgName}.</div>}
        {joinStatus === 'invalid' && <div className="pf-status bad">Invalid invite code — check with your organization admin.</div>}
        {joinStatus === 'error' && <div className="pf-status bad">Something went wrong — please try again.</div>}
      </div>

      {/* Notifications */}
      <div className="pf-card">
        <h3>Notifications</h3>
        <div className="pf-fields">
          <label className="pf-check">
            <input
              type="checkbox"
              checked={formData.notificationsEnabled}
              onChange={e => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
            />
            <div>
              <b>In-App Notifications</b>
              <span>Get alerts about new resources and lab results</span>
            </div>
          </label>
          <label className="pf-check">
            <input
              type="checkbox"
              checked={formData.emailUpdates}
              onChange={e => setFormData({ ...formData, emailUpdates: e.target.checked })}
            />
            <div>
              <b>Email Updates</b>
              <span>Weekly summary of new resources</span>
            </div>
          </label>
        </div>
      </div>

      {/* Save feedback */}
      {saveMessage && (
        <div className={`pf-msg ${saveMessage.type === 'success' ? 'success' : 'error'}`} role="status">
          {saveMessage.type === 'success' ? '✓ ' : '✕ '}{saveMessage.text}
        </div>
      )}

      {/* Actions */}
      <div className="pf-actions">
        <button className="pf-btn primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button className="pf-btn ghost" onClick={() => setSaveMessage(null)}>
          Cancel
        </button>
      </div>

      {/* Privacy / Public Profile */}
      <div className="pf-card">
        <h3>Privacy</h3>

        {/* Public ID display */}
        <div className="pf-pid">
          <div className="pf-pid-k">Your Public ID</div>
          <div className="pf-pid-v">{publicId ?? '—'}</div>
          <div className="pf-help" style={{ marginTop: 0 }}>
            This randomly generated ID is the only identifier ever shown alongside your health data. Your real name is never shared.
          </div>
          <div className="pf-soon">
            <b>Coming soon</b>
            <span>— Changing your Public ID requires a signed HIPAA authorization form.</span>
          </div>
        </div>

        <div className="pf-toggle">
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label={isPublic ? 'Profile is public' : 'Profile is private'}
            className={`pf-switch${isPublic ? ' on' : ''}`}
            onClick={() => setIsPublic(v => !v)}
          />
          <div>
            <b>{isPublic ? 'Profile is public' : 'Profile is private'}</b>
            <span>Share your NHLS score and health tags — no raw values or personal details are ever shared.</span>
          </div>
        </div>
        <button className="pf-link" onClick={() => onNavigate?.('consent')}>
          Learn more about what is shared
        </button>
      </div>

      {/* Danger Zone */}
      <div className="pf-danger">
        <h3>Danger Zone</h3>
        <button className="pf-btn danger">
          Delete Account
        </button>
      </div>
    </div>
  )
}
