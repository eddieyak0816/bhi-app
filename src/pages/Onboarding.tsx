import React from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import AuthBrand from '../components/AuthBrand'

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const { darkMode, setDarkMode } = useTheme()
  const { logout } = useAuth()

  return (
    <div className="auth">
      <AuthBrand
        title={<>Welcome.<br /><span>Let&rsquo;s get you started.</span></>}
        text="A few things worth knowing before you begin."
      />

      <main className="auth-main has-top">
        <div className="auth-top">
          <button className="auth-chip" onClick={() => logout()}>Logout</button>
          <button
            className="auth-chip icon"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
              </svg>
            )}
          </button>
        </div>

        <div className="auth-card wide">
          <h1 className="auth-title">Welcome to National Health League</h1>
          <p className="auth-sub" style={{ marginBottom: 0 }}>
            Your trusted resource for evidence-based health education. This platform provides curated educational content to help you understand your lab results.
          </p>

          <div className="auth-notice" role="note">
            <strong>Important:</strong>
            <p>This is an educational tool, not a medical diagnostic service. Always consult your healthcare provider for medical advice.</p>
          </div>

          <h2 className="auth-h2">How to use this platform</h2>
          <ol className="auth-steps">
            <li>Select your lab test from the dropdown menu (e.g., Vitamin D, Glucose)</li>
            <li>Enter your test result value (optional)</li>
            <li>Click &quot;View Resources&quot; to see relevant educational materials</li>
          </ol>

          <button onClick={onClose} className="auth-btn">Get started</button>
          <button onClick={onClose} className="auth-link-btn">Skip introduction</button>
        </div>
      </main>
    </div>
  )
}
