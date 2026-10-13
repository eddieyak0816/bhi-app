import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { getStoredJwt } from '../lib/supabase'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string || ''
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string || ''

interface NavLinkItem {
  label: string
  url: string
}

interface NavLinkGroup {
  name: string
  links: NavLinkItem[]
}

interface LayoutProps {
  children: React.ReactNode
  currentPage?: string
  onNavigate?: (page: string) => void
  onLogout?: () => void
}

// Below this width the nav collapses to a hamburger sheet. Raised from 860 when the header was
// redesigned: with eleven links the pill bar needs ~1150px before it starts to crowd.
const MOBILE_BREAKPOINT = 1180
// From here up there is room to show My Directives and the admin-managed dropdown groups inline.
// Between the two, they live together under a single "More" menu instead.
const WIDE_BREAKPOINT = 1680
// Admin can add dropdown groups at will; more than this many won't fit inline even on a wide
// screen, so they fold into "More" rather than overflowing the bar.
const MAX_INLINE_GROUPS = 3
const MORE_KEY = '__more__'

type Tier = 'mobile' | 'compact' | 'wide'
function tierForWidth(w: number): Tier {
  return w <= MOBILE_BREAKPOINT ? 'mobile' : w < WIDE_BREAKPOINT ? 'compact' : 'wide'
}

function Chevron() {
  return (
    <svg className="hd-chev" width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Layout({ children, currentPage = 'home', onNavigate, onLogout }: LayoutProps) {
  const { darkMode, setDarkMode, theme } = useTheme()
  const { user, logout, isAdmin } = useAuth()
  // Which nav dropdown (by group name, or MORE_KEY) is currently open — only one at a time.
  const [openGroupName, setOpenGroupName] = useState<string | null>(null)
  const groupsRef = useRef<HTMLDivElement>(null)
  const [navGroups, setNavGroups] = useState<NavLinkGroup[]>([])

  // Pull nav dropdown menus + links from the admin-managed nav_links table (Admin → Nav Links),
  // instead of a hardcoded list — so adding/removing a link, or even a whole new dropdown menu,
  // no longer needs a code change. Grouped client-side by group_label: each distinct group_label
  // becomes its own dropdown button, and a group only shows once it has ≥1 active link.
  // Direct REST fetch (not the Supabase client) since Layout renders on every page and we
  // don't want to risk the getSession() deadlock we already hit elsewhere in Admin.
  useEffect(() => {
    if (!SUPABASE_URL) return
    const jwt = getStoredJwt()
    fetch(`${SUPABASE_URL}/rest/v1/nav_links?select=label,url,group_label&is_active=eq.true&order=sort_order.asc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${jwt || SUPABASE_ANON_KEY}`,
      },
    })
      .then(res => res.ok ? res.json() : [])
      .then(rows => {
        const groups: NavLinkGroup[] = []
        for (const r of (rows || [])) {
          let g = groups.find(g => g.name === r.group_label)
          if (!g) { g = { name: r.group_label, links: [] }; groups.push(g) }
          g.links.push({ label: r.label, url: r.url })
        }
        setNavGroups(groups)
      })
      .catch(() => setNavGroups([]))
  }, [])

  const [tier, setTier] = useState<Tier>(() => typeof window !== 'undefined' ? tierForWidth(window.innerWidth) : 'wide')
  const isMobile = tier === 'mobile'
  const inlineExternal = tier === 'wide' && navGroups.length <= MAX_INLINE_GROUPS
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close dropdowns when clicking outside the desktop nav
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (groupsRef.current && !groupsRef.current.contains(e.target as Node)) {
        setOpenGroupName(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Track viewport width to pick the nav layout (hamburger / "More" / everything inline)
  useEffect(() => {
    function handleResize() {
      const next = tierForWidth(window.innerWidth)
      setTier(next)
      if (next !== 'mobile') setMobileMenuOpen(false)
      setOpenGroupName(null)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // While the mobile sheet is open: Esc closes it, and the page behind doesn't scroll.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [mobileMenuOpen])

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'library', label: 'Library' },
    { id: 'categories', label: 'Categories' },
    { id: 'labs', label: 'Lab Results' },
    { id: 'leagues', label: 'Leagues' },
    { id: 'profile', label: 'Profile' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin' }] : []),
  ]

  const isActive = (id: string) => currentPage === id || (id === 'leagues' && currentPage.startsWith('league'))

  const handleLogout = async () => {
    await logout()
    onLogout?.()
  }

  const initials = (() => {
    const fromName = (user?.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('')
    return (fromName || (user?.email || '?')[0]).toUpperCase()
  })()

  const themeToggle = (
    <button
      className="hd-icon"
      onClick={() => setDarkMode(!darkMode)}
      title={darkMode ? 'Light mode' : 'Dark mode'}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  )

  // Only the header's copy is the page <h1>; the sheet's repeat is a plain div.
  const renderLogo = (asHeading: boolean) => {
    const inner = (
      <>
        <span className="hd-mark"><i /></span>
        <span className="hd-logo-t">National<br />Health League</span>
      </>
    )
    return asHeading ? <h1 className="hd-logo">{inner}</h1> : <div className="hd-logo">{inner}</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
      <header className="hd">
        <div className="hd-in">
          {renderLogo(true)}

          {!isMobile && (
            <div className="hd-navwrap" ref={groupsRef}>
              {/* In-app pages */}
              <nav className="hd-nav" aria-label="Main">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    className={`hd-pill${isActive(item.id) ? ' on' : ''}`}
                    onClick={() => onNavigate?.(item.id)}
                    aria-current={isActive(item.id) ? 'page' : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* External links: My Directives + the admin-managed dropdown groups (Admin → Nav Links) */}
              {inlineExternal ? (
                <div className="hd-nav">
                  <a className="hd-pill" href="https://www.mydirectives.com" target="_blank" rel="noreferrer">My Directives</a>
                  {navGroups.map(group => (
                    <div key={group.name} className="hd-drop">
                      <button
                        className="hd-pill"
                        onClick={() => setOpenGroupName(n => n === group.name ? null : group.name)}
                        aria-haspopup="true"
                        aria-expanded={openGroupName === group.name}
                      >
                        {group.name} <Chevron />
                      </button>
                      {openGroupName === group.name && (
                        <div className="hd-menu">
                          {group.links.map(link => (
                            <a
                              key={link.label}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setOpenGroupName(null)}
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="hd-nav">
                  <div className="hd-drop">
                    <button
                      className="hd-pill"
                      onClick={() => setOpenGroupName(n => n === MORE_KEY ? null : MORE_KEY)}
                      aria-haspopup="true"
                      aria-expanded={openGroupName === MORE_KEY}
                    >
                      More <Chevron />
                    </button>
                    {openGroupName === MORE_KEY && (
                      <div className="hd-menu right">
                        <a href="https://www.mydirectives.com" target="_blank" rel="noreferrer" onClick={() => setOpenGroupName(null)}>
                          My Directives
                        </a>
                        {navGroups.map(group => (
                          <React.Fragment key={group.name}>
                            <div className="hd-menu-sep" />
                            <div className="hd-menu-h">{group.name}</div>
                            {group.links.map(link => (
                              <a
                                key={link.label}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpenGroupName(null)}
                              >
                                {link.label}
                              </a>
                            ))}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="hd-spacer" />

          <div className="hd-right">
            {!isMobile && themeToggle}
            {user && <div className="hd-avatar" title={user.name || user.email}>{initials}</div>}
            {!isMobile && (
              <button className="hd-logout" onClick={handleLogout} title="Logout">Logout</button>
            )}
            {isMobile && (
              <button
                className="hd-icon hd-burger"
                onClick={() => setMobileMenuOpen(o => !o)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile menu sheet — a sibling of <header>, not a child: the header's backdrop-filter
          would otherwise make it the containing block for these position:fixed elements. */}
      {isMobile && (
        <>
          <div className={`hd-scrim${mobileMenuOpen ? ' open' : ''}`} onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
          <div
            className={`hd-sheet${mobileMenuOpen ? ' open' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            aria-hidden={!mobileMenuOpen}
          >
            <div className="hd-sheet-top">
              {renderLogo(false)}
              <button className="hd-icon" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <path d="M1 1l15 15M16 1L1 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {user && <div className="hd-who">Signed in as <b>{user.name || user.email}</b></div>}

            {navItems.map(item => (
              <button
                key={item.id}
                className={`hd-row${isActive(item.id) ? ' on' : ''}`}
                onClick={() => { onNavigate?.(item.id); setMobileMenuOpen(false) }}
              >
                {item.label}
              </button>
            ))}

            <a
              className="hd-row"
              href="https://www.mydirectives.com"
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileMenuOpen(false)}
            >
              My Directives
            </a>

            {navGroups.map(group => (
              <div key={group.name}>
                <button
                  className="hd-row"
                  onClick={() => setOpenGroupName(n => n === group.name ? null : group.name)}
                  aria-expanded={openGroupName === group.name}
                >
                  {group.name} <Chevron />
                </button>
                {openGroupName === group.name && group.links.map(link => (
                  <a
                    key={link.label}
                    className="hd-sub"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => { setOpenGroupName(null); setMobileMenuOpen(false) }}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}

            <div className="hd-sheet-foot">
              {themeToggle}
              <button className="hd-logout" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  )
}
