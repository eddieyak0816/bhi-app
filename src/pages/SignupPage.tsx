import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function SignupPage() {
  const { signup } = useAuth()
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
      const result = await signup(email, name, password)
      if (!result.success) {
        setError(result.error || 'Signup failed')
      }
      // On success, AuthContext will update and router will redirect
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.bg,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: theme.card,
          border: `1.5px solid ${theme.borderColor}`,
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: theme.text, margin: 0 }}>
            Create Account
          </h1>
          <p style={{ color: theme.textMuted, margin: '8px 0 0 0', fontSize: '14px' }}>
            Join BHI to get started
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1.5px solid ${theme.borderColor}`,
                borderRadius: '6px',
                fontSize: '14px',
                background: theme.bg,
                color: theme.text,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1.5px solid ${theme.borderColor}`,
                borderRadius: '6px',
                fontSize: '14px',
                background: theme.bg,
                color: theme.text,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1.5px solid ${theme.borderColor}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: theme.bg,
                  color: theme.text,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: theme.textMuted,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <div style={{ fontSize: '12px', color: theme.textMuted }}>
              <p style={{ margin: '0 0 6px 0', fontWeight: 500 }}>Requirements:</p>
              {passwordErrors.map((err, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ marginRight: '6px' }}>{passwordValid ? '✓' : '○'}</span>
                  {err}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Confirm Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: `1.5px solid ${passwordsMatch ? '#10b981' : theme.borderColor}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  background: theme.bg,
                  color: theme.text,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: theme.textMuted,
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPassword && (
              <p style={{ fontSize: '12px', margin: '6px 0 0 0', color: passwordsMatch ? '#10b981' : '#ef4444' }}>
                {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid #FCA5A5',
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '16px',
                color: '#DC2626',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !passwordValid || !passwordsMatch}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: (loading || !passwordValid || !passwordsMatch) ? '#999' : '#3B82F6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (loading || !passwordValid || !passwordsMatch) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: `1px solid ${theme.borderColor}`, paddingTop: '24px' }}>
          <p style={{ color: theme.textMuted, margin: 0, fontSize: '14px' }}>
            Already have an account?{' '}
            <a
              href="#/login"
              style={{
                color: '#3B82F6',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
