import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

interface Provider {
  id: string
  name: string
  title: string | null
  specialty: string | null
  brief_bio: string
  full_bio: string | null
  link_url: string | null
  image_url: string | null
}

export default function VirtualProviderCards() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [providers, setProviders] = useState<Provider[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  useEffect(() => {
    if (!user?.id) return
    fetch(apiUrl('/api/providers'), { headers: { 'x-user-id': user.id } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(body => { setProviders(body.providers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user?.id])

  if (loading || providers.length === 0) return null

  return (
    <div style={{ marginTop: 32, marginBottom: 32 }}>
      <h3 style={{ margin: '0 0 14px 0', fontSize: 16, fontWeight: 700, color: theme.text }}>
        Virtual Providers
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {providers.map(p => {
          const isExpanded = expanded === p.id
          return (
            <div
              key={p.id}
              style={{
                background: theme.card,
                border: `1px solid ${theme.borderColor}`,
                borderRadius: 10,
                padding: '16px 18px',
                cursor: p.full_bio || p.link_url ? 'pointer' : 'default',
                transition: 'box-shadow 0.15s',
              }}
              onClick={() => setExpanded(isExpanded ? null : p.id)}
            >
              {/* Header row */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name}
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: theme.bgSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: theme.textMuted }}>
                    {p.name.charAt(0)}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: theme.text }}>{p.name}</div>
                  {p.title && <div style={{ fontSize: 12, color: theme.textMuted }}>{p.title}</div>}
                  {p.specialty && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      <span style={{ background: theme.bgSecondary, color: theme.textMuted, padding: '1px 6px', borderRadius: 4 }}>{p.specialty}</span>
                    </div>
                  )}
                </div>
                {(p.full_bio || p.link_url) && (
                  <span style={{ fontSize: 12, color: theme.blue ?? '#3B82F6', flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                )}
              </div>

              {/* Brief bio — always visible */}
              <p style={{ margin: '10px 0 0 0', fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
                {p.brief_bio}
              </p>

              {/* Expanded section */}
              {isExpanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${theme.borderColor}` }}>
                  {p.full_bio && (
                    <p style={{ margin: '0 0 10px 0', fontSize: 13, color: theme.text, lineHeight: 1.6 }}>
                      {p.full_bio}
                    </p>
                  )}
                  {p.link_url && (
                    <a
                      href={p.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'inline-block', background: theme.blue ?? '#3B82F6', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                    >
                      Book / Connect →
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
