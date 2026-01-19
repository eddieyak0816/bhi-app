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
  const [showOnboard, setShowOnboard] = useState(true)
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    async function init() {
      if (supabase) {
        try {
          const { data: lm } = await supabase.from('lab_markers').select('id,name,unit')
          const { data: lr } = await supabase.from('logic_rules').select('marker_id,min_value,max_value,tag_to_apply')
          const { data: r } = await supabase.from('resources').select('type,title,description,link_url,tags')
          if (!mounted) return
          setData({ lab_markers: lm || [], logic_rules: lr || [], resources: r || [] })
          return
        } catch (err) {
          console.warn('Supabase read failed, falling back to sample data', err)
        }
      }
      setData(loadSampleData())
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
            <h1>Balanced Health</h1>
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
