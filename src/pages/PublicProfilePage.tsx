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

  // ── Presentation only below this line ───────────────────────────────────────
  // Same data (is_public / public_id, NHLS result, applicable tags, latest lab date),
  // same navigation targets, same score thresholds (80 / 50).
  const scoreTone =
    bhasResult && bhasResult.percentage >= 80 ? 'hi'
    : bhasResult && bhasResult.percentage >= 50 ? 'mid'
    : 'lo'

  if (isPublic === null) {
    return <div className="pf-root pp-root pp-loading">Loading…</div>
  }

  return (
    <div className="pf-root pp-root">
      {/* Developer decision-needed banner */}
      <div className="cs-dev red">
        <b>DECISION NEEDED (Developer)</b>
        Who should be able to view this public profile?
        <ul>
          <li>Anyone with a link (no login required)</li>
          <li>Logged-in BHI users only</li>
        </ul>
        Implement access rules and a per-user public URL (e.g. <code>/u/{publicId ?? 'NHL-XXXX-XXXX'}</code>) before enabling this in production.
      </div>

      {!isPublic ? (
        /* Private state */
        <div className="pf-card pp-private">
          <div className="pp-lock" aria-hidden="true">🔒</div>
          <h3>Profile is Private</h3>
          <p>
            Your profile is not currently visible to others. Enable it on the Privacy page to share your health score.
          </p>
          <button className="pf-btn primary" onClick={() => onNavigate?.('consent')}>
            Go to Privacy Settings
          </button>
        </div>
      ) : (
        /* Public profile card */
        <div className="pf-card" style={{ padding: 28 }}>
          {/* Public ID — shown instead of real name */}
          <div className="pp-id">{publicId ?? '—'}</div>
          <div className="pp-idsub">
            National Health League Member · De-identified public ID
          </div>

          {/* NHLS Score */}
          {bhasResult && bhasResult.maxPossible > 0 ? (
            <div className="pp-score">
              <div className={`pp-score-v ${scoreTone}`}>{bhasResult.percentage}%</div>
              <div>
                <b>NHLS Score</b>
                <span>Last updated: {formatMonthYear(latestLabDate)}</span>
              </div>
            </div>
          ) : (
            <div className="pp-none">No health score available yet.</div>
          )}

          {/* Health tags */}
          {applicableTags.length > 0 && (
            <div>
              <div className="pp-tags-h">Health Insights</div>
              <div className="pp-tags">
                {applicableTags.map(tag => (
                  <span key={tag} className="pp-tag">{tag.replace(/_/g, ' ')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pp-links">
        <button className="pf-link" onClick={() => onNavigate?.('consent')}>Privacy Settings</button>
        <button className="pf-link" onClick={() => onNavigate?.('profile')}>Profile Settings</button>
      </div>
    </div>
  )
}
