import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { directFetch, supabase } from '../lib/supabase'

interface ProfilePageProps {
  userEmail?: string
  userName?: string
  onNavigate?: (page: string) => void
}

interface HealthGoal {
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
    healthGoals: [] as string[],
    preferredResourceTypes: [] as string[],
    notificationsEnabled: true,
    emailUpdates: false,
  })
  const [isPublic, setIsPublic] = useState(false)
  const [publicId, setPublicId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Username state (Feature 15)
  const [username, setUsername] = useState('')
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'saving' | 'saved' | 'error'>('idle')
  const usernameCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [healthGoals, setHealthGoals] = useState<HealthGoal[]>([])
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
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('name, age, sex, waist_circumference, waist_unit, grip_strength, is_public, public_id, username, height_cm, weight_kg, is_type1_diabetes, total_daily_insulin_units, has_advanced_care_plan, acute_visits')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
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

      const res = await fetch(
        `${((import.meta as any).env.VITE_SUPABASE_URL as string)}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string,
            'Authorization': `Bearer ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY as string}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(payload),
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

  // Username: debounced availability check
  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function usernameApiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

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
        const res = await fetch(usernameApiUrl(`/api/username/check?username=${encodeURIComponent(clean)}`))
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
      const res = await fetch(usernameApiUrl('/api/username'), {
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

  // Load health goals and resource types using direct fetch (more reliable)
  const loadOptions = async (retryCount = 0) => {
    setLoading(true)
    setLoadError(null)
    try { loadControllerRef.current?.abort() } catch {}
    const controller = new AbortController()
    loadControllerRef.current = controller

    console.log(`[ProfilePage] Loading options (attempt ${retryCount + 1})...`)

    try {
      // Use direct fetch for reliability - Supabase client can get stuck after window switches
      const [goalsResult, typesResult] = await Promise.all([
        directFetch<HealthGoal>('health_goals', {
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

      if (goalsResult.error) {
        console.warn('Health goals fetch error:', goalsResult.error)
        throw goalsResult.error
      }
      if (typesResult.error) {
        console.warn('Resource types fetch error:', typesResult.error)
        throw typesResult.error
      }

      if (controller.signal.aborted) return
      setHealthGoals(goalsResult.data || [])
      setResourceTypes((typesResult.data || []).map((t: { name: string }) => t.name))
      setLoadError(null)
      console.log('[ProfilePage] Successfully loaded options')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[ProfilePage] Failed to load options: ${errorMsg}`, err)

      // Auto-retry on timeout (up to 2 retries)
      if (errorMsg.includes('timeout') && retryCount < 2 && !controller.signal.aborted) {
        console.log(`[ProfilePage] Timeout detected, auto-retrying (attempt ${retryCount + 2})...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        if (!controller.signal.aborted) {
          loadOptions(retryCount + 1)
          return
        }
      }

      if (!controller.signal.aborted) setLoadError(errorMsg)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      if (loadControllerRef.current === controller) loadControllerRef.current = null
    }
  }

  useEffect(() => {
    loadOptions()
  }, [])

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal) ? prev.healthGoals.filter(g => g !== goal) : [...prev.healthGoals, goal],
    }))
  }

  const handleResourceTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      preferredResourceTypes: prev.preferredResourceTypes.includes(type) ? prev.preferredResourceTypes.filter(t => t !== type) : [...prev.preferredResourceTypes, type],
    }))
  }

  const sectionStyle = {
    background: theme.card,
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: theme.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: 6,
    fontSize: 14,
    background: theme.bg,
    color: theme.text,
    marginBottom: 16,
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Profile Settings</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>Manage your account and preferences</p>
      </div>

      {/* Personal Information */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Personal Information</h3>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={formData.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
        </div>
        {/* Username (Feature 15) */}
        <div>
          <label style={labelStyle}>Username</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={usernameInput}
              onChange={e => onUsernameInputChange(e.target.value)}
              placeholder="your_username"
              maxLength={30}
              style={{ ...inputStyle, marginBottom: 0, flex: 1, borderColor: usernameStatus === 'available' ? '#16a34a' : usernameStatus === 'taken' || usernameStatus === 'invalid' ? '#dc2626' : undefined }}
            />
            <button
              onClick={saveUsername}
              disabled={usernameStatus !== 'available'}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: usernameStatus === 'available' ? 'pointer' : 'not-allowed', opacity: usernameStatus === 'available' ? 1 : 0.5, whiteSpace: 'nowrap' }}
            >{usernameStatus === 'saving' ? 'Saving…' : 'Save Username'}</button>
          </div>
          <div style={{ fontSize: 12, marginTop: 4, color: usernameStatus === 'available' || usernameStatus === 'saved' ? '#16a34a' : usernameStatus === 'taken' ? '#dc2626' : usernameStatus === 'invalid' ? '#dc2626' : usernameStatus === 'checking' ? '#6b7280' : '#6b7280' }}>
            {usernameStatus === 'checking' && 'Checking…'}
            {usernameStatus === 'available' && 'Available'}
            {usernameStatus === 'taken' && 'Already taken — choose another'}
            {usernameStatus === 'invalid' && 'At least 3 characters (letters, numbers, underscores)'}
            {usernameStatus === 'saved' && 'Username saved'}
            {usernameStatus === 'error' && 'Error — try again'}
            {usernameStatus === 'idle' && username && <span style={{ color: '#6b7280' }}>Current: <strong>{username}</strong></span>}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={e => setFormData({ ...formData, age: e.target.value })}
            placeholder="Enter your age"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Sex</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['male', 'female'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setFormData({ ...formData, sex: s })}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1.5px solid ${formData.sex === s ? theme.blue : theme.borderColor}`,
                  borderRadius: 6,
                  background: formData.sex === s ? theme.blue : theme.bg,
                  color: formData.sex === s ? '#fff' : theme.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Biometrics */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>Biometrics</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
          Used for BHAS scoring. Waist thresholds vary by sex — set your sex above first.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Waist Circumference</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                step="0.1"
                value={formData.waistCircumference}
                onChange={e => setFormData({ ...formData, waistCircumference: e.target.value })}
                placeholder={formData.waistUnit === 'in' ? 'e.g. 34' : 'e.g. 86'}
                style={{ ...inputStyle, marginBottom: 0, flex: 1, fontSize: 16 }}
              />
              <select
                value={formData.waistUnit}
                onChange={e => setFormData({ ...formData, waistUnit: e.target.value as 'in' | 'cm' })}
                style={{
                  padding: '10px 6px',
                  border: `1.5px solid ${theme.borderColor}`,
                  borderRadius: 6,
                  fontSize: 13,
                  background: theme.bg,
                  color: theme.text,
                  cursor: 'pointer',
                  width: 52,
                  flexShrink: 0,
                }}
              >
                <option value="in">in</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Grip Strength (kg)</label>
            <input
              type="number"
              step="0.1"
              value={formData.gripStrength}
              onChange={e => setFormData({ ...formData, gripStrength: e.target.value })}
              placeholder="e.g. 38"
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>
          <div>
            <label style={labelStyle}>Height</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.heightFt}
                  onChange={e => setFormData({ ...formData, heightFt: e.target.value })}
                  placeholder="ft"
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, textAlign: 'center' }}>feet</div>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  max="11"
                  step="1"
                  value={formData.heightIn}
                  onChange={e => setFormData({ ...formData, heightIn: e.target.value })}
                  placeholder="in"
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2, textAlign: 'center' }}>inches</div>
              </div>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Body Weight (lbs)</label>
            <input
              type="number"
              step="1"
              value={formData.weightLbs}
              onChange={e => setFormData({ ...formData, weightLbs: e.target.value })}
              placeholder="e.g. 175"
              style={{ ...inputStyle, marginBottom: 0 }}
            />
          </div>
        </div>
      </div>

      {/* BHAS v2.3 Clinical Inputs */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>Clinical Information</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
          Used for BHAS v2.3 scoring. These affect which metrics are calculated.
        </p>

        {/* Type 1 Diabetes toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={formData.isType1Diabetes}
            onChange={e => setFormData({ ...formData, isType1Diabetes: e.target.checked, totalDailyInsulinUnits: '' })}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Type 1 Diabetes</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Switches BHAS scoring from HOMA-IR to Insulin Units/kg</div>
          </div>
        </label>

        {/* Total Daily Insulin — only shown for Type 1 */}
        {formData.isType1Diabetes && (
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Total Daily Insulin Units (units/day)</label>
            <input
              type="number"
              step="0.5"
              value={formData.totalDailyInsulinUnits}
              onChange={e => setFormData({ ...formData, totalDailyInsulinUnits: e.target.value })}
              placeholder="e.g. 42"
              style={inputStyle}
            />
          </div>
        )}

        {/* Advanced Care Plan */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 16 }}>
          <input
            type="checkbox"
            checked={formData.hasAdvancedCarePlan}
            onChange={e => setFormData({ ...formData, hasAdvancedCarePlan: e.target.checked })}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Advanced Care Plan documented</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Living will, healthcare proxy, or similar document on file. Worth 1 point in BHAS v2.3.</div>
          </div>
        </label>

        {/* Acute Care Visits */}
        <div>
          <label style={labelStyle}>Acute Care Visits (past 12 months)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={formData.acuteVisits}
            onChange={e => setFormData({ ...formData, acuteVisits: e.target.value })}
            placeholder="e.g. 0"
            style={inputStyle}
          />
          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: -12, marginBottom: 8 }}>
            ER or urgent care visits. Used as a tie-breaker in leaderboard ranking — not directly scored.
          </div>
        </div>
      </div>

      {/* Health Goals */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Health Goals</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Select your primary health focus areas</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.textMuted }}>Loading options...</div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#DC2626' }}>{loadError}</div>
        ) : healthGoals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.textMuted }}>No health goals configured yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, alignItems: 'start' }}>
            {healthGoals.map(goal => (
              <label
                key={goal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 52,
                  padding: '0 12px',
                  boxSizing: 'border-box',
                  lineHeight: '20px',
                  background: theme.bg,
                  border: `1.5px solid ${formData.healthGoals.includes(goal.name) ? theme.blue : theme.borderColor}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: theme.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.healthGoals.includes(goal.name)}
                  onChange={() => handleGoalToggle(goal.name)}
                  style={{ cursor: 'pointer', flexShrink: 0, alignSelf: 'center' }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Resource Type Preferences */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Preferred Resource Types</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Choose which types of resources you prefer to see</p>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.textMuted }}>Loading options...</div>
        ) : loadError ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#DC2626' }}>{loadError}</div>
        ) : resourceTypes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: theme.textMuted }}>No resource types configured yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, alignItems: 'start' }}>
            {resourceTypes.map(type => (
              <label
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 52,
                  padding: '0 12px',
                  boxSizing: 'border-box',
                  lineHeight: '20px',
                  background: theme.bg,
                  border: `1.5px solid ${formData.preferredResourceTypes.includes(type) ? theme.blue : theme.borderColor}`,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: theme.text,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.preferredResourceTypes.includes(type)}
                  onChange={() => handleResourceTypeToggle(type)}
                  style={{ cursor: 'pointer', flexShrink: 0 }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Notifications</h3>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            background: theme.bg,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 12,
            color: theme.text,
          }}
        >
          <input
            type="checkbox"
            checked={formData.notificationsEnabled}
            onChange={e => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>In-App Notifications</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Get alerts about new resources and lab results</div>
          </div>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            background: theme.bg,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            cursor: 'pointer',
            color: theme.text,
          }}
        >
          <input
            type="checkbox"
            checked={formData.emailUpdates}
            onChange={e => setFormData({ ...formData, emailUpdates: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Email Updates</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Weekly summary of new resources</div>
          </div>
        </label>
      </div>

      {/* Save feedback */}
      {saveMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 6,
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
          background: saveMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          color: saveMessage.type === 'success' ? '#10B981' : '#EF4444',
          border: `1.5px solid ${saveMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
        }}>
          {saveMessage.type === 'success' ? '✓ ' : '✕ '}{saveMessage.text}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? theme.borderColor : theme.blue,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            flex: 1,
          }}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={() => setSaveMessage(null)}
          style={{
            background: 'transparent',
            color: theme.text,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Privacy / Public Profile */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Privacy</h3>

        {/* Public ID display */}
        <div
          style={{
            background: theme.bg,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Your Public ID
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
            {publicId ?? '—'}
          </div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>
            This randomly generated ID is the only identifier ever shown alongside your health data. Your real name is never shared.
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: theme.textMuted,
              background: 'rgba(217,119,6,0.08)',
              border: '1px solid #D97706',
              borderRadius: 4,
              padding: '4px 10px',
            }}
          >
            <span style={{ color: '#D97706', fontWeight: 700 }}>Coming soon</span>
            — Changing your Public ID requires a signed HIPAA authorization form.
          </div>
        </div>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', marginBottom: 12 }}
        >
          <div
            onClick={() => setIsPublic(v => !v)}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              background: isPublic ? '#10B981' : theme.borderColor,
              position: 'relative',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: 3,
                left: isPublic ? 25 : 3,
                transition: 'left 0.2s',
              }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {isPublic ? 'Profile is public' : 'Profile is private'}
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
              Share your BHAS score and health tags — no raw values or personal details are ever shared.
            </div>
          </div>
        </label>
        <button
          onClick={() => onNavigate?.('consent')}
          style={{
            background: 'transparent',
            color: theme.blue,
            border: 'none',
            padding: 0,
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Learn more about what is shared
        </button>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          marginTop: 32,
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1.5px solid #FCA5A5`,
          borderRadius: 8,
          padding: 20,
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#DC2626' }}>Danger Zone</h3>
        <button
          style={{
            background: 'transparent',
            color: '#DC2626',
            border: `1.5px solid #FCA5A5`,
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}
