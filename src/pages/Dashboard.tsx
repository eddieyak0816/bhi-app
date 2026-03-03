import React from 'react'
import { useTheme } from '../context/ThemeContext'
import { useEvaluation } from '../context/EvaluationContext'
import { useResults } from '../context/ResultsContext'
import StaleLabBanner from '../components/StaleLabBanner'

interface DashboardProps {
  userEmail?: string
  userName?: string
  recentResources?: Array<{ title: string; type: string }>
  bookmarkedCount?: number
  onNavigate?: (page: string) => void
}

export default function Dashboard({ userEmail = '', userName = '', recentResources = [], bookmarkedCount = 0, onNavigate }: DashboardProps) {
  const { theme } = useTheme()
  const { applicableTags, recommendedResources, bhasResult, loading, error } = useEvaluation()
  const { results, latestLabDate } = useResults()

  // Get first name from full name
  const firstName = userName?.split(' ')[0] || ''

  const statCard = (label: string, value: string | number, icon: string) => (
    <div
      style={{
        background: theme.card,
        border: `1.5px solid ${theme.borderColor}`,
        borderRadius: 8,
        padding: 16,
        flex: 1,
        minWidth: 200,
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>{value}</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Welcome back{firstName ? `, ${firstName}` : ''}</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>{userEmail}</p>
      </div>

      <StaleLabBanner latestLabDate={latestLabDate} onNavigate={onNavigate} />

      {/* Stats Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {statCard('Bookmarked Resources', bookmarkedCount, '🔖')}
        {statCard('Lab Results', results.length, '⚗️')}
        {statCard('Health Insights', applicableTags.length, '💡')}
        {statCard('Recommendations', recommendedResources.length, '📚')}
      </div>

      {/* BHAS Score Banner */}
      {bhasResult && bhasResult.maxPossible > 0 && (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 10,
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          {/* Score ring */}
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: bhasResult.percentage >= 80 ? '#10B981' : bhasResult.percentage >= 50 ? '#D97706' : '#EF4444',
                lineHeight: 1,
              }}
            >
              {bhasResult.percentage}%
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              BHAS Score
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 48, background: theme.borderColor, flexShrink: 0 }} />

          {/* Per-marker breakdown */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: theme.text }}>
              Balanced Health Assessment — {bhasResult.totalScore.toFixed(1)} / {bhasResult.maxPossible} points
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bhasResult.markerScores.map(m => (
                <span
                  key={m.markerName}
                  title={m.tag || 'No matching rule'}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 20,
                    background:
                      m.score === 1   ? 'rgba(16, 185, 129, 0.12)' :
                      m.score === 0.5 ? 'rgba(245, 158, 11, 0.12)' :
                                        'rgba(239, 68, 68, 0.12)',
                    color:
                      m.score === 1   ? '#10B981' :
                      m.score === 0.5 ? '#D97706' :
                                        '#EF4444',
                  }}
                >
                  {m.markerName} · {m.score === 1 ? '✓' : m.score === 0.5 ? '~' : '✗'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Personalized Recommendations - NEW */}
      {results.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 8, fontSize: 20, fontWeight: 600 }}>Personalized for You</h3>
          <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
            Based on {applicableTags.length} health insight{applicableTags.length !== 1 ? 's' : ''}: {applicableTags.join(', ') || 'Analyzing your results...'}
          </p>

          {loading && (
            <div style={{ textAlign: 'center', color: theme.textMuted, padding: 32 }}>
              Loading personalized recommendations...
            </div>
          )}

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid #FCA5A5',
                borderRadius: 8,
                padding: 16,
                color: '#DC2626',
                marginBottom: 24,
              }}
            >
              Error loading recommendations: {error}
            </div>
          )}

          {recommendedResources.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 12,
              }}
            >
              {recommendedResources.slice(0, 3).map(resource => (
                <div
                  key={resource.id}
                  style={{
                    background: theme.card,
                    border: `1.5px solid ${theme.borderColor}`,
                    borderRadius: 8,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = theme.blue
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = theme.borderColor
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                    📌 Recommended
                  </div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{resource.type}</div>
                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>{resource.title}</div>
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
                    {resource.tags.join(', ')}
                  </div>
                  <button
                    style={{
                      background: theme.blue,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    View Resource
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: theme.card,
                border: `1.5px solid ${theme.borderColor}`,
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                color: theme.textMuted,
              }}
            >
              <p style={{ margin: 0 }}>No recommendations yet. Log more lab results to get personalized suggestions!</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Resources */}
      {!results.length && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Recently Viewed</h3>
          {recentResources.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 12,
              }}
            >
              {recentResources.map(resource => (
                <div
                  key={resource.title}
                  style={{
                    background: theme.card,
                    border: `1.5px solid ${theme.borderColor}`,
                    borderRadius: 8,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = theme.blue
                    ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.borderColor = theme.borderColor
                    ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                  }}
                >
                  <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>{resource.type}</div>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>{resource.title}</div>
                  <button
                    style={{
                      background: theme.blue,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Continue Reading
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: theme.card,
                border: `1.5px solid ${theme.borderColor}`,
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                color: theme.textMuted,
              }}
            >
              <p style={{ margin: 0 }}>No resources viewed yet. Start exploring!</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <button
            style={{
              background: theme.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => onNavigate?.('labs')}
          >
            📊 Log Lab Results
          </button>
          <button
            style={{
              background: theme.card,
              color: theme.text,
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => onNavigate?.('library')}
          >
            🔍 Browse Library
          </button>
          <button
            style={{
              background: theme.card,
              color: theme.text,
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => onNavigate?.('profile')}
          >
            ⚙️ Edit Profile
          </button>
        </div>
      </div>
    </div>
  )
}
