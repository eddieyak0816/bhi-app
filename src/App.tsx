import React, { useEffect, useState } from 'react'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import Onboarding from './pages/Onboarding'
import LabInput from './pages/LabInput'
import Results from './pages/Results'
import { loadSampleData, SampleData } from './sample-data'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

function createOptionalSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export default function App() {
  const [supabase] = useState<SupabaseClient | null>(() => createOptionalSupabase())
  const [data, setData] = useState<SampleData | null>(null)
  const [dataSource, setDataSource] = useState<'supabase' | 'sample' | 'none'>('none')
  const [showOnboard, setShowOnboard] = useState(true)
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    async function init() {
      // Prefer Supabase when configured, but be explicit about what we received so debugging is easy
      if (supabase) {
        try {
          const [{ data: lm, error: lmErr }, { data: lr, error: lrErr }, { data: r, error: rErr }] = await Promise.all([
            supabase.from('lab_markers').select('id,name,unit'),
            supabase.from('logic_rules').select('marker_id,min_value,max_value,tag_to_apply'),
            supabase.from('resources').select('type,title,description,link_url,tags')
          ])

          // Log detailed results for debugging (visible in DevTools)
          console.debug('Supabase query results', {
            lab_markers_count: (lm || []).length,
            logic_rules_count: (lr || []).length,
            resources_count: (r || []).length,
            errors: { lmErr, lrErr, rErr }
          })

          if (!mounted) return

          // If queries returned usable rows, use them; otherwise fall back to sample data
          const hasRows = (lm && lm.length > 0) || (lr && lr.length > 0) || (r && r.length > 0)
          if (hasRows && !lmErr && !lrErr && !rErr) {
            setData({ lab_markers: lm || [], logic_rules: lr || [], resources: r || [] })
            setDataSource('supabase')
            return
          }

          console.warn('Supabase connected but returned no rows or errors — falling back to sample data', { lmErr, lrErr, rErr })
        } catch (err) {
          console.warn('Supabase read failed (exception), falling back to sample data', err)
        }
      }

      // fallback
      setData(loadSampleData())
      setDataSource('sample')
    }
    init()
    return () => { mounted = false }
  }, [supabase])

  if (!data) return <div className="center">Loading…</div>

  return (
    <div className="app-container">
      {showOnboard ? (
        <Onboarding onClose={() => setShowOnboard(false)} />
      ) : (
        <>
          <header className="header">
            <div style={{display:'flex',alignItems:'baseline',gap:12}}>
              <h1 style={{margin:0}}>Balanced Health</h1>
              <div className="muted small" style={{fontSize:12}}>{dataSource === 'supabase' ? 'Connected to Supabase' : dataSource === 'sample' ? 'Using sample data' : 'Data: not loaded'}</div>
            </div>
            <p className="subtitle">Short, trusted health info — not medical advice.</p>
          </header>

          <main>
            <LabInput
              labMarkers={data.lab_markers}
              logicRules={data.logic_rules}
              onComputeTags={(t) => setTags(t)}
            />

            <Results resources={data.resources} tags={tags} />
          </main>
        </>
      )}
    </div>
  )
}
