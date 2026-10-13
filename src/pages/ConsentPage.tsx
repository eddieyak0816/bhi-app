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
  const [publicId, setPublicId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('is_public, public_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsPublic(data.is_public ?? false)
          setPublicId(data.public_id ?? null)
        }
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

  // ── Presentation only below this line ───────────────────────────────────────
  // Same state, same handleToggle (writes profiles.is_public), same navigation targets.
  return (
    <div className="pf-root cs-root">
      <div className="pf-head">
        <h2>Public Profile &amp; Privacy</h2>
        <p>Control what others can see about your health profile</p>
      </div>

      {/* Developer action-required banner */}
      <div className="cs-dev">
        <b>ACTION REQUIRED (Developer)</b>
        Before enabling public profiles in production, decide who can view them:
        <ul>
          <li>Anyone with a link (no login required)?</li>
          <li>Logged-in BHI users only?</li>
        </ul>
        The public profile URL structure and access rules must be implemented before this toggle has any real effect outside the app.
      </div>

      {/* What is shared */}
      <div className="pf-card">
        <h3>What is shared publicly</h3>
        <ul className="cs-list">
          <li>Your display name</li>
          <li>Your overall NHLS score (as a percentage)</li>
          <li>Your health tags (e.g. "Normal Glucose", "Adequate Vitamin D") — no raw numbers</li>
          <li>The month and year your data was last updated</li>
        </ul>
        <div className="cs-safe">
          Your actual lab values, email address, age, and biometric measurements are never shared.
        </div>
      </div>

      {/* Public ID */}
      <div className="pf-card">
        <h3>Your Public ID</h3>
        <div className="pf-pid">
          <div className="pf-pid-v" style={{ fontSize: 20 }}>{publicId ?? '—'}</div>
          <div className="pf-help" style={{ marginTop: 0 }}>
            This randomly generated token is the only identifier ever shown publicly alongside your health data. Your real name is never used.
          </div>
          <div className="pf-soon">
            <b>Coming soon</b>
            <span>— Changing your Public ID requires a signed HIPAA authorization form.</span>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="pf-card">
        <h3>Public Profile</h3>
        <div className="pf-toggle" style={{ marginTop: 14, marginBottom: 0, alignItems: 'center' }}>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            aria-label={isPublic ? 'Profile is public' : 'Profile is private'}
            className={`pf-switch${isPublic ? ' on' : ''}`}
            onClick={() => handleToggle(!isPublic)}
          />
          <div>
            <b>{isPublic ? 'Profile is public' : 'Profile is private'}</b>
            <span>
              {isPublic
                ? 'Others can view your health score and tags.'
                : 'Only you can see your health data.'}
            </span>
          </div>
          {saving && <span className="cs-saving">Saving…</span>}
        </div>

        {saveMessage && (
          <div className={`pf-msg ${saveMessage.type === 'success' ? 'success' : 'error'}`} role="status" style={{ marginTop: 14, marginBottom: 0 }}>
            {saveMessage.text}
          </div>
        )}
      </div>

      <div className="cs-foot">
        {/* Preview link */}
        {isPublic && (
          <button className="pf-btn primary" onClick={() => onNavigate?.('public-profile')}>
            Preview My Public Profile
          </button>
        )}

        {/* Back link */}
        <button className="pf-link" onClick={() => onNavigate?.('profile')}>
          Back to Profile Settings
        </button>
      </div>
    </div>
  )
}
