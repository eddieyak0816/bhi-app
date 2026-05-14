import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useEvaluation } from '../context/EvaluationContext'
import { useResults } from '../context/ResultsContext'
import { supabase } from '../lib/supabase'

interface PublicProfilePageProps {
  onNavigate?: (page: string) => void
}

function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function PublicProfilePage({ onNavigate }: PublicProfilePageProps) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { bhasResult, applicableTags } = useEvaluation()
  const { latestLabDate } = useResults()

  const [isPublic, setIsPublic] = useState<boolean | null>(null)
  const [publicId, setPublicId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('is_public, public_id')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setIsPublic(data?.is_public ?? false)
        setPublicId(data?.public_id ?? null)
      })
  }, [user?.id])

  const scoreColor =
    bhasResult && bhasResult.percentage >= 80
      ? '#10B981'
      : bhasResult && bhasResult.percentage >= 50
      ? '#D97706'
      : '#EF4444'

  if (isPublic === null) {
    return <div style={{ color: theme.textMuted, padding: 32 }}>Loading…</div>
  }

  return (
    <div style={{ width: '100%', maxWidth: 580 }}>
      {/* Developer decision-needed banner */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1.5px solid #EF4444',
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 24,
        }}
      >
        <div style={{ fontWeight: 700, color: '#EF4444', marginBottom: 4 }}>
          DECISION NEEDED (Developer)
        </div>
        <div style={{ fontSize: 13, color: theme.text, lineHeight: 1.5 }}>
          Who should be able to view this public profile?
          <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
            <li>Anyone with a link (no login required)</li>
            <li>Logged-in BHI users only</li>
          </ul>
          Implement access rules and a per-user public URL (e.g. <code>/u/{publicId ?? 'NHL-XXXX-XXXX'}</code>) before enabling this in production.
        </div>
      </div>

      {!isPublic ? (
        /* Private state */
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700 }}>Profile is Private</h3>
          <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 24 }}>
            Your profile is not currently visible to others. Enable it on the Privacy page to share your health score.
          </p>
          <button
            onClick={() => onNavigate?.('consent')}
            style={{
              background: theme.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Privacy Settings
          </button>
        </div>
      ) : (
        /* Public profile card */
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 10,
            padding: 28,
          }}
        >
          {/* Public ID — shown instead of real name */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {publicId ?? '—'}
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted }}>
              National Health League Member · De-identified public ID
            </div>
          </div>

          {/* NHLS Score */}
          {bhasResult && bhasResult.maxPossible > 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24,
                padding: '16px 20px',
                background: theme.bg,
                borderRadius: 8,
                border: `1.5px solid ${theme.borderColor}`,
              }}
            >
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  color: scoreColor,
                  lineHeight: 1,
                  minWidth: 72,
                  textAlign: 'center',
                }}
              >
                {bhasResult.percentage}%
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>NHLS Score</div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                  Last updated: {formatMonthYear(latestLabDate)}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: theme.textMuted, fontSize: 14, marginBottom: 24 }}>
              No health score available yet.
            </div>
          )}

          {/* Health tags */}
          {applicableTags.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Health Insights
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {applicableTags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 20,
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: theme.blue,
                      border: `1px solid rgba(59, 130, 246, 0.2)`,
                    }}
                  >
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <button
          onClick={() => onNavigate?.('consent')}
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
          Privacy Settings
        </button>
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
          Profile Settings
        </button>
      </div>
    </div>
  )
}
