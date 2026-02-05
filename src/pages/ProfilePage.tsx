import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { directFetch } from '../lib/supabase'

interface ProfilePageProps {
  userEmail?: string
  userName?: string
}

interface HealthGoal {
  id: string
  name: string
  description?: string
  is_active: boolean
}

export default function Profile({ userEmail, userName }: ProfilePageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()

  // Use auth context user data, falling back to props
  const displayEmail = user?.email || userEmail || ''
  const displayName = user?.name || userName || ''

  const [formData, setFormData] = useState({
    fullName: displayName,
    email: displayEmail,
    age: '49',
    healthGoals: [] as string[],
    preferredResourceTypes: [] as string[],
    notificationsEnabled: true,
    emailUpdates: false,
  })

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

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          style={{
            background: theme.blue,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1,
          }}
        >
          Save Changes
        </button>
        <button
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
