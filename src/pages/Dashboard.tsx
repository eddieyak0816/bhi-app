import React, { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useEvaluation } from '../context/EvaluationContext'
import { useResults } from '../context/ResultsContext'
import { useAuth } from '../context/AuthContext'
import StaleLabBanner from '../components/StaleLabBanner'
import HealthReportModal from '../components/HealthReportModal'
import HealthAssessmentModal from '../components/HealthAssessmentModal'
import AffiliateProductCards from '../components/AffiliateProductCards'
import VirtualProviderCards from '../components/VirtualProviderCards'
import MyTeamCard from '../components/MyTeamCard'
import ChallengesSection from '../components/ChallengesSection'
import { calculateBhasV2Score, type BhasV2Result, type BhasV2Profile } from '../utils/bhasV2'
import { supabase } from '../lib/supabase'
import { getBenchmark } from '../utils/nationalBenchmarks'

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
  const { user } = useAuth()

  // Get first name from full name
  const firstName = userName?.split(' ')[0] || ''

  const [showHealthReport, setShowHealthReport] = useState(false)
  const [showHealthAssessment, setShowHealthAssessment] = useState(false)
  const [publicId, setPublicId] = useState<string | null>(null)
  const [showBenchmarks, setShowBenchmarks] = useState(false)

  const nhlsRef = useRef<HTMLDivElement>(null)
  const resourcesRef = useRef<HTMLDivElement>(null)
  const recommendationsRef = useRef<HTMLDivElement>(null)

  const [categoryPreferences, setCategoryPreferences] = useState<string[]>([])
  const [durationFilter, setDurationFilter] = useState<'all' | 'short' | 'long'>('all')

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('user_category_preferences')
      .select('category_name')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setCategoryPreferences(data.map((r: { category_name: string }) => r.category_name))
      })
  }, [user?.id])

  // F22 — fetch public_id once for use in health report
  useEffect(() => {
    if (!user?.id) return
    supabase.from('profiles').select('public_id').eq('id', user.id).single()
      .then(({ data }) => { if (data?.public_id) setPublicId(data.public_id) })
  }, [user?.id])

  // BHAS v2.3 — load profile fields and compute score
  const [bhasV2Result, setBhasV2Result] = useState<BhasV2Result | null>(() => {
    // Seed from sessionStorage so the panel is visible immediately on remount
    // while the async profile fetch runs in the background.
    try {
      const cached = sessionStorage.getItem('nhl-bhas-v23-result')
      return cached ? JSON.parse(cached) : null
    } catch { return null }
  })

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    supabase
      .from('profiles')
      .select('sex, height_cm, weight_kg, waist_circumference, waist_unit, grip_strength, is_type1_diabetes, total_daily_insulin_units, has_advanced_care_plan, acute_visits')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data || cancelled) return

        // Convert waist to cm if stored in inches
        let waistCm: number | null = null
        if (data.waist_circumference != null) {
          waistCm = data.waist_unit === 'in'
            ? data.waist_circumference * 2.54
            : data.waist_circumference
        }

        const profile: BhasV2Profile = {
          sex: data.sex || '',
          heightCm: data.height_cm ?? null,
          waistCm,
          weightKg: data.weight_kg ?? null,
          gripStrengthKg: data.grip_strength ?? null,
          isType1Diabetes: data.is_type1_diabetes ?? false,
          totalDailyInsulinUnits: data.total_daily_insulin_units ?? null,
          hasAdvancedCarePlan: data.has_advanced_care_plan ?? false,
          acuteVisits: data.acute_visits ?? null,
        }

        const v2 = calculateBhasV2Score(
          results.map(r => ({ markerName: r.markerName, value: r.value, date: r.date })),
          profile
        )
        setBhasV2Result(v2)
        // Cache so the panel reappears instantly on next remount
        try { sessionStorage.setItem('nhl-bhas-v23-result', JSON.stringify(v2)) } catch {}

        // F43: Persist derived values for analytics / leaderboard
        if (v2.hasEnoughData) {
          const today = new Date().toISOString().slice(0, 10)
          supabase.from('bhas_v2_scores').upsert(
            {
              user_id:               user.id,
              score_date:            today,
              scored_at:             new Date().toISOString(),
              total_score:           v2.totalScore,
              label:                 v2.label,
              homa_ir:               v2.derived.homaIr,
              tg_hdl_ratio:          v2.derived.tgHdlRatio,
              grip_ratio:            v2.derived.gripRatio,
              wthr:                  v2.derived.wthr,
              insulin_units_per_kg:  v2.derived.insulinUnitsPerKg,
              vo2_max_percentile:    v2.biometrics.vo2MaxPercentile,
              hs_crp:                v2.tieBreaker.hsCrp,
              acute_visits:          v2.tieBreaker.acuteVisits,
              metric_scores:         v2.metricScores,
            },
            { onConflict: 'user_id,score_date' }
          ).then(({ error }) => {
            if (error) console.error('F43: failed to persist BHAS v2 score', error)
          })
        }
      })
    return () => { cancelled = true }
  }, [user?.id, results])

  const statCard = (label: string, value: string | number, icon: string, onClick?: () => void) => (
    <div
      onClick={onClick}
      style={{
        background: theme.card,
        border: `1.5px solid ${theme.borderColor}`,
        borderRadius: 8,
        padding: '10px 14px',
        flex: 1,
        minWidth: 140,
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: theme.textMuted }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>{value}</div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Welcome back{firstName ? `, ${firstName}` : ''}</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>{userEmail}</p>
      </div>

      <StaleLabBanner latestLabDate={latestLabDate} onNavigate={onNavigate} />

      {/* NHLS Score Panel — shown only when enough data exists */}
      {bhasV2Result && bhasV2Result.hasEnoughData && (
        <div
          ref={nhlsRef}
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 10,
            padding: '20px 24px',
            marginBottom: 32,
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{
                fontSize: 36,
                fontWeight: 800,
                lineHeight: 1,
                color: bhasV2Result.label === 'Optimal' ? '#10B981'
                     : bhasV2Result.label === 'Healthy' ? '#3B82F6'
                     : bhasV2Result.label === 'Needs Improvement' ? '#D97706'
                     : '#EF4444',
              }}>
                {bhasV2Result.totalScore.toFixed(1)}
              </div>
              <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                / 8.0
              </div>
            </div>

            <div style={{ width: 1, height: 48, background: theme.borderColor, flexShrink: 0 }} />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>NHLS</div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 20,
                  background: bhasV2Result.label === 'Optimal' ? 'rgba(16,185,129,0.12)'
                             : bhasV2Result.label === 'Healthy' ? 'rgba(59,130,246,0.12)'
                             : bhasV2Result.label === 'Needs Improvement' ? 'rgba(245,158,11,0.12)'
                             : 'rgba(239,68,68,0.12)',
                  color: bhasV2Result.label === 'Optimal' ? '#10B981'
                       : bhasV2Result.label === 'Healthy' ? '#3B82F6'
                       : bhasV2Result.label === 'Needs Improvement' ? '#D97706'
                       : '#EF4444',
                }}>
                  {bhasV2Result.label}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.textMuted }}>
                {bhasV2Result.metricScores.length} of 8 metrics scored · uses derived ratios ({' '}
                <a
                  href="https://en.wikipedia.org/wiki/Homeostatic_model_assessment"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: theme.textMuted, textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                >
                  HOMA-IR
                </a>
                , TG/HDL, WtHR)
              </div>
            </div>
          </div>

          {/* Per-metric breakdown */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: bhasV2Result.missingInputs.length > 0 ? 12 : 0 }}>
            {bhasV2Result.metricScores.map(m => {
              const chipStyle = {
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 20,
                background: m.score === 1   ? 'rgba(16,185,129,0.12)'
                           : m.score === 0.5 ? 'rgba(245,158,11,0.12)'
                           :                   'rgba(239,68,68,0.12)',
                color: m.score === 1   ? '#10B981'
                     : m.score === 0.5 ? '#D97706'
                     :                  '#EF4444',
                cursor: 'default' as const,
              }
              const label = `${m.metric} · ${m.score === 1 ? '✓' : m.score === 0.5 ? '~' : '✗'}`
              return (
                <span key={m.metric} title={m.derived} style={chipStyle}>
                  {label}
                </span>
              )
            })}
          </div>

          {/* Missing inputs hint */}
          {bhasV2Result.missingInputs.length > 0 && (
            <div style={{ fontSize: 12, color: theme.textMuted, borderTop: `1px solid ${theme.borderColor}`, paddingTop: 10 }}>
              <strong>To complete your v2.3 score, add:</strong>{' '}
              {bhasV2Result.missingInputs.map((input, i) => (
                <span key={input}>{i > 0 && ' · '}{input}</span>
              ))}
              {' '}—{' '}
              <button
                onClick={() => onNavigate?.('profile')}
                style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
              >
                update Profile
              </button>
              {' '}or{' '}
              <button
                onClick={() => onNavigate?.('labs')}
                style={{ background: 'none', border: 'none', color: theme.blue, cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
              >
                log Labs
              </button>
            </div>
          )}

          {/* National Benchmarks — collapsible */}
          {(() => {
            const benchmarkRows = results
              .reduce<{ markerName: string; value: number; unit: string }[]>((acc, r) => {
                if (!acc.find(x => x.markerName === r.markerName)) {
                  acc.push({ markerName: r.markerName, value: r.value, unit: r.unit })
                }
                return acc
              }, [])
              .map(r => ({ ...r, benchmark: getBenchmark(r.markerName) }))
              .filter(r => r.benchmark !== null)

            if (benchmarkRows.length === 0) return null

            return (
              <div style={{ borderTop: `1px solid ${theme.borderColor}`, marginTop: 12, paddingTop: 10 }}>
                <button
                  onClick={() => setShowBenchmarks(b => !b)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 10 }}>{showBenchmarks ? '▼' : '▶'}</span>
                  National Benchmarks
                </button>
                {showBenchmarks && (
                  <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${theme.borderColor}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: theme.bgSecondary, borderBottom: `1px solid ${theme.borderColor}` }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: theme.text }}>Marker</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: theme.text }}>Your Value</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: theme.text }}>US Average</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: theme.text }}>vs. Avg</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, color: theme.text }}>Optimal Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {benchmarkRows.map((row, i) => {
                          const b = row.benchmark!
                          const diff = row.value - b.nationalMean
                          const isBetter = b.lowerIsBetter ? diff <= 0 : diff >= 0
                          const pct = b.nationalMean !== 0 ? Math.abs(Math.round((diff / b.nationalMean) * 100)) : 0
                          const isOptimal = b.lowerIsBetter ? row.value <= b.optimalMax : row.value >= b.optimalMin
                          const diffColor = isBetter ? '#10B981' : '#EF4444'
                          const arrow = b.lowerIsBetter
                            ? (diff < 0 ? '↓' : diff > 0 ? '↑' : '—')
                            : (diff > 0 ? '↑' : diff < 0 ? '↓' : '—')
                          const optLabel = b.optimalMax >= 999
                            ? `≥ ${b.optimalMin} ${b.unit}`
                            : b.optimalMin === 0
                            ? `< ${b.optimalMax} ${b.unit}`
                            : `${b.optimalMin}–${b.optimalMax} ${b.unit}`

                          return (
                            <tr key={row.markerName} style={{ borderTop: i > 0 ? `1px solid ${theme.borderColor}` : 'none' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: theme.text }}>{row.markerName}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: theme.text }}>{row.value} {row.unit}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: theme.textMuted }}>{b.nationalMean} {b.unit}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span title={b.source} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700, color: diffColor }}>
                                  {arrow} {pct > 0 ? `${pct}%` : 'At avg'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                <span style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 20,
                                  background: isOptimal ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: isOptimal ? '#10B981' : '#EF4444',
                                }}>
                                  {isOptimal ? 'Optimal' : 'Below optimal'} · {optLabel}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    <div style={{ padding: '6px 12px', borderTop: `1px solid ${theme.borderColor}`, fontSize: 11, color: theme.textMuted }}>
                      Sources: CDC NHANES 2017–2020 · AHA/ACC 2019 · ADA 2024 · NIH/NLM. Hover "vs. Avg" for source detail.
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Stats Section */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {statCard('Bookmarked Resources', bookmarkedCount, '🔖', () => {
          if (resourcesRef.current) resourcesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
          else onNavigate?.('resources')
        })}
        {statCard('Lab Results', results.length, '⚗️', () => onNavigate?.('labs'))}
        {statCard('Health Insights', applicableTags.length, '💡', () => nhlsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
        {statCard('Recommendations', recommendedResources.length, '📚', () => recommendationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
      </div>

      {/* Personalized Recommendations - NEW */}
      {results.length > 0 && (
        <div ref={recommendationsRef} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Personalized for You</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['all', 'short', 'long'] as const).map(opt => (
                <button
                  key={opt}
                  onClick={() => setDurationFilter(opt)}
                  style={{
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 20,
                    border: `1.5px solid ${durationFilter === opt ? theme.blue : theme.borderColor}`,
                    background: durationFilter === opt ? theme.blue : 'transparent',
                    color: durationFilter === opt ? '#fff' : theme.textMuted,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {opt === 'all' ? 'All' : opt === 'short' ? 'Short' : 'Long'}
                </button>
              ))}
            </div>
          </div>
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

          {(() => {
            const catFiltered = categoryPreferences.length > 0
              ? recommendedResources.filter(r => r.categories?.some(c => categoryPreferences.includes(c)))
              : recommendedResources
            const catDisplay = catFiltered.length > 0 ? catFiltered : recommendedResources
            const filtered = durationFilter === 'all'
              ? catDisplay
              : catDisplay.filter(r => !r.duration_type || r.duration_type === 'both' || r.duration_type === durationFilter)
            const display = filtered.length > 0 ? filtered : catDisplay
            return display.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 12,
              }}
            >
              {display.slice(0, 3).map((resource) => (
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
                    onClick={() => resource.link_url && window.open(resource.link_url, '_blank', 'noopener,noreferrer')}
                    style={{
                      background: theme.blue,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: resource.link_url ? 'pointer' : 'not-allowed',
                      width: '100%',
                      opacity: resource.link_url ? 1 : 0.5,
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
          )
          })()}
        </div>
      )}

      {/* Recent Resources */}
      {!results.length && (
        <div ref={resourcesRef} style={{ marginBottom: 32 }}>
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

      {/* F25 — Affiliate Product Recommendations */}
      {applicableTags.length > 0 && (
        <AffiliateProductCards applicableTags={applicableTags} theme={theme} />
      )}

      {/* Virtual Provider Links */}
      <VirtualProviderCards />

      <MyTeamCard theme={theme} />

      {user?.id && <ChallengesSection theme={theme} userId={user.id} />}

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
          {results.length > 0 && (
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
              onClick={() => setShowHealthReport(true)}
            >
              📄 Health Report
            </button>
          )}
          <button
            style={{
              background: 'transparent',
              color: theme.text,
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => setShowHealthAssessment(true)}
          >
            🩺 Health Check-In
          </button>
        </div>
      </div>

      {showHealthAssessment && (
        <HealthAssessmentModal onClose={() => setShowHealthAssessment(false)} />
      )}

      {showHealthReport && (
        <HealthReportModal
          userName={userName}
          publicId={publicId}
          bhasResult={bhasResult}
          bhasV2Result={bhasV2Result}
          results={results}
          onClose={() => setShowHealthReport(false)}
          theme={theme}
        />
      )}
    </div>
  )
}
