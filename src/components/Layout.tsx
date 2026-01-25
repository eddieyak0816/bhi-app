import React from 'react'
import { useTheme } from '../context/ThemeContext'

interface LayoutProps {
  children: React.ReactNode
  currentPage?: string
  onNavigate?: (page: string) => void
}

export function Layout({ children, currentPage = 'home', onNavigate }: LayoutProps) {
  const { darkMode, setDarkMode, theme } = useTheme()

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'resources', label: 'Resources' },
    { id: 'labs', label: 'Lab Results' },
    { id: 'profile', label: 'Profile' },
    { id: 'admin', label: 'Admin' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      {/* Header */}
      <header
        style={{
          background: theme.bgSecondary,
          borderBottom: `1.5px solid ${theme.borderColor}`,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: theme.text }}>BHI</h1>
          <nav style={{ display: 'flex', gap: 24 }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentPage === item.id ? theme.blue : theme.text,
                  fontSize: 14,
                  fontWeight: currentPage === item.id ? 600 : 500,
                  cursor: 'pointer',
                  padding: 0,
                  borderBottom: currentPage === item.id ? `2px solid ${theme.blue}` : 'none',
                  paddingBottom: currentPage === item.id ? 2 : 0,
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            style={{
              background: theme.bgSecondary,
              border: `1.5px solid ${theme.borderColor}`,
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
      </header>

      {/* Main content */}
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}
