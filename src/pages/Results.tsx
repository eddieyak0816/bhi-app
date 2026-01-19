import React from 'react'
import type { Resource } from '../sample-data'

export default function Results({ resources, tags }: { resources: Resource[]; tags: string[] }) {
  if (!tags || tags.length === 0) return (
    <div className="card small">
      <h3>Learning resources</h3>
      <p>Enter a test and number, then tap "See resources."</p>
    </div>
  )

  const hits = resources.filter(r => r.tags && r.tags.some(t => tags.includes(t)))

  return (
    <div className="card">
      <h3>Learning resources</h3>
      <p className="muted">These are educational — talk to your doctor for medical advice.</p>

      {hits.length === 0 ? (
        <p>No matches found. Try a different test name or number.</p>
      ) : (
        <ul className="resources-list">
          {hits.map((r, i) => (
            <li key={i} className="resource">
              <strong>{r.title}</strong>
              <div className="small muted">{r.type}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
