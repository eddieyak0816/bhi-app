import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const NHLS_MARKERS = [
  'Vitamin D', 'Vitamin B12', 'hs-CRP', 'Fasting Glucose',
  'Fasting Insulin', 'Hemoglobin A1c', 'Triglycerides', 'HDL',
]

interface LabSet { id: string; label: string; sort_order: number; is_initial: boolean }
interface ResultRow { marker_name: string; value: number; unit: string; lab_set_id: string | null; date: string }

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:4242'

interface Props { theme: any }

export default function LabSetsComparison({ theme }: Props) {
  const { user } = useAuth()
  const [sets, setSets] = useState<LabSet[]>([])
  const [rows, setRows] = useState<ResultRow[]>([])
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      fetch(`${BACKEND_URL}/api/lab-sets`).then(r => r.ok ? r.json() : []),
      supabase
        .from('user_lab_results')
        .select('marker_name, value, unit, lab_set_id, date')
        .eq('user_id', user.id)
        .in('marker_name', NHLS_MARKERS)
        .order('date', { ascending: false }),
    ]).then(([setsData, { data: resultsData }]) => {
      setSets((setsData as LabSet[]).sort((a, b) => a.sort_order - b.sort_order))
      setRows((resultsData as ResultRow[] | null) || [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [user?.id])

  if (!loaded) return null

  // For each (marker, lab_set_id) pair, pick the most recent result
  const latestByMarkerSet: Record<string, Record<string, ResultRow>> = {}
  for (const r of rows) {
    const setKey = r.lab_set_id ?? '__none__'
    if (!latestByMarkerSet[r.marker_name]) latestByMarkerSet[r.marker_name] = {}
    if (!latestByMarkerSet[r.marker_name][setKey]) latestByMarkerSet[r.marker_name][setKey] = r
  }

  // Only show sets that have at least one result
  const setsWithData = sets.filter(s =>
    NHLS_MARKERS.some(m => latestByMarkerSet[m]?.[s.id])
  )

  // Need at least 2 sets with data to show a comparison
  if (setsWithData.length < 2) return null

  // Only show markers that have data in at least one set
  const markersWithData = NHLS_MARKERS.filter(m =>
    setsWithData.some(s => latestByMarkerSet[m]?.[s.id])
  )
  if (markersWithData.length === 0) return null

  const initialSet = setsWithData.find(s => s.is_initial) ?? setsWithData[0]

  const deltaColor = (delta: number | null, markerName: string) => {
    if (delta === null) return theme.textMuted
    const lowerIsBetter = ['hs-CRP', 'Fasting Glucose', 'Fasting Insulin', 'Hemoglobin A1c', 'Triglycerides'].includes(markerName)
    const better = lowerIsBetter ? delta < 0 : delta > 0
    return better ? '#10B981' : delta === 0 ? theme.textMuted : '#EF4444'
  }

  return (
    <div style={{
      background: theme.card,
      border: `1.5px solid ${theme.borderColor}`,
      borderRadius: 10,
      marginBottom: 32,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', color: theme.text,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15 }}>Lab Progress Comparison</span>
        <span style={{ fontSize: 11, color: theme.textMuted }}>{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 20px 20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: theme.bgSecondary }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', color: theme.text, fontWeight: 600 }}>Marker</th>
                {setsWithData.map(s => (
                  <th key={s.id} style={{ padding: '8px 12px', textAlign: 'right', color: theme.text, fontWeight: 600 }}>
                    {s.label}
                  </th>
                ))}
                {setsWithData.length > 1 && (
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: theme.text, fontWeight: 600 }}>
                    vs. {initialSet.label}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {markersWithData.map((marker, i) => {
                const initialRow = latestByMarkerSet[marker]?.[initialSet.id]
                const lastSet = setsWithData[setsWithData.length - 1]
                const lastRow = latestByMarkerSet[marker]?.[lastSet.id]
                const delta = (initialRow && lastRow && lastSet.id !== initialSet.id)
                  ? lastRow.value - initialRow.value
                  : null

                return (
                  <tr key={marker} style={{ borderTop: i > 0 ? `1px solid ${theme.borderColor}` : 'none' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: theme.text }}>{marker}</td>
                    {setsWithData.map(s => {
                      const r = latestByMarkerSet[marker]?.[s.id]
                      return (
                        <td key={s.id} style={{ padding: '8px 12px', textAlign: 'right', color: r ? theme.text : theme.textMuted }}>
                          {r ? `${r.value} ${r.unit}` : '—'}
                        </td>
                      )
                    })}
                    {setsWithData.length > 1 && (
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: deltaColor(delta, marker) }}>
                        {delta === null ? '—'
                          : delta === 0 ? '±0'
                          : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 10 }}>
            Showing most recent value per lab set. Delta = latest vs. {initialSet.label}.
          </div>
        </div>
      )}
    </div>
  )
}
