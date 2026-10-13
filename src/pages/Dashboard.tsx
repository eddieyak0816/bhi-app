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
import QuickMetricsPanel from '../components/QuickMetricsPanel'
import LabSetsComparison from '../components/LabSetsComparison'
import { calculateBhasV2Score, type BhasV2Result, type BhasV2Profile } from '../utils/bhasV2'
import { supabase, getStoredJwt } from '../lib/supabase'
import { getBenchmark } from '../utils/nationalBenchmarks'
import { loadMarkerGroups } from '../utils/markerGroups'
import { getRecentlyViewed, getBookmarkedIds } from '../utils/recentlyViewed'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string || ''
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string || ''

interface DashboardProps {
  userEmail?: string
  userName?: string
  onNavigate?: (page: string) => void
}

// Profile fields the NHLS v2.3 score needs. Returns { data } so the caller reads exactly
// like the Supabase client's response; any failure resolves to { data: null } and the
// score simply doesn't render, as it did before.
async function fetchProfileRow(userId: string): Promise<{ data: any | null }> {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    const jwt = getStoredJwt()
    const cols = 'sex,height_cm,weight_kg,waist_circumference,waist_unit,grip_strength,is_type1_diabetes,total_daily_insulin_units,has_advanced_care_plan,acute_visits'
    const res = await fetch(`${url}/rest/v1/profiles?select=${cols}&id=eq.${userId}&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${jwt ?? anon}`, Accept: 'application/json' },
    })
    if (!res.ok) return { data: null }
    const rows = await res.json()
    return { data: Array.isArray(rows) && rows.length > 0 ? rows[0] : null }
  } catch {
    return { data: null }
  }
}

export default function Dashboard({ userEmail = '', userName = '', onNavigate }: DashboardProps) {
  const { theme } = useTheme()
  const { applicableTags, recommendedResources, bhasResult, loading, error, adminRules } = useEvaluation()
  const { results, latestLabDate } = useResults()
  const { user } = useAuth()
  // Real personal history instead of the previous hardcoded placeholder (always "first 3
  // resources in the library" and a fixed "2"). Recomputed fresh each time this component
  // mounts (i.e. each time the user navigates to Home), since it's read once here rather than
  // subscribed to — matches how this data is only ever written from other pages, not while
  // this component itself is on screen.
  const [recentResources] = useState(() => getRecentlyViewed(3))
  const [bookmarkedResources, setBookmarkedResources] = useState<Array<{ id: string; title: string; type: string; link_url: string | null }>>([])
  const bookmarkedCount = bookmarkedResources.length

  // Look up the real titles for whatever's bookmarked (bookmarks themselves are just a list of
  // resource IDs in localStorage — see ResourcesPage.tsx) so "Your Bookmarked Resources" below
  // can show actual content instead of just a count.
  useEffect(() => {
    const ids = getBookmarkedIds()
    if (ids.length === 0 || !SUPABASE_URL) return
    const jwt = getStoredJwt()
    const idList = ids.map(id => `"${id}"`).join(',')
    fetch(`${SUPABASE_URL}/rest/v1/resources?select=id,title,type,link_url&id=in.(${idList})`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${jwt || SUPABASE_ANON_KEY}` },
    })
      .then(res => res.ok ? res.json() : [])
      .then(rows => setBookmarkedResources(rows || []))
      .catch(() => setBookmarkedResources([]))
  }, [])

  // Get first name from full name
  const firstName = userName?.split(' ')[0] || ''

  const [showHealthReport, setShowHealthReport] = useState(false)
  const [showHealthAssessment, setShowHealthAssessment] = useState(false)
  const [publicId, setPublicId] = useState<string | null>(null)
  const [showBenchmarks, setShowBenchmarks] = useState(false)

  const nhlsRef = useRef<HTMLDivElement>(null)
  const resourcesRef = useRef<HTMLDivElement>(null)
  const bookmarksRef = useRef<HTMLDivElement>(null)
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

  // Recompute whenever this page mounts, not only when results/rules change. Navigating
  // Admin → Home is a client-side route change: the effect's other deps are identical, so
  // without this it never re-runs and a score cleared by an admin save is never refilled
  // (the user sees "Calculating…" until they reload the whole page).
  const [recomputeKey, setRecomputeKey] = useState(0)
  useEffect(() => {
    if (!sessionStorage.getItem('nhl-bhas-v23-result')) setRecomputeKey(k => k + 1)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false

    // Direct REST read rather than the Supabase JS client: the client waits on its internal
    // auth lock, which can abort after a hard refresh and leave the score panel empty even
    // though the profile is fine. Same columns as before; the code below is unchanged.
    fetchProfileRow(user.id)
      .then(async ({ data }) => {
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

        // Raw markers score against Damon's Admin ranges where he has set them
        // (Admin → Markers → Edit → Scoring Rules); anything unset stays on the spec.
        // Interchangeable marker groups (Admin → Markers → Marker Groups). Returns an
        // empty list on any failure, in which case the score is exactly as before.
        const groups = await loadMarkerGroups()
        const v2 = calculateBhasV2Score(
          results.map(r => ({ markerName: r.markerName, value: r.value, date: r.date })),
          profile,
          adminRules || undefined,
          groups
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
  }, [user?.id, results, adminRules, recomputeKey])

  const statCard = (label: string, value: string | number, icon: string, onClick?: () => void) => (
    <div
      className={`home-stat${onClick ? ' click' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }) : undefined}
    >
      <div className="home-stat-i" aria-hidden="true">{icon}</div>
      <div>
        <div className="home-stat-l">{label}</div>
        <div className="home-stat-v">{value}</div>
      </div>
    </div>
  )

  // Status of one NHLS metric, for the tile colour + wording. A grouped slot with no
  // result at all reports label 'Missing' — shown neutrally rather than as a failure.
  const statusOf = (m: { score: number; label: string }) =>
    m.label === 'Missing' ? { k: 'none', text: 'No result' }
    : m.score === 1 ? { k: 'ok', text: 'Optimal' }
    : m.score === 0.5 ? { k: 'mid', text: 'Improvement' }
    : { k: 'bad', text: 'Out of range' }

  return (
    <div className="home-root">
      <div className="home-hello">
        <h2>Welcome back{firstName ? `, ${firstName}` : ''}</h2>
        <p>{userEmail}</p>
      </div>

      <StaleLabBanner latestLabDate={latestLabDate} onNavigate={onNavigate} />

      {/* NHLS Score Panel — shown only when enough data exists */}
      {/* No cached result yet (first load, or an admin just changed the scoring config and
          cleared it) — hold the space with a placeholder rather than dropping the panel,
          which reads as "my score vanished" instead of "still loading". */}
      {!bhasV2Result && results.length > 0 && (
        <div className="home-card home-muted">Calculating your NHLS score&hellip;</div>
      )}

      {bhasV2Result && bhasV2Result.hasEnoughData && (() => {
        const r = bhasV2Result
        const scored = r.metricScores.filter(m => m.included)
        const optimalCount = scored.filter(m => m.score === 1).length
        const attentionCount = scored.length - optimalCount
        const tone = r.label === 'Optimal' ? 'optimal'
                   : r.label === 'Healthy' ? 'healthy'
                   : r.label === 'Needs Improvement' ? 'needs'
                   : 'risk'
        // Ring fill = points earned / points available, straight from the engine's result.
        const frac = r.maxPossible > 0 ? Math.max(0, Math.min(1, r.totalScore / r.maxPossible)) : 0
        const CIRC = 2 * Math.PI * 88

        // National Benchmarks rows — unchanged logic: latest value per marker that has a benchmark.
        const benchmarkRows = results
          .reduce<{ markerName: string; value: number; unit: string }[]>((acc, x) => {
            if (!acc.find(y => y.markerName === x.markerName)) {
              acc.push({ markerName: x.markerName, value: x.value, unit: x.unit })
            }
            return acc
          }, [])
          .map(x => ({ ...x, benchmark: getBenchmark(x.markerName) }))
          .filter(x => x.benchmark !== null)

        return (
          <div ref={nhlsRef}>
            {/* Score */}
            <div className="home-orb">
              <div className="home-orb-grid">
                <div className="home-gauge">
                  <svg viewBox="0 0 206 206" fill="none" aria-hidden="true">
                    <circle cx="103" cy="103" r="88" stroke="rgba(255,255,255,.1)" strokeWidth="16" />
                    <circle cx="103" cy="103" r="88" stroke="#B8E62E" strokeWidth="16" strokeLinecap="round"
                            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - frac)} />
                  </svg>
                  <div className="home-gauge-c">
                    <div className="home-gauge-n">{r.totalScore.toFixed(1)}</div>
                    <div className="home-gauge-d">of {r.maxPossible.toFixed(1)}</div>
                  </div>
                </div>
                <div className="home-orb-r">
                  <span className={`home-pill ${tone}`}>&#9679; {r.label}</span>
                  <h3 className="home-orb-h">
                    {attentionCount === 0
                      ? <>Every scored marker is optimal.</>
                      : <>{optimalCount} {optimalCount === 1 ? 'marker' : 'markers'} optimal.<br />{attentionCount} left to move.</>}
                  </h3>
                  <p className="home-orb-p">
                    NHLS &middot; {scored.length} of {r.maxPossible} metrics scored &middot; uses derived ratios ({' '}
                    <a
                      href="https://en.wikipedia.org/wiki/Homeostatic_model_assessment"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      HOMA-IR
                    </a>
                    , TG/HDL, WtHR)
                  </p>
                </div>
              </div>
            </div>

            {/* Per-metric breakdown */}
            <div className="home-tiles">
              {r.metricScores.map(m => {
                const st = statusOf(m)
                return (
                  <div key={m.metric} className="home-tile" title={m.derived}>
                    <div className="home-tile-top">
                      <span className="home-tile-n">{m.metric}</span>
                      <span className={`home-bead ${st.k}`} aria-hidden="true" />
                    </div>
                    <span className={`home-st ${st.k}`}>{st.text}</span>
                    <div className="home-tile-v">{m.derived}</div>
                  </div>
                )
              })}
            </div>

            {/* Missing inputs hint */}
            {r.missingInputs.length > 0 && (
              <div className="home-hint">
                <strong>To complete your v2.3 score, add:</strong>{' '}
                {r.missingInputs.map((input, i) => (
                  <span key={input}>{i > 0 && ' · '}{input}</span>
                ))}
                {' '}—{' '}
                <button className="home-link" onClick={() => onNavigate?.('profile')}>update Profile</button>
                {' '}or{' '}
                <button className="home-link" onClick={() => onNavigate?.('labs')}>log Labs</button>
              </div>
            )}

            {/* National Benchmarks — collapsible */}
            {benchmarkRows.length > 0 && (
              <div className="home-bm">
                <button
                  className="home-bm-btn"
                  onClick={() => setShowBenchmarks(b => !b)}
                  aria-expanded={showBenchmarks}
                >
                  National Benchmarks
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {showBenchmarks && (
                  <div className="home-bm-card">
                    <div className="home-bm-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Marker</th>
                            <th>Your Value</th>
                            <th>US Average</th>
                            <th className="c">vs. Avg</th>
                            <th className="c">Optimal Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {benchmarkRows.map(row => {
                            const b = row.benchmark!
                            const diff = row.value - b.nationalMean
                            const isBetter = b.lowerIsBetter ? diff <= 0 : diff >= 0
                            const pct = b.nationalMean !== 0 ? Math.abs(Math.round((diff / b.nationalMean) * 100)) : 0
                            const isOptimal = b.lowerIsBetter ? row.value <= b.optimalMax : row.value >= b.optimalMin
                            const arrow = b.lowerIsBetter
                              ? (diff < 0 ? '↓' : diff > 0 ? '↑' : '—')
                              : (diff > 0 ? '↑' : diff < 0 ? '↓' : '—')
                            const optLabel = b.optimalMax >= 999
                              ? `≥ ${b.optimalMin} ${b.unit}`
                              : b.optimalMin === 0
                              ? `< ${b.optimalMax} ${b.unit}`
                              : `${b.optimalMin}–${b.optimalMax} ${b.unit}`

                            return (
                              <tr key={row.markerName}>
                                <td className="n">{row.markerName}</td>
                                <td className="n">{row.value} {row.unit}</td>
                                <td className="m">{b.nationalMean} {b.unit}</td>
                                <td className="c">
                                  <span title={b.source} className={`home-bm-delta ${isBetter ? 'up' : 'down'}`}>
                                    {arrow} {pct > 0 ? `${pct}%` : 'At avg'}
                                  </span>
                                </td>
                                <td className="c">
                                  <span className={`home-st ${isOptimal ? 'ok' : 'bad'}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                                    {isOptimal ? 'Optimal' : 'Below optimal'} &middot; {optLabel}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="home-bm-src">
                      Sources: CDC NHANES 2017–2020 · AHA/ACC 2019 · ADA 2024 · NIH/NLM. Hover &quot;vs. Avg&quot; for source detail.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* F89 — Quick Metrics Entry Panel */}
      <QuickMetricsPanel />

      {/* F90 — Lab Progress Comparison */}
      <LabSetsComparison theme={theme} />

      {/* Stats Section */}
      <div className="home-stats">
        {statCard('Bookmarked Resources', bookmarkedCount, '🔖', () => {
          if (bookmarksRef.current) bookmarksRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
          else onNavigate?.('resources')
        })}
        {statCard('Lab Results', results.length, '⚗️', () => onNavigate?.('labs'))}
        {statCard('Health Insights', applicableTags.length, '💡', () => nhlsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
        {statCard('Recommendations', recommendedResources.length, '📚', () => recommendationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
      </div>

      {/* Personalized Recommendations - NEW */}
      {results.length > 0 && (
        <div ref={recommendationsRef} className="home-sec">
          <div className="home-sec-h">
            <h3 className="home-h3">Personalized for You</h3>
            <div className="home-segs">
              {(['all', 'short', 'long'] as const).map(opt => (
                <button
                  key={opt}
                  className={durationFilter === opt ? 'on' : ''}
                  onClick={() => setDurationFilter(opt)}
                >
                  {opt === 'all' ? 'All' : opt === 'short' ? 'Short' : 'Long'}
                </button>
              ))}
            </div>
          </div>
          <p className="home-sec-p">
            Based on {applicableTags.length} health insight{applicableTags.length !== 1 ? 's' : ''}: {applicableTags.join(', ') || 'Analyzing your results...'}
          </p>

          {loading && (
            <div className="home-empty" style={{ marginBottom: 16 }}>Loading personalized recommendations...</div>
          )}

          {error && (
            <div className="home-err">Error loading recommendations: {error}</div>
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
              <div className="home-cards">
                {display.map((resource) => (
                  <div key={resource.id} className="home-rc">
                    {/* Damon, 2026-10-06: resource thumbnails uploaded in Admin showed in
                        the Library but never on Home — this card simply didn't render one.
                        Cards without an image just start at the text, as in the Library. */}
                    {resource.thumbnail_url && (
                      <img className="home-rc-img" src={resource.thumbnail_url} alt="" loading="lazy" />
                    )}
                    <div className="home-rc-b">
                      <div className="home-rc-k">Recommended &middot; {resource.type}</div>
                      <div className="home-rc-t">{resource.title}</div>
                      <div className="home-rc-tags" title={resource.tags.join(', ')}>
                        {resource.tags.join(', ')}
                      </div>
                      <button
                        className={`home-btn${resource.link_url ? '' : ' off'}`}
                        onClick={() => { if (resource.link_url) { window.open(resource.link_url, '_blank', 'noopener,noreferrer'); recordView(resource) } }}
                      >
                        View Resource
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="home-empty">
                No recommendations yet. Log more lab results to get personalized suggestions!
              </div>
            )
          })()}
        </div>
      )}

      {/* Recent Resources */}
      {!results.length && (
        <div ref={resourcesRef} className="home-sec">
          <div className="home-sec-h"><h3 className="home-h3">Recently Viewed</h3></div>
          <div style={{ height: 18 }} />
          {recentResources.length > 0 ? (
            <div className="home-cards">
              {recentResources.map(resource => (
                <div key={resource.title} className="home-rc">
                  <div className="home-rc-b">
                    <div className="home-rc-k">{resource.type}</div>
                    <div className="home-rc-t">{resource.title}</div>
                    <button className="home-btn">Continue Reading</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="home-empty">No resources viewed yet. Start exploring!</div>
          )}
        </div>
      )}

      {/* Bookmarked Resources — shown whenever the user has any, regardless of lab data
          (unlike Recently Viewed above, bookmarking isn't tied to having entered labs yet) */}
      {bookmarkedResources.length > 0 && (
        <div ref={bookmarksRef} className="home-sec">
          <div className="home-sec-h"><h3 className="home-h3">Your Bookmarked Resources</h3></div>
          <div style={{ height: 18 }} />
          <div className="home-cards">
            {bookmarkedResources.map(resource => (
              <div key={resource.id} className="home-rc">
                <div className="home-rc-b">
                  <div className="home-rc-k">{resource.type}</div>
                  <div className="home-rc-t">{resource.title}</div>
                  {resource.link_url && (
                    <a className="home-btn" href={resource.link_url} target="_blank" rel="noopener noreferrer">
                      Open →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
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
      <div className="home-sec">
        <div className="home-sec-h"><h3 className="home-h3">Quick Actions</h3></div>
        <div style={{ height: 18 }} />
        <div className="home-qa">
          <button className="home-qa-b primary" onClick={() => onNavigate?.('labs')}>
            <span className="home-qa-i" aria-hidden="true">📊</span>Log Lab Results
          </button>
          <button className="home-qa-b" onClick={() => onNavigate?.('library')}>
            <span className="home-qa-i" aria-hidden="true">🔍</span>Browse Library
          </button>
          <button className="home-qa-b" onClick={() => onNavigate?.('profile')}>
            <span className="home-qa-i" aria-hidden="true">⚙️</span>Edit Profile
          </button>
          {results.length > 0 && (
            <button className="home-qa-b" onClick={() => setShowHealthReport(true)}>
              <span className="home-qa-i" aria-hidden="true">📄</span>Health Report
            </button>
          )}
          <button className="home-qa-b" onClick={() => setShowHealthAssessment(true)}>
            <span className="home-qa-i" aria-hidden="true">🩺</span>Health Check-In
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
