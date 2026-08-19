import React, { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useResults } from '../context/ResultsContext'
import { useAuth } from '../context/AuthContext'
import { supabase, getStoredJwt } from '../lib/supabase'
import { getTriggerMessagesFromDB, TriggerMessage } from '../utils/labTriggerMessages'
import LabTriggerMessagesModal from './LabTriggerMessagesModal'

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string
const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL || 'http://localhost:4242'

interface LabSet { id: string; label: string; sort_order: number; is_initial: boolean }

interface MetricField {
  markerName: string
  label: string
  unit: string
  placeholder: string
  step?: string
}

const METRIC_FIELDS: MetricField[] = [
  { markerName: 'Vitamin D',       label: 'Vitamin D',        unit: 'ng/mL',   placeholder: 'e.g. 45' },
  { markerName: 'Vitamin B12',     label: 'Vitamin B12',      unit: 'pg/mL',   placeholder: 'e.g. 500' },
  { markerName: 'hs-CRP',          label: 'hs-CRP',           unit: 'mg/L',    placeholder: 'e.g. 0.8' },
  { markerName: 'Fasting Glucose', label: 'Fasting Glucose',  unit: 'mg/dL',   placeholder: 'e.g. 90' },
  { markerName: 'Fasting Insulin', label: 'Fasting Insulin',  unit: 'µIU/mL',  placeholder: 'e.g. 6' },
  { markerName: 'Hemoglobin A1c',  label: 'Hemoglobin A1c',   unit: '%',       placeholder: 'e.g. 5.4', step: '0.1' },
  { markerName: 'Triglycerides',   label: 'Triglycerides',    unit: 'mg/dL',   placeholder: 'e.g. 100' },
  { markerName: 'HDL',             label: 'HDL',              unit: 'mg/dL',   placeholder: 'e.g. 60' },
]

interface QuickMetricsPanelProps {
  onScoreRecalc?: () => void
}

export default function QuickMetricsPanel({ onScoreRecalc }: QuickMetricsPanelProps) {
  const { theme } = useTheme()
  const { addResult } = useResults()
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [waist, setWaist] = useState('')
  const [waistUnit, setWaistUnit] = useState<'in' | 'cm'>('in')
  const [height, setHeight] = useState('')
  const [heightUnit, setHeightUnit] = useState<'in' | 'cm'>('in')
  const [acp, setAcp] = useState(false)
  const [saving, setSaving] = useState(false)
  const [userSex, setUserSex] = useState<'male' | 'female' | ''>('')
  const [triggerMessages, setTriggerMessages] = useState<TriggerMessage[] | null>(null)
  const [labSets, setLabSets] = useState<LabSet[]>([])
  const [selectedSetId, setSelectedSetId] = useState<string>('')
  const markerRangesRef = React.useRef<Record<string, { min: number; max: number }>>({})

  // Fetch lab sets and marker ranges once
  useEffect(() => {
    supabase.from('lab_markers').select('name, min_normal, max_normal').then(({ data }) => {
      if (data) {
        const ranges: Record<string, { min: number; max: number }> = {}
        data.forEach((m: { name: string; min_normal: number | null; max_normal: number | null }) => {
          ranges[m.name] = { min: m.min_normal ?? 0, max: m.max_normal ?? 9999 }
        })
        markerRangesRef.current = ranges
      }
    })
    fetch(`${BACKEND_URL}/api/lab-sets`)
      .then(r => r.ok ? r.json() : [])
      .then((data: LabSet[]) => {
        setLabSets(data)
        const initial = data.find(s => s.is_initial)
        if (initial) setSelectedSetId(initial.id)
      })
      .catch(() => {})
  }, [])

  // Load profile defaults (waist, height, sex) when panel opens
  useEffect(() => {
    if (!open || !user?.id) return
    supabase
      .from('profiles')
      .select('sex, waist_circumference, waist_unit, height_cm, has_advanced_care_plan')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return
        if (data.sex) setUserSex(data.sex)
        if (data.waist_circumference != null) {
          setWaist(String(data.waist_circumference))
          setWaistUnit(data.waist_unit === 'cm' ? 'cm' : 'in')
        }
        if (data.height_cm != null) {
          setHeight(String(data.height_cm))
          setHeightUnit('cm')
        }
        if (data.has_advanced_care_plan != null) setAcp(data.has_advanced_care_plan)
      })
  }, [open, user?.id])

  const handleSave = async () => {
    setSaving(true)
    const savedItems: { markerName: string; value: number }[] = []
    const today = new Date().toISOString().split('T')[0]

    // Save lab marker values
    const saves = METRIC_FIELDS
      .filter(f => values[f.markerName]?.trim())
      .map(f => {
        const val = parseFloat(values[f.markerName])
        if (isNaN(val)) return Promise.resolve()
        savedItems.push({ markerName: f.markerName, value: val })
        const range = markerRangesRef.current[f.markerName]
        return addResult({
          markerName: f.markerName,
          value: val,
          unit: f.unit,
          date: today,
          minNormal: range?.min ?? 0,
          maxNormal: range?.max ?? 9999,
          lab_set_id: selectedSetId || null,
        })
      })
    await Promise.all(saves)

    // Save waist + height + ACP to profile (same pattern as ProfilePage)
    if (user?.id) {
      const jwt = getStoredJwt()
      const waistVal = parseFloat(waist)
      const heightVal = parseFloat(height)
      const profilePatch: Record<string, unknown> = { id: user.id, has_advanced_care_plan: acp }
      if (!isNaN(waistVal) && waist.trim()) {
        profilePatch.waist_circumference = waistVal
        profilePatch.waist_unit = waistUnit
      }
      if (!isNaN(heightVal) && height.trim()) {
        profilePatch.height_cm = heightUnit === 'in' ? Math.round(heightVal * 2.54 * 10) / 10 : heightVal
      }
      await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${jwt ?? SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(profilePatch),
      }).catch(() => {})
    }

    // Score recalc: cleared by addResult via ResultsContext, but also clear explicitly
    try { sessionStorage.removeItem('nhl-bhas-v23-result') } catch {}
    onScoreRecalc?.()

    // Trigger messages
    if (savedItems.length > 0) {
      const msgs = await getTriggerMessagesFromDB(savedItems, userSex)
      if (msgs.length > 0) setTriggerMessages(msgs)
    }

    // Reset inputs
    setValues({})
    setSaving(false)
    setOpen(false)
  }

  const inputStyle: React.CSSProperties = {
    background: theme.bgSecondary,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 13,
    color: theme.text,
    width: '100%',
    boxSizing: 'border-box',
  }

  const unitToggle = (val: 'in' | 'cm', set: (v: 'in' | 'cm') => void) => (
    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
      {(['in', 'cm'] as const).map(u => (
        <button
          key={u}
          onClick={() => set(u)}
          style={{
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            border: `1.5px solid ${val === u ? theme.blue : theme.borderColor}`,
            background: val === u ? theme.blue : 'transparent',
            color: val === u ? '#fff' : theme.textMuted,
            cursor: 'pointer',
          }}
        >
          {u}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div
        style={{
          background: theme.card,
          border: `1.5px solid ${theme.borderColor}`,
          borderRadius: 10,
          marginBottom: 32,
          overflow: 'hidden',
        }}
      >
        {/* Header toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            color: theme.text,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>Log Your NHLS Metrics</span>
          <span style={{ fontSize: 11, color: theme.textMuted }}>{open ? '▼' : '▶'}</span>
        </button>

        {open && (
          <div style={{ padding: '0 20px 20px' }}>
            {/* Lab value inputs — 2-column grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 16px', marginBottom: 16 }}>
              {METRIC_FIELDS.map(f => (
                <div key={f.markerName}>
                  <label style={{ fontSize: 12, color: theme.textMuted, display: 'block', marginBottom: 4 }}>
                    {f.label} <span style={{ fontSize: 11 }}>({f.unit})</span>
                  </label>
                  <input
                    type="number"
                    step={f.step || 'any'}
                    placeholder={f.placeholder}
                    value={values[f.markerName] || ''}
                    onChange={e => setValues(v => ({ ...v, [f.markerName]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            {/* Waist */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: 'block', marginBottom: 4 }}>
                Waist Circumference
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.1"
                  placeholder={waistUnit === 'in' ? 'e.g. 34' : 'e.g. 86'}
                  value={waist}
                  onChange={e => setWaist(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', flex: 1 }}
                />
                {unitToggle(waistUnit, setWaistUnit)}
              </div>
            </div>

            {/* Height */}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: theme.textMuted, display: 'block', marginBottom: 4 }}>
                Height
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.1"
                  placeholder={heightUnit === 'in' ? 'e.g. 70' : 'e.g. 178'}
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', flex: 1 }}
                />
                {unitToggle(heightUnit, setHeightUnit)}
              </div>
            </div>

            {/* Lab Set */}
            {labSets.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: theme.textMuted, display: 'block', marginBottom: 4 }}>
                  Lab Set
                </label>
                <select
                  value={selectedSetId}
                  onChange={e => setSelectedSetId(e.target.value)}
                  style={{ ...inputStyle, width: 'auto', minWidth: 220 }}
                >
                  {labSets.map(s => (
                    <option key={s.id} value={s.id}>{s.label}{s.is_initial && s.label.toLowerCase() !== 'initial' ? ' (Initial)' : ''}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Advanced Care Plan */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <input
                id="qm-acp"
                type="checkbox"
                checked={acp}
                onChange={e => setAcp(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <label htmlFor="qm-acp" style={{ fontSize: 13, color: theme.text, cursor: 'pointer' }}>
                I have an Advance Care Plan
              </label>
            </div>

            {/* Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: `1.5px solid ${theme.borderColor}`,
                  borderRadius: 6,
                  padding: '9px 20px',
                  fontSize: 14,
                  color: theme.textMuted,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: theme.blue,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '9px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Metrics'}
              </button>
            </div>
          </div>
        )}
      </div>

      {triggerMessages && triggerMessages.length > 0 && (
        <LabTriggerMessagesModal
          messages={triggerMessages}
          onClose={() => setTriggerMessages(null)}
        />
      )}
    </>
  )
}
