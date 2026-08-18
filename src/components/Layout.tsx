import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const SUPPLEMENT_LINKS = [
  { label: 'Fullscript', url: 'https://us.fullscript.com/welcome/ddilorenzo1773884970' },
  { label: 'Biote', url: 'https://patients.shopbiote.com/customer/account/create/?cid=7886&utm_campaign=0001PL&utm_source=Practitioner%20Link&utm_medium=referral' },
]

interface LayoutProps {
  children: React.ReactNode
  currentPage?: string
  onNavigate?: (page: string) => void
  onLogout?: () => void
}

const MOBILE_BREAKPOINT = 860

export function Layout({ children, currentPage = 'home', onNavigate, onLogout }: LayoutProps) {
  const { darkMode, setDarkMode, theme } = useTheme()
  const { user, logout, isAdmin } = useAuth()
  const [suppOpen, setSuppOpen] = useState(false)
  const suppRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suppRef.current && !suppRef.current.contains(e.target as Node)) {
        setSuppOpen(false)
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Track viewport width to switch between desktop nav and mobile hamburger menu
  useEffect(() => {
    function handleResize() {
      const nowMobile = window.innerWidth <= MOBILE_BREAKPOINT
      setIsMobile(nowMobile)
      if (!nowMobile) setMobileMenuOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'library', label: 'Library' },
    { id: 'categories', label: 'Categories' },
    { id: 'labs', label: 'Lab Results' },
    { id: 'leagues', label: 'Leagues' },
    { id: 'profile', label: 'Profile' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  const handleLogout = async () => {
    await logout()
    onLogout?.()
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      {/* Header */}
      <header
        style={{
          background: theme.bgSecondary,
          borderBottom: `1.5px solid ${theme.borderColor}`,
          padding: isMobile ? '12px 16px' : '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 32 }}>
          {isMobile ? (
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              style={{
                background: 'none',
                border: `1.5px solid ${theme.borderColor}`,
                borderRadius: 6,
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 18,
                color: theme.text,
                flexShrink: 0,
              }}
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          ) : null}
          <h1
            style={{
              margin: 0,
              fontSize: isMobile ? 14 : 15,
              fontWeight: 700,
              color: theme.text,
              lineHeight: 1.2,
              whiteSpace: isMobile ? 'nowrap' : 'normal',
            }}
          >
            {isMobile ? 'National Health League' : (<>National<br />Health League</>)}
          </h1>
          {!isMobile && (
          <nav style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: (currentPage === item.id || (item.id === 'leagues' && currentPage.startsWith('league'))) ? theme.blue : theme.text,
                  fontSize: 14,
                  fontWeight: (currentPage === item.id || (item.id === 'leagues' && currentPage.startsWith('league'))) ? 600 : 500,
                  cursor: 'pointer',
                  padding: 0,
                  borderBottom: (currentPage === item.id || (item.id === 'leagues' && currentPage.startsWith('league'))) ? `2px solid ${theme.blue}` : 'none',
                  paddingBottom: (currentPage === item.id || (item.id === 'leagues' && currentPage.startsWith('league'))) ? 2 : 0,
                }}
              >
                {item.label}
              </button>
            ))}

            {/* MyDirectives link */}
            <a
              href="https://www.mydirectives.com"
              target="_blank"
              rel="noreferrer"
              style={{
                color: theme.text,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              My Directives
            </a>

            {/* Supplements dropdown */}
            <div ref={suppRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setSuppOpen(o => !o)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                25% Off Supplements {suppOpen ? '▲' : '▼'}
              </button>
              {suppOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: 8,
                    background: theme.bgSecondary,
                    border: `1.5px solid ${theme.borderColor}`,
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 200,
                    minWidth: 160,
                    overflow: 'hidden',
                  }}
                >
                  {SUPPLEMENT_LINKS.map(link => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSuppOpen(false)}
                      style={{
                        display: 'block',
                        padding: '10px 16px',
                        fontSize: 14,
                        color: theme.text,
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = theme.bg)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>
          )}
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
          {user && !isMobile && (
            <div style={{ fontSize: 12, color: theme.textMuted, marginRight: 8 }}>
              {user.name}
            </div>
          )}
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
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              background: theme.bgSecondary,
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 6,
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: 14,
              color: theme.text,
              fontWeight: 500,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Mobile menu panel */}
      {isMobile && mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          style={{
            background: theme.bgSecondary,
            borderBottom: `1.5px solid ${theme.borderColor}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            position: 'sticky',
            top: 61,
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 16px 16px',
          }}
        >
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate?.(item.id); setMobileMenuOpen(false) }}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: `1px solid ${theme.borderColor}`,
                textAlign: 'left',
                color: (currentPage === item.id || (item.id === 'leagues' && currentPage.startsWith('league'))) ? theme.blue : theme.text,
                fontSize: 15,
                fontWeight: (currentPage === item.id || (item.id === 'leagues' && currentPage.startsWith('league'))) ? 600 : 500,
                cursor: 'pointer',
                padding: '12px 4px',
              }}
            >
              {item.label}
            </button>
          ))}

          <a
            href="https://www.mydirectives.com"
            target="_blank"
            rel="noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
              borderBottom: `1px solid ${theme.borderColor}`,
              padding: '12px 4px',
            }}
          >
            My Directives
          </a>

          <div>
            <button
              onClick={() => setSuppOpen(o => !o)}
              style={{
                background: 'none',
                border: 'none',
                textAlign: 'left',
                color: theme.text,
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '12px 4px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              25% Off Supplements {suppOpen ? '▲' : '▼'}
            </button>
            {suppOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: 12 }}>
                {SUPPLEMENT_LINKS.map(link => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { setSuppOpen(false); setMobileMenuOpen(false) }}
                    style={{
                      padding: '10px 4px',
                      fontSize: 14,
                      color: theme.text,
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {user && (
            <div style={{ fontSize: 13, color: theme.textMuted, padding: '12px 4px 0' }}>
              {user.name}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}
