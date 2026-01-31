import React from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const { darkMode, setDarkMode, theme } = useTheme()
  const { logout } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, padding: 24 }}>
      {/* Dark mode toggle in top right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => logout()}
          style={{
            background: theme.bgSecondary,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 14,
            color: theme.text,
          }}
        >
          Logout
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          style={{
            background: theme.bgSecondary,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 16,
            color: theme.text,
          }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="card onboarding">
        <h2 style={{ color: theme.text }}>Welcome to Balanced Health Institute</h2>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: theme.textMuted, marginTop: 8 }}>
          Your trusted resource for evidence-based health education. This platform provides curated educational content to help you understand your lab results.
        </p>

        <div
          style={{
            background: darkMode ? 'rgba(180, 83, 9, 0.15)' : '#FFF7ED',
            padding: 16,
            borderRadius: 6,
            marginTop: 20,
            marginBottom: 20,
            borderLeft: '3px solid #B45309',
          }}
        >
          <strong style={{ fontSize: 14, color: darkMode ? '#FBBF24' : '#92400E' }}>Important:</strong>
          <p style={{ margin: '6px 0 0 0', fontSize: 14, color: theme.textMuted }}>
            This is an educational tool, not a medical diagnostic service. Always consult your healthcare provider for medical advice.
          </p>
        </div>

        <h3 style={{ fontSize: 18, marginTop: 24, marginBottom: 12, color: theme.text }}>How to Use This Platform</h3>
        <ol style={{ fontSize: 15, lineHeight: 1.8, color: theme.text }}>
          <li>Select your lab test from the dropdown menu (e.g., Vitamin D, Glucose)</li>
          <li>Enter your test result value (optional)</li>
          <li>Click "View Resources" to see relevant educational materials</li>
        </ol>

        <div className="actions">
          <button onClick={onClose} className="btn-primary">
            Get Started
          </button>
          <button onClick={onClose} className="btn-ghost" style={{ color: theme.text, borderColor: theme.borderColor }}>
            Skip Introduction
          </button>
        </div>
      </div>
    </div>
  )
}
