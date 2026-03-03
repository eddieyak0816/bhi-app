import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

interface ConsentPageProps {
  onNavigate?: (page: string) => void
}

export default function ConsentPage({ onNavigate }: ConsentPageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()

  const [isPublic, setIsPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('is_public')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setIsPublic(data.is_public ?? false)
      })
  }, [user?.id])

  const handleToggle = async (value: boolean) => {
    if (!user?.id) return
    setIsPublic(value)
    setSaving(true)
    setSaveMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({ is_public: value })
      .eq('id', user.id)
    setSaving(false)
    setSaveMessage(
      error
        ? { type: 'error', text: error.message }
        : { type: 'success', text: value ? 'Profile set to public.' : 'Profile set to private.' }
    )
    setTimeout(() => setSaveMessage(null), 3000)
  }

  const sectionStyle = {
    background: theme.card,
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  }

  return (
    <div style={{ width: '100%', maxWidth: 680 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Public Profile &amp; Privacy</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>Control what others can see about your health profile</p>
      </div>

      {/* Developer action-required banner */}
      <div
        style={{
          background: 'rgba(217, 119, 6, 0.1)',
          border: '1.5px solid #D97706',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 700, color: '#D97706', marginBottom: 4 }}>
          ACTION REQUIRED (Developer)
        </div>
        <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>
          Before enabling public profiles in production, decide who can view them:
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Anyone with a link (no login required)?</li>
            <li>Logged-in BHI users only?</li>
          </ul>
          The public profile URL structure and access rules must be implemented before this toggle has any real effect outside the app.
        </div>
      </div>

      {/* What is shared */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>What is shared publicly</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: theme.text, fontSize: 14, lineHeight: 2 }}>
          <li>Your display name</li>
          <li>Your overall BHAS health score (as a percentage)</li>
          <li>Your health tags (e.g. "Normal Glucose", "Adequate Vitamin D") — no raw numbers</li>
          <li>The month and year your data was last updated</li>
        </ul>
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1.5px solid #10B981',
            borderRadius: 6,
            fontSize: 13,
            color: '#10B981',
            fontWeight: 600,
          }}
        >
          Your actual lab values, email address, age, and biometric measurements are never shared.
        </div>
      </div>

      {/* Toggle */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>Public Profile</h3>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            cursor: 'pointer',
          }}
        >
          <div
            onClick={() => handleToggle(!isPublic)}
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
              {isPublic
                ? 'Others can view your health score and tags.'
                : 'Only you can see your health data.'}
            </div>
          </div>
          {saving && (
            <span style={{ fontSize: 12, color: theme.textMuted, marginLeft: 'auto' }}>Saving…</span>
          )}
        </label>

        {saveMessage && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: saveMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              color: saveMessage.type === 'success' ? '#10B981' : '#EF4444',
              border: `1.5px solid ${saveMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
            }}
          >
            {saveMessage.text}
          </div>
        )}
      </div>

      {/* Preview link */}
      {isPublic && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => onNavigate?.('public-profile')}
            style={{
              background: theme.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Preview My Public Profile
          </button>
        </div>
      )}

      {/* Back link */}
      <button
        onClick={() => onNavigate?.('profile')}
        style={{
          background: 'transparent',
          color: theme.textMuted,
          border: 'none',
          padding: 0,
          fontSize: 13,
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Back to Profile Settings
      </button>
    </div>
  )
}
