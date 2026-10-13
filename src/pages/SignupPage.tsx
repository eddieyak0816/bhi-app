import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthBrand from '../components/AuthBrand'

// Eye / eye-off glyph for the show-password toggles (replaces the emoji).
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  ) : (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

// Every rule getPasswordErrors() can report, in display order. The list below ticks a rule
// off when it is NOT among the current errors — so the rules themselves live in one place.
const PASSWORD_RULES = ['At least 6 characters', 'One uppercase letter', 'One lowercase letter', 'One number']

export default function SignupPage() {
  const { signup, resendConfirmation } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [inviteCode, setInviteCode] = useState('')
  const [pendingConfirmation, setPendingConfirmation] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const getPasswordErrors = () => {
    const errors: string[] = []
    if (password.length < 6) {
      errors.push('At least 6 characters')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('One number')
    }
    return errors
  }

  const passwordErrors = getPasswordErrors()
  const passwordValid = passwordErrors.length === 0
  const passwordsMatch = password === confirmPassword && password.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!passwordValid) {
      setError('Password does not meet requirements')
      return
    }

    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const result = await signup(email, name, password, inviteCode || undefined)
      if (!result.success) {
        if (result.needsConfirmation) {
          setPendingConfirmation(true)
        } else {
          setError(result.error || 'Signup failed')
        }
      }
      // On success, AuthContext will update and router will redirect
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setResendMessage(null)
    try {
      const result = await resendConfirmation(email)
      setResendMessage(result.success ? 'Confirmation email sent.' : (result.error || 'Failed to resend email.'))
    } finally {
      setResendLoading(false)
    }
  }

  // ── Presentation only below this line ──────────────────────────────────────

  if (pendingConfirmation) {
    return (
      <div className="auth">
        <AuthBrand
          title={<>Almost there.<br /><span>Check your inbox.</span></>}
          text="One quick step to activate your account, then you can log in and add your first results."
        />
        <main className="auth-main">
          <div className="auth-card auth-center">
            <div className="auth-sent">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="3" />
                <path d="M2 7l10 6 10-6" />
              </svg>
            </div>
            <h1 className="auth-title">Check your email</h1>
            <p className="auth-sub" style={{ marginBottom: 0 }}>
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and log in.
            </p>

            {resendMessage && <p className="auth-sent-msg" role="status">{resendMessage}</p>}

            <button
              type="button"
              className="auth-btn"
              style={{ marginTop: 26 }}
              onClick={handleResend}
              disabled={resendLoading}
            >
              {resendLoading ? 'Sending...' : 'Resend confirmation email'}
            </button>

            <div className="auth-alt">
              <a href="#/login" style={{ marginLeft: 0 }}>Back to login</a>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="auth">
      <AuthBrand
        title={<>Create your account.<br /><span>See where you stand.</span></>}
        text="Enter your lab values to get your NHLS score and recommendations matched to the markers that need attention."
      />

      <main className="auth-main">
        <div className="auth-card">
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join National Health League to get started.</p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="su-name">Full name</label>
              <input
                id="su-name"
                className="auth-input"
                type="text"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="su-email">Email</label>
              <input
                id="su-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="su-password">Password</label>
              <div className="auth-pw">
                <input
                  id="su-password"
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>

              <ul className="auth-reqs" aria-label="Password requirements">
                {PASSWORD_RULES.map(rule => {
                  const met = !passwordErrors.includes(rule)
                  return (
                    <li key={rule} className={`auth-req${met ? ' ok' : ''}`}>
                      <span className="auth-req-dot" aria-hidden="true">
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 6.5l2.6 2.6L10 3.5" />
                        </svg>
                      </span>
                      {rule}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="su-confirm">Confirm password</label>
              <div className="auth-pw">
                <input
                  id="su-confirm"
                  className={`auth-input${passwordsMatch ? ' is-ok' : ''}`}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {confirmPassword && (
                <p className={`auth-match ${passwordsMatch ? 'ok' : 'bad'}`} role="status">
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="su-invite">
                Organization invite code<span className="auth-opt">(optional)</span>
              </label>
              <input
                id="su-invite"
                className="auth-input mono"
                type="text"
                autoComplete="off"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC12345"
                maxLength={12}
              />
              <p className="auth-help">
                If your employer gave you a code, enter it here to join their organization anonymously.
              </p>
            </div>

            {error && <div className="auth-err" role="alert">{error}</div>}

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || !passwordValid || !passwordsMatch}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <div className="auth-alt">
            Already have an account?<a href="#/login">Log in</a>
          </div>
        </div>
      </main>
    </div>
  )
}
