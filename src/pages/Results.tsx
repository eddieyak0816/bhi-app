import React from 'react'
import type { Resource } from '../sample-data'

export default function Results({ resources, tags, dataSource }: { resources: Resource[]; tags: string[]; dataSource?: 'supabase'|'sample'|'none' }) {
  if (!tags || tags.length === 0) return (
    <div className="card small">
      <h3>Learning resources</h3>
      <p>Enter a test and number, then tap "See resources."</p>
    </div>
  )

  const normalize = (s: any) => (s || '').toString().trim().toLowerCase()
  const selected = new Set((tags || []).map(t => normalize(t)))
  const hits = resources.filter(r => {
    const rTags = Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? r.tags.replace(/^[{]|[}]$/g,'').split(',') : [])
    return rTags.some((t: any) => selected.has(normalize(t)))
  })

  return (
    <div className="card">
      <h3>Educational Resources</h3>
      <p className="muted" style={{marginTop:8,marginBottom:16}}>
        The following resources are for educational purposes only. Please consult your healthcare provider for medical advice.
      </p>

      {dataSource === 'supabase' && resources.length === 0 && (
        <div style={{background:'#fff7ed',border:'1px solid #fcd34d',padding:16,borderRadius:6,marginBottom:16}}>
          <strong>Connected to database — no demo content found.</strong>
          <div style={{marginTop:6,fontSize:14}}>Tip: run the project seed or switch to sample data to see the demo content.</div>
        </div>
      )}

      {hits.length === 0 ? (
        <div style={{padding:24,textAlign:'center',background:'#F8F9FC',borderRadius:6,marginTop:16}}>
          <p style={{margin:0,color:'var(--text-secondary)'}}>No resources match your current lab values. Try entering a different test or value.</p>
        </div>
      ) : (
        <>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text-secondary)',marginBottom:12}}>
            {hits.length} {hits.length === 1 ? 'resource' : 'resources'} found
          </div>
          <ul className="resources-list">
            {hits.map((r, i) => (
              <li key={i} className="resource">
                <strong>{r.title}</strong>
                <div className="small muted" style={{textTransform:'capitalize',marginTop:4}}>{r.type}</div>
                {r.description && <div className="small" style={{marginTop:8,color:'var(--text-secondary)'}}>{r.description}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
