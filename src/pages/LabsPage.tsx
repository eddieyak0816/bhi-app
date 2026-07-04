import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useTheme } from '../context/ThemeContext'
import { useResults } from '../context/ResultsContext'
import { useEvaluation } from '../context/EvaluationContext'
import { useAuth } from '../context/AuthContext'
import StaleLabBanner from '../components/StaleLabBanner'
import LabSetsComparison from '../components/LabSetsComparison'
import Vo2CalcModal from '../components/Vo2CalcModal'
import LabTriggerMessagesModal from '../components/LabTriggerMessagesModal'
import { getTriggerMessagesFromDB, TriggerMessage } from '../utils/labTriggerMessages'
import { getStoredJwt } from '../lib/supabase'
import type { ProviderVerification } from '../context/ResultsContext'
import {
  ComposedChart,
  Line,
  ReferenceArea,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4242'
const BACKEND_KEY = import.meta.env.VITE_BACKEND_API_KEY || ''

interface ExtractedRow {
  name: string
  value: number | string
  value_str?: string     // raw string from AI, may include < or > qualifier (e.g. "<8.4")
  unit: string
  min_normal: number | null
  max_normal: number | null
  flag: string | null
  include: boolean       // user can deselect rows they don't want to save
  matchedMarkerId?: string
  autoMatchedMarkerId?: string  // the original auto-match; used to detect manual overrides
  saveAlias?: boolean           // if true, save row.name as an alias for matchedMarkerId on save
}

// Tags that represent the optimal/normal range for BHAS scoring
const OPTIMAL_TAGS = new Set([
  'Adequate_VitD', 'Normal_Glucose', 'Desirable_Cholesterol', 'Good_HDL',
  'Optimal_LDL', 'Normal_Triglycerides', 'Normal_BP_Systolic', 'Normal_BP_Diastolic',
  'Normal D', 'Adequate_B12', 'Normal_B12',
  'Optimal_Waist_Male', 'Optimal_Waist_Female', 'Optimal_Grip',
])

interface LabMarker {
  id: string
  name: string
  unit?: string
  min_normal?: number
  max_normal?: number
  is_active?: boolean
  cpt_code?: string
  applicable_sex?: string
  marker_category?: string
}

export default function Labs({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { results, latestLabDate, addResult, removeResult, getResultsForMarker } = useResults()
  const { bhasResult } = useEvaluation()
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showVo2Calc, setShowVo2Calc] = useState(false)
  const [labMarkers, setLabMarkers] = useState<LabMarker[]>([])
  const [loadingMarkers, setLoadingMarkers] = useState(false)
  // Map of marker_id -> { min, max } derived from optimal logic rules
  const [optimalRanges, setOptimalRanges] = useState<Record<string, { min: number; max: number }>>({})
  const [formData, setFormData] = useState({
    markerName: '',
    value: '',
    unit: '',
    minNormal: '',
    maxNormal: '',
  })

  // Alias map: alias.toLowerCase() → marker_id (loaded once, used to resolve PDF names at save time)
  const aliasMapRef = useRef<Map<string, string>>(new Map())

  // PDF upload state
  const [pdfUploading, setPdfUploading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfDuplicateWarning, setPdfDuplicateWarning] = useState<string | null>(null)
  const [extractedRows, setExtractedRows] = useState<ExtractedRow[] | null>(null)
  const [savingExtracted, setSavingExtracted] = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Lab trigger messages modal
  const [triggerMessages, setTriggerMessages] = useState<TriggerMessage[] | null>(null)
  const [userSex, setUserSex] = useState<'male' | 'female' | ''>('')
  const [sexLoaded, setSexLoaded] = useState(false)

  // Lab sets (F90)
  const [labSets, setLabSets] = useState<{ id: string; label: string; is_initial: boolean }[]>([])
  const [selectedLabSetId, setSelectedLabSetId] = useState<string>('')

  // Fetch user sex for sex-specific thresholds (e.g. HDL)
  useEffect(() => {
    if (!user?.id) return
    const jwt = getStoredJwt()
    if (!jwt) { setSexLoaded(true); return }
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
    fetch(`${SUPABASE_URL}/rest/v1/profiles?select=sex&id=eq.${user.id}&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` },
    })
      .then(r => r.json())
      .then(rows => { if (rows?.[0]?.sex) setUserSex(rows[0].sex) })
      .catch(() => {})
      .finally(() => setSexLoaded(true))
  }, [user?.id])

  // Fetch lab sets once
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/lab-sets`)
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; label: string; sort_order: number; is_initial: boolean }[]) => {
        const sorted = data.sort((a, b) => a.sort_order - b.sort_order)
        setLabSets(sorted)
        const initial = sorted.find(s => s.is_initial)
        if (initial) setSelectedLabSetId(initial.id)
      })
      .catch(() => {})
  }, [])

  // Provider verification state (for manual entry form)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationForm, setVerificationForm] = useState<ProviderVerification>({
    verifierName: '',
    verifierCredential: '',
    verifierNpi: '',
    verifierSignature: '',
    verifiedAt: new Date().toISOString().split('T')[0],
  })

  const handlePdfUpload = async (file: File) => {
    setPdfError(null)
    setPdfDuplicateWarning(null)
    setExtractedRows(null)
    setPdfUploading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const headers: Record<string, string> = { 'x-backend-api-key': BACKEND_KEY }
      if (user?.id) headers['x-user-id'] = user.id
      const res = await fetch(`${BACKEND_URL}/api/extract-labs`, {
        method: 'POST',
        headers,
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setPdfError(data.message || data.error || 'Extraction failed. Please try again.')
        return
      }
      // Show duplicate warning but still show results so user can choose to proceed or discard
      if (data.duplicate) {
        setPdfDuplicateWarning(data.duplicate_detail || 'This PDF appears to have been uploaded before.')
      }
      // Re-fetch markers fresh so any markers added since page load are included in matching
      const { data: freshMarkers } = await supabase
        .from('lab_markers')
        .select('id, name, unit, min_normal, max_normal, is_active, cpt_code')
        .order('name')
      const currentMarkers = (freshMarkers as LabMarker[] | null) || labMarkers
      if (freshMarkers) setLabMarkers(freshMarkers as LabMarker[])

      // Match extracted names to known lab markers.
      // Strategy (in priority order):
      //   1. Exact match (case-insensitive)
      //   2. PDF name contains DB name as whole words (e.g. "Glucose, Fasting" → "Fasting Glucose")
      //      — but only if DB name is NOT a generic word like "Cholesterol" that would greedily
      //        swallow "HDL Cholesterol", "LDL Cholesterol", etc.
      //   3. DB name contains PDF name as whole words
      // When multiple DB markers match, pick the most specific (longest name).
      const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      const wordsOf   = (s: string) => normalise(s).split(' ')

      // Returns true if all words of `needle` appear as a contiguous subsequence in `haystack` words
      const containsAsPhrase = (haystack: string, needle: string) => {
        const hw = wordsOf(haystack)
        const nw = wordsOf(needle)
        if (nw.length === 0) return false
        for (let i = 0; i <= hw.length - nw.length; i++) {
          if (nw.every((w, j) => hw[i + j] === w)) return true
        }
        return false
      }

      const findBestMatch = (pdfName: string): LabMarker | undefined => {
        const pdfNorm = normalise(pdfName)
        const candidates: LabMarker[] = []

        for (const m of currentMarkers) {
          const dbNorm = normalise(m.name)
          if (dbNorm === pdfNorm) return m // exact — return immediately
          // Phrase match in either direction
          if (containsAsPhrase(pdfNorm, dbNorm) || containsAsPhrase(dbNorm, pdfNorm)) {
            candidates.push(m)
          }
        }

        if (candidates.length === 0) return undefined
        // Among candidates, prefer the most specific (longest DB name = fewest false positives)
        return candidates.sort((a, b) => b.name.length - a.name.length)[0]
      }

      const rows: ExtractedRow[] = (data.results || []).map((r: any) => {
        // Try auto-match via name; fall back to alias map for names the fuzzy matcher misses
        let matched = findBestMatch(String(r.name))
        if (!matched) {
          const aliasedId = aliasMapRef.current.get(String(r.name).toLowerCase())
          if (aliasedId) matched = currentMarkers.find(m => m.id === aliasedId)
        }
        const isActive = matched ? matched.is_active !== false : false
        return { ...r, include: isActive, matchedMarkerId: matched?.id, autoMatchedMarkerId: matched?.id }
      })
      setExtractedRows(rows)
    } catch (err: any) {
      setPdfError('Could not reach the server. Make sure the backend is running.')
    } finally {
      setPdfUploading(false)
    }
  }

  const handleSaveExtracted = async () => {
    if (!extractedRows) return
    setSavingExtracted(true)

    // Save checked rows as lab results
    const toSave = extractedRows.filter(r => r.include && r.value !== '' && r.value !== null && r.value !== undefined)
    const savedItems: { markerName: string; value: number }[] = []
    await Promise.all(toSave.map(row => {
      const matched = labMarkers.find(m => m.id === row.matchedMarkerId)
      const optimal = row.matchedMarkerId ? optimalRanges[row.matchedMarkerId] : null
      const markerName = matched?.name || String(row.name)
      const value = parseFloat(String(row.value))
      savedItems.push({ markerName, value })
      return addResult({
        markerName,
        value,
        unit: row.unit || matched?.unit || '',
        date: new Date().toISOString().split('T')[0],
        minNormal: row.min_normal ?? optimal?.min ?? matched?.min_normal ?? 0,
        maxNormal: row.max_normal ?? optimal?.max ?? matched?.max_normal ?? 100,
      })
    }))

    // Register unknown markers so they auto-match on future uploads:
    // - Accepted (checked) unknown markers → is_active: true (user explicitly accepted them)
    // - Rejected (unchecked) unknown markers → is_active: false (recognised but not active)
    const toRegisterActive   = extractedRows.filter(r =>  r.include && !r.matchedMarkerId && r.name)
    const toRegisterInactive = extractedRows.filter(r => !r.include && !r.matchedMarkerId && r.name)
    await Promise.all([...toRegisterActive, ...toRegisterInactive].map(row =>
      fetch(`${BACKEND_URL}/api/admin/lab-markers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-backend-api-key': BACKEND_KEY },
        body: JSON.stringify({ name: String(row.name), unit: row.unit || null, is_active: toRegisterActive.includes(row) }),
      }).catch(() => { /* best-effort — don't block save on registration failure */ })
    ))

    // Save new aliases for manually-overridden rows where "Save as alias" was checked
    const toAlias = toSave.filter(r => r.saveAlias && r.matchedMarkerId && r.name)
    if (toAlias.length > 0) {
      await Promise.all(toAlias.map(row =>
        fetch(`${BACKEND_URL}/api/admin/lab-markers/${row.matchedMarkerId}/aliases`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-backend-api-key': BACKEND_KEY },
          body: JSON.stringify({ alias: String(row.name) }),
        }).then(r => {
          if (r.ok) aliasMapRef.current.set(String(row.name).toLowerCase(), row.matchedMarkerId!)
        }).catch(() => {})
      ))
    }

    setExtractedRows(null)
    setSavingExtracted(false)

    const msgs = await getTriggerMessagesFromDB(savedItems, userSex)
    if (msgs.length > 0) setTriggerMessages(msgs)
  }

  // Fetch lab markers and optimal ranges from logic_rules in one go
  // Depends on user?.id so it waits until auth is ready before querying
  useEffect(() => {
    if (!user?.id) return

    async function fetchMarkers() {
      setLoadingMarkers(true)
      try {
        const [markersRes, rulesRes, tagsRes, aliasesRes] = await Promise.all([
          supabase.from('lab_markers').select('id, name, unit, min_normal, max_normal, is_active, cpt_code, applicable_sex, marker_category').order('name'),
          supabase.from('logic_rules').select('marker_id, min_value, max_value, tag_to_apply'),
          supabase.from('tags').select('name, scoring_tier'),
          Promise.race([
            fetch(`${BACKEND_URL}/api/admin/lab-markers/aliases-all`, {
              headers: { 'x-backend-api-key': BACKEND_KEY },
            }).then(r => r.ok ? r.json() : []).catch(() => []),
            new Promise<[]>(resolve => setTimeout(() => resolve([]), 5000)),
          ]),
        ])

        // Build alias map: alias.toLowerCase() → marker_id
        if (Array.isArray(aliasesRes)) {
          const map = new Map<string, string>()
          aliasesRes.forEach((a: { alias: string; marker_id: string }) => map.set(a.alias.toLowerCase(), a.marker_id))
          aliasMapRef.current = map
        }

        if (markersRes.error) throw markersRes.error
        if (markersRes.data) setLabMarkers(markersRes.data as LabMarker[])

        // Build optimal range map from logic rules, using DB scoring_tier as source of truth
        // Falls back to hardcoded OPTIMAL_TAGS if tags table unavailable
        if (rulesRes.data) {
          const dbOptimalTags = tagsRes.data
            ? new Set(tagsRes.data.filter((t: { name: string; scoring_tier: string }) => t.scoring_tier === 'optimal').map((t: { name: string }) => t.name))
            : OPTIMAL_TAGS
          const ranges: Record<string, { min: number; max: number }> = {}
          for (const rule of rulesRes.data) {
            if (dbOptimalTags.has(rule.tag_to_apply)) {
              ranges[rule.marker_id] = { min: rule.min_value, max: rule.max_value }
            }
          }
          setOptimalRanges(ranges)
        }
      } catch (err) {
        console.error('Error fetching lab markers:', err)
        setLabMarkers([])
      } finally {
        setLoadingMarkers(false)
      }
    }

    fetchMarkers()
  }, [user?.id])

  const [chartOpenMarker, setChartOpenMarker] = useState<string | null>(null)

  const uniqueMarkers = Array.from(new Set(results.map(r => r.markerName)))

  // 3-section split driven by marker_category (falls back to applicable_sex for older rows)
  const categoryOf = (markerName: string): string => {
    const def = labMarkers.find(m => m.name === markerName)
    if (def?.marker_category) return def.marker_category
    // fallback: applicable_sex male/female → hormone
    if (def?.applicable_sex === 'male' || def?.applicable_sex === 'female') return 'hormone'
    return 'additional'
  }
  const nhlsScoreMarkers  = uniqueMarkers.filter(m => categoryOf(m) === 'nhls_score')
  const hormoneMarkers    = uniqueMarkers.filter(m => categoryOf(m) === 'hormone')
  const additionalMarkers = uniqueMarkers.filter(m => categoryOf(m) === 'additional')
  // "Blood Work" keeps meaning: NHLS scored + additional (everything non-hormone)
  const bloodWorkMarkers  = [...nhlsScoreMarkers, ...additionalMarkers]

  const filteredResults = selectedMarker ? getResultsForMarker(selectedMarker) : results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getStatusColor = (value: number, min: number, max: number) => {
    if (value < min) return '#EF4444'
    if (value > max) return '#EF4444'
    return '#10B981'
  }

  // Prefer logic-rules-derived optimal range over stored min/max on the result row.
  // This keeps the Normal/OOR label consistent with the NHLS score source of truth.
  const getEffectiveRange = (markerName: string, fallbackMin: number, fallbackMax: number) => {
    const markerDef = labMarkers.find(m => m.name === markerName)
    if (markerDef && optimalRanges[markerDef.id]) return optimalRanges[markerDef.id]
    return { min: fallbackMin, max: fallbackMax }
  }

  const handleAddResult = async () => {
    if (!formData.markerName || !formData.value) {
      alert('Please fill in marker name and value')
      return
    }

    // Validate provider verification if enabled
    if (showVerification) {
      if (!verificationForm.verifierName.trim()) {
        alert('Verifier name is required for provider-verified entries.')
        return
      }
      if (!verificationForm.verifierSignature.trim()) {
        alert('Provider signature (typed full name) is required.')
        return
      }
    }

    const selectedMarkerData = labMarkers.find(m => m.name === formData.markerName)
    const minNormal = parseFloat(formData.minNormal) || selectedMarkerData?.min_normal || 0
    const maxNormal = parseFloat(formData.maxNormal) || selectedMarkerData?.max_normal || 100

    addResult({
      markerName: formData.markerName,
      value: parseFloat(formData.value),
      unit: formData.unit || selectedMarkerData?.unit || '',
      date: new Date().toISOString().split('T')[0],
      minNormal,
      maxNormal,
      verificationType: showVerification ? 'provider' : 'self',
      verification: showVerification ? { ...verificationForm } : null,
      lab_set_id: selectedLabSetId || null,
    })

    const msgs = await getTriggerMessagesFromDB(
      [{ markerName: formData.markerName, value: parseFloat(formData.value) }],
      userSex
    )
    if (msgs.length > 0) setTriggerMessages(msgs)

    setFormData({ markerName: '', value: '', unit: '', minNormal: '', maxNormal: '' })
    setShowVerification(false)
    setVerificationForm({ verifierName: '', verifierCredential: '', verifierNpi: '', verifierSignature: '', verifiedAt: new Date().toISOString().split('T')[0] })
    setShowForm(false)
  }

  const handleSelectCommonMarker = (marker: LabMarker) => {
    const optimal = optimalRanges[marker.id]
    setFormData(prev => ({
      ...prev,
      markerName: marker.name,
      unit: marker.unit || '',
      minNormal: optimal ? String(optimal.min) : String(marker.min_normal || 0),
      maxNormal: optimal ? String(optimal.max) : String(marker.max_normal || 100),
    }))
  }

  // Build chart data for a given marker (ascending date order for left→right trend)
  const buildChartData = (markerName: string) => {
    return getResultsForMarker(markerName)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => ({ date: r.date, value: r.value, unit: r.unit }))
  }

  return (
    <div>
      <StaleLabBanner latestLabDate={latestLabDate} />

      {sexLoaded && !userSex && (
        <div style={{
          background: 'rgba(217,119,6,0.08)',
          border: '1px solid #D97706',
          borderRadius: 6,
          padding: '10px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: '#92400e',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontWeight: 600 }}>&#9888; Sex not set:</span>
          {' '}Set your sex in{' '}
          <button
            onClick={() => onNavigate?.('profile')}
            style={{ background: 'none', border: 'none', color: '#D97706', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 13, textDecoration: 'underline' }}
          >
            Profile
          </button>
          {' '}to see sex-specific lab ranges.
        </div>
      )}

      {/* Privacy Disclaimer */}
      <div
        style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: `1.5px solid #93C5FD`,
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
          color: theme.text,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>🔒 Your Data Privacy</div>
        <div style={{ fontSize: 13, color: theme.textMuted }}>
          We only analyze data you manually enter here. We have no access to your actual medical records or health data.
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Lab Results</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>Track your health markers and see personalized resources</p>
      </div>

      {/* Add New Result Button + Upload PDF Button */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowForm(!showForm)}
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
        >
          {showForm ? '✕ Cancel' : '+ Log New Result'}
        </button>

        <button
          onClick={() => pdfInputRef.current?.click()}
          disabled={pdfUploading}
          style={{
            background: pdfUploading ? theme.bgSecondary : 'transparent',
            color: theme.blue,
            border: `1.5px solid ${theme.blue}`,
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: pdfUploading ? 'not-allowed' : 'pointer',
          }}
        >
          {pdfUploading ? 'Extracting...' : 'Upload Lab PDF'}
        </button>
        <input
          ref={pdfInputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) handlePdfUpload(file)
            e.target.value = ''
          }}
        />

        <button
          onClick={() => setShowVo2Calc(true)}
          style={{
            background: 'transparent',
            color: theme.blue,
            border: `1.5px solid ${theme.blue}`,
            borderRadius: 6,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          VO2 Max Calculator
        </button>
      </div>

      {/* VO2 Max Calculator Modal */}
      {showVo2Calc && (
        <Vo2CalcModal
          theme={theme}
          onClose={() => setShowVo2Calc(false)}
          onSave={(percentile) => {
            const vo2Marker = labMarkers.find(m => m.name === 'VO2 Max Percentile')
            addResult({
              markerName: 'VO2 Max Percentile',
              value: percentile,
              unit: 'percentile',
              date: new Date().toISOString().split('T')[0],
              minNormal: vo2Marker?.min_normal ?? 40,
              maxNormal: vo2Marker?.max_normal ?? 100,
              verificationType: 'self',
            })
            setShowVo2Calc(false)
          }}
        />
      )}

      {/* PDF duplicate warning */}
      {pdfDuplicateWarning && (
        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1.5px solid #F59E0B',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 12,
          color: '#92400E',
          fontSize: 14,
        }}>
          <strong>Possible duplicate:</strong> {pdfDuplicateWarning} You can still save the results below if this is intentional.
        </div>
      )}

      {/* PDF extraction error */}
      {pdfError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1.5px solid #EF4444',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          color: '#EF4444',
          fontSize: 14,
        }}>
          {pdfError}
        </div>
      )}

      {/* PDF extraction review table */}
      {extractedRows && (
        <div style={{
          background: theme.card,
          border: `1.5px solid ${theme.borderColor}`,
          borderRadius: 8,
          padding: 20,
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Review Extracted Labs</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.textMuted }}>
                Active markers are checked by default. Unknown markers are unchecked — uncheck to skip or leave checked to save as-is.
              </p>
            </div>
            <button
              onClick={() => setExtractedRows(null)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: theme.textMuted, fontSize: 18 }}
            >✕</button>
          </div>

          {extractedRows.length === 0 ? (
            <p style={{ color: theme.textMuted, fontSize: 14 }}>No numeric lab values were found in this PDF.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: theme.bgSecondary, borderBottom: `1.5px solid ${theme.borderColor}` }}>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Save</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Lab Name</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Matched Marker</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Value</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Unit</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Flag</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Ref Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractedRows.map((row, i) => {
                      const matched = labMarkers.find(m => m.id === row.matchedMarkerId)
                      return (
                        <tr key={i} style={{
                          borderTop: `1px solid ${theme.borderColor}`,
                          opacity: row.include ? 1 : 0.4,
                        }}>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={row.include}
                              onChange={e => setExtractedRows(rows => rows!.map((r, j) =>
                                j === i ? { ...r, include: e.target.checked } : r
                              ))}
                            />
                          </td>
                          <td style={{ padding: '8px 12px' }}>{row.name}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <select
                              value={row.matchedMarkerId || ''}
                              onChange={e => {
                                const val = e.target.value
                                setExtractedRows(rows => rows!.map((r, j) =>
                                  j === i ? { ...r, matchedMarkerId: val || undefined, include: true, saveAlias: false } : r
                                ))
                              }}
                              style={{
                                padding: '4px 6px',
                                border: `1px solid ${theme.borderColor}`,
                                borderRadius: 4,
                                background: theme.bg,
                                color: matched ? (matched.is_active !== false ? theme.blue : theme.textMuted) : '#f59e0b',
                                fontSize: 12,
                                fontWeight: matched ? 400 : 600,
                                maxWidth: 200,
                                cursor: 'pointer',
                              }}
                            >
                              <option value=''>— New marker —</option>
                              {[...labMarkers].sort((a, b) => a.name.localeCompare(b.name)).map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name}{m.is_active === false ? ' (inactive)' : ''}
                                </option>
                              ))}
                            </select>
                            {row.matchedMarkerId && row.matchedMarkerId !== row.autoMatchedMarkerId && (
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 11, color: theme.textMuted, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input
                                  type="checkbox"
                                  checked={!!row.saveAlias}
                                  onChange={e => setExtractedRows(rows => rows!.map((r, j) =>
                                    j === i ? { ...r, saveAlias: e.target.checked } : r
                                  ))}
                                />
                                Remember — save as alias
                              </label>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                              {row.value_str && /^[<>]/.test(row.value_str) && (
                                <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 400 }}>
                                  {row.value_str.charAt(0)}
                                </span>
                              )}
                              <input
                                type="number"
                                value={row.value}
                                onChange={e => setExtractedRows(rows => rows!.map((r, j) =>
                                  j === i ? { ...r, value: e.target.value } : r
                                ))}
                                style={{
                                  width: 80,
                                  padding: '4px 6px',
                                  border: `1px solid ${theme.borderColor}`,
                                  borderRadius: 4,
                                  background: theme.bg,
                                  color: theme.text,
                                  fontSize: 13,
                                  textAlign: 'right',
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', color: theme.textMuted }}>{row.unit}</td>
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {row.flag ? (
                              <span style={{
                                background: row.flag.startsWith('H') ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                                color: row.flag.startsWith('H') ? '#EF4444' : '#3B82F6',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontWeight: 700,
                                fontSize: 12,
                              }}>{row.flag}</span>
                            ) : (
                              <span style={{ color: '#10B981', fontSize: 12, fontWeight: 600 }}>Normal</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px', color: theme.textMuted, fontSize: 12 }}>
                            {row.min_normal != null && row.max_normal != null
                              ? `${row.min_normal} – ${row.max_normal}`
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setExtractedRows(null)}
                  style={{
                    background: 'transparent',
                    color: theme.textMuted,
                    border: `1.5px solid ${theme.borderColor}`,
                    borderRadius: 6,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveExtracted}
                  disabled={savingExtracted || !extractedRows.some(r => r.include)}
                  style={{
                    background: theme.blue,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {savingExtracted ? 'Saving...' : `Save ${extractedRows.filter(r => r.include).length} Result(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add Result Form */}
      {showForm && (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Add Lab Result</h3>

          {loadingMarkers ? (
            <div style={{ color: theme.textMuted }}>Loading markers...</div>
          ) : labMarkers.filter(m => m.is_active !== false && (!m.applicable_sex || m.applicable_sex === 'both' || !userSex || m.applicable_sex === userSex)).length === 0 ? (
            <div style={{ color: theme.textMuted }}>No lab markers available. Please check with an administrator.</div>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: theme.textMuted, textTransform: 'uppercase' }}>
                  Select Marker or Enter Custom
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {labMarkers.filter(m => m.is_active !== false && (!m.applicable_sex || m.applicable_sex === 'both' || !userSex || m.applicable_sex === userSex)).map(marker => (
                    <button
                      key={marker.id}
                      onClick={() => handleSelectCommonMarker(marker)}
                      style={{
                        background: formData.markerName === marker.name ? theme.blue : theme.bg,
                        color: formData.markerName === marker.name ? '#fff' : theme.text,
                        border: `1.5px solid ${formData.markerName === marker.name ? theme.blue : theme.borderColor}`,
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {marker.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Marker Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Blood Glucose"
                    value={formData.markerName}
                    onChange={e => setFormData({ ...formData, markerName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      fontSize: 14,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Unit</label>
                  <input
                    type="text"
                    placeholder="e.g., mg/dL"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      fontSize: 14,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 8 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Your Value</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Enter value"
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      fontSize: 14,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Min Normal</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Min"
                    value={formData.minNormal}
                    onChange={e => setFormData({ ...formData, minNormal: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      fontSize: 14,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: theme.textMuted }}>Max Normal</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Max"
                    value={formData.maxNormal}
                    onChange={e => setFormData({ ...formData, maxNormal: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1.5px solid ${theme.borderColor}`,
                      borderRadius: 6,
                      fontSize: 14,
                      background: theme.bg,
                      color: theme.text,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {/* placeholder — Save button moved below verification section */}
                </div>
              </div>

              {/* Provider Verification toggle */}
              <div style={{ marginBottom: 16 }}>
                <button
                  onClick={() => setShowVerification(v => !v)}
                  style={{ background: 'transparent', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: showVerification ? theme.blue : theme.textMuted, fontWeight: 600 }}
                >
                  {showVerification ? '▾ Provider Verified' : '▸ Add Provider Verification (optional)'}
                </button>
                {showVerification && (
                  <div style={{ marginTop: 12, padding: 16, background: 'rgba(59,130,246,0.05)', border: `1.5px solid ${theme.blue}`, borderRadius: 8 }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: theme.textMuted }}>
                      A clinician, nurse, or fitness professional entered and attests to this value.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: theme.textMuted }}>Verifier Name *</label>
                        <input
                          placeholder="e.g. Dr. Jane Smith"
                          value={verificationForm.verifierName}
                          onChange={e => setVerificationForm(v => ({ ...v, verifierName: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bg, color: theme.text, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: theme.textMuted }}>Credential</label>
                        <input
                          placeholder="e.g. MD, RN, CSCS"
                          value={verificationForm.verifierCredential}
                          onChange={e => setVerificationForm(v => ({ ...v, verifierCredential: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bg, color: theme.text, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: theme.textMuted }}>NPI Number</label>
                        <input
                          placeholder="10-digit NPI (optional)"
                          value={verificationForm.verifierNpi}
                          onChange={e => setVerificationForm(v => ({ ...v, verifierNpi: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bg, color: theme.text, boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: theme.textMuted }}>Date Verified</label>
                        <input
                          type="date"
                          value={verificationForm.verifiedAt}
                          onChange={e => setVerificationForm(v => ({ ...v, verifiedAt: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bg, color: theme.text, boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: theme.textMuted }}>Provider Signature (type full name to attest) *</label>
                      <input
                        placeholder="Full name of verifying provider"
                        value={verificationForm.verifierSignature}
                        onChange={e => setVerificationForm(v => ({ ...v, verifierSignature: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bg, color: theme.text, boxSizing: 'border-box', fontStyle: 'italic' }}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: theme.textMuted }}>
                        By typing your full name you attest that the value above was measured and is accurate to the best of your knowledge.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Lab Set picker */}
              {labSets.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: theme.textMuted }}>Lab Set</label>
                  <select
                    value={selectedLabSetId}
                    onChange={e => setSelectedLabSetId(e.target.value)}
                    style={{ padding: '8px 10px', border: `1.5px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 13, background: theme.bg, color: theme.text, minWidth: 220 }}
                  >
                    {labSets.map(s => (
                      <option key={s.id} value={s.id}>{s.label}{s.is_initial && s.label.toLowerCase() !== 'initial' ? ' (Initial)' : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleAddResult}
                  style={{ background: theme.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Result
                </button>
              </div>
            </>
            )}
        </div>
      )}

      {/* Results Overview — NHLS Score Markers */}
      {nhlsScoreMarkers.length > 0 && (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>NHLS Score Markers</h3>
            <span style={{ fontSize: 12, color: theme.textMuted }}>Used to calculate your NHLS v2.3 score</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {nhlsScoreMarkers.map(marker => {
              const latest = getResultsForMarker(marker)[0]
              const markerHistory = getResultsForMarker(marker)
              const effectiveRange = latest ? getEffectiveRange(marker, latest.minNormal, latest.maxNormal) : null
              const statusColor = latest && effectiveRange ? getStatusColor(latest.value, effectiveRange.min, effectiveRange.max) : theme.textMuted
              const isChartOpen = chartOpenMarker === marker
              const markerDef = labMarkers.find(m => m.name === marker)
              return (
                <div key={marker} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => setSelectedMarker(selectedMarker === marker ? null : marker)}
                    style={{
                      background: selectedMarker === marker ? theme.bgSecondary : 'transparent',
                      border: `1.5px solid ${selectedMarker === marker ? theme.blue : theme.borderColor}`,
                      borderRadius: 6,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: theme.text,
                    }}
                  >
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>{marker}</div>
                    {latest && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>
                          {latest.value} {latest.unit}
                        </div>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{latest.date}</div>
                      </div>
                    )}
                    {markerDef?.cpt_code && (
                      <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 6, opacity: 0.7 }}>CPT: {markerDef.cpt_code}</div>
                    )}
                  </button>
                  {markerHistory.length > 1 && (
                    <button
                      onClick={() => setChartOpenMarker(isChartOpen ? null : marker)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${isChartOpen ? theme.blue : theme.borderColor}`,
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        color: isChartOpen ? theme.blue : theme.textMuted,
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {isChartOpen ? '▲ Hide Trend' : '▼ Show Trend'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Inline trend chart */}
          {chartOpenMarker && nhlsScoreMarkers.includes(chartOpenMarker) && (() => {
            const chartData = buildChartData(chartOpenMarker)
            const latest = getResultsForMarker(chartOpenMarker)[0]
            const markerObj = labMarkers.find(m => m.name === chartOpenMarker)
            const optimal = markerObj ? optimalRanges[markerObj.id] : null
            const unit = latest?.unit || ''
            const values = chartData.map(d => d.value)
            const dataMin = Math.min(...values)
            const dataMax = Math.max(...values)
            const yMin = optimal ? Math.min(dataMin, optimal.min) : dataMin
            const yMax = optimal ? Math.max(dataMax, optimal.max) : dataMax
            const pad = (yMax - yMin) * 0.15 || 1
            return (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{chartOpenMarker} — Trend</div>
                  {optimal && (
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      Optimal range: <span style={{ color: '#10B981', fontWeight: 600 }}>{optimal.min} – {optimal.max} {unit}</span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderColor} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.textMuted as string }} tickLine={false} />
                    <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fontSize: 11, fill: theme.textMuted as string }} tickLine={false} tickFormatter={(v: number) => String(Math.round(v * 10) / 10)} width={40} />
                    <Tooltip contentStyle={{ background: theme.card as string, border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 12 }} labelStyle={{ color: theme.textMuted as string }} formatter={(val: number) => [`${val} ${unit}`, chartOpenMarker]} />
                    {optimal && <ReferenceArea y1={optimal.min} y2={optimal.max} fill="#10B981" fillOpacity={0.08} stroke="#10B981" strokeOpacity={0.3} label="" />}
                    {optimal && <ReferenceLine y={optimal.min} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    {optimal && <ReferenceLine y={optimal.max} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    <Line type="monotone" dataKey="value" stroke={theme.blue as string} strokeWidth={2} dot={{ r: 4, fill: theme.blue as string, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )
          })()}
        </div>
      )}

      {/* Results Overview — Additional Markers */}
      {additionalMarkers.length > 0 && (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Additional Markers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {additionalMarkers.map(marker => {
              const latest = getResultsForMarker(marker)[0]
              const markerHistory = getResultsForMarker(marker)
              const effectiveRange = latest ? getEffectiveRange(marker, latest.minNormal, latest.maxNormal) : null
              const statusColor = latest && effectiveRange ? getStatusColor(latest.value, effectiveRange.min, effectiveRange.max) : theme.textMuted
              const isChartOpen = chartOpenMarker === marker
              const markerDef = labMarkers.find(m => m.name === marker)
              return (
                <div key={marker} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => setSelectedMarker(selectedMarker === marker ? null : marker)}
                    style={{
                      background: selectedMarker === marker ? theme.bgSecondary : 'transparent',
                      border: `1.5px solid ${selectedMarker === marker ? theme.blue : theme.borderColor}`,
                      borderRadius: 6,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: theme.text,
                    }}
                  >
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>{marker}</div>
                    {latest && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>
                          {latest.value} {latest.unit}
                        </div>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{latest.date}</div>
                      </div>
                    )}
                    {markerDef?.cpt_code && (
                      <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 6, opacity: 0.7 }}>CPT: {markerDef.cpt_code}</div>
                    )}
                  </button>
                  {markerHistory.length > 1 && (
                    <button
                      onClick={() => setChartOpenMarker(isChartOpen ? null : marker)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${isChartOpen ? theme.blue : theme.borderColor}`,
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        color: isChartOpen ? theme.blue : theme.textMuted,
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {isChartOpen ? '▲ Hide Trend' : '▼ Show Trend'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Inline trend chart */}
          {chartOpenMarker && additionalMarkers.includes(chartOpenMarker) && (() => {
            const chartData = buildChartData(chartOpenMarker)
            const latest = getResultsForMarker(chartOpenMarker)[0]
            const markerObj = labMarkers.find(m => m.name === chartOpenMarker)
            const optimal = markerObj ? optimalRanges[markerObj.id] : null
            const unit = latest?.unit || ''
            const values = chartData.map(d => d.value)
            const dataMin = Math.min(...values)
            const dataMax = Math.max(...values)
            const yMin = optimal ? Math.min(dataMin, optimal.min) : dataMin
            const yMax = optimal ? Math.max(dataMax, optimal.max) : dataMax
            const pad = (yMax - yMin) * 0.15 || 1
            return (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{chartOpenMarker} — Trend</div>
                  {optimal && (
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      Optimal range: <span style={{ color: '#10B981', fontWeight: 600 }}>{optimal.min} – {optimal.max} {unit}</span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderColor} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.textMuted as string }} tickLine={false} />
                    <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fontSize: 11, fill: theme.textMuted as string }} tickLine={false} tickFormatter={(v: number) => String(Math.round(v * 10) / 10)} width={40} />
                    <Tooltip contentStyle={{ background: theme.card as string, border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 12 }} labelStyle={{ color: theme.textMuted as string }} formatter={(val: number) => [`${val} ${unit}`, chartOpenMarker]} />
                    {optimal && <ReferenceArea y1={optimal.min} y2={optimal.max} fill="#10B981" fillOpacity={0.08} stroke="#10B981" strokeOpacity={0.3} label="" />}
                    {optimal && <ReferenceLine y={optimal.min} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    {optimal && <ReferenceLine y={optimal.max} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    <Line type="monotone" dataKey="value" stroke={theme.blue as string} strokeWidth={2} dot={{ r: 4, fill: theme.blue as string, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )
          })()}
        </div>
      )}

      {/* Results Overview — Hormone Panel */}
      {hormoneMarkers.length > 0 && (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Hormone Panel</h3>
            <span style={{ fontSize: 12, color: theme.textMuted }}>Personal tracking only — not included in NHLS score</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {hormoneMarkers.map(marker => {
              const latest = getResultsForMarker(marker)[0]
              const markerHistory = getResultsForMarker(marker)
              const effectiveRange = latest ? getEffectiveRange(marker, latest.minNormal, latest.maxNormal) : null
              const statusColor = latest && effectiveRange ? getStatusColor(latest.value, effectiveRange.min, effectiveRange.max) : theme.textMuted
              const isChartOpen = chartOpenMarker === marker
              const markerDef = labMarkers.find(m => m.name === marker)
              return (
                <div key={marker} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button
                    onClick={() => setSelectedMarker(selectedMarker === marker ? null : marker)}
                    style={{
                      background: selectedMarker === marker ? theme.bgSecondary : 'transparent',
                      border: `1.5px solid ${selectedMarker === marker ? theme.blue : theme.borderColor}`,
                      borderRadius: 6,
                      padding: 12,
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: theme.text,
                    }}
                  >
                    <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 6 }}>{marker}</div>
                    {latest && (
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: statusColor }}>
                          {latest.value} {latest.unit}
                        </div>
                        <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>{latest.date}</div>
                      </div>
                    )}
                    {markerDef?.cpt_code && (
                      <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 6, opacity: 0.7 }}>CPT: {markerDef.cpt_code}</div>
                    )}
                  </button>
                  {markerHistory.length > 1 && (
                    <button
                      onClick={() => setChartOpenMarker(isChartOpen ? null : marker)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${isChartOpen ? theme.blue : theme.borderColor}`,
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontSize: 11,
                        cursor: 'pointer',
                        color: isChartOpen ? theme.blue : theme.textMuted,
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {isChartOpen ? '▲ Hide Trend' : '▼ Show Trend'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Inline trend chart */}
          {chartOpenMarker && hormoneMarkers.includes(chartOpenMarker) && (() => {
            const chartData = buildChartData(chartOpenMarker)
            const latest = getResultsForMarker(chartOpenMarker)[0]
            const markerObj = labMarkers.find(m => m.name === chartOpenMarker)
            const optimal = markerObj ? optimalRanges[markerObj.id] : null
            const unit = latest?.unit || ''
            const values = chartData.map(d => d.value)
            const dataMin = Math.min(...values)
            const dataMax = Math.max(...values)
            const yMin = optimal ? Math.min(dataMin, optimal.min) : dataMin
            const yMax = optimal ? Math.max(dataMax, optimal.max) : dataMax
            const pad = (yMax - yMin) * 0.15 || 1
            return (
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${theme.borderColor}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{chartOpenMarker} — Trend</div>
                  {optimal && (
                    <div style={{ fontSize: 12, color: theme.textMuted }}>
                      Optimal range: <span style={{ color: '#10B981', fontWeight: 600 }}>{optimal.min} – {optimal.max} {unit}</span>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.borderColor} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: theme.textMuted as string }} tickLine={false} />
                    <YAxis domain={[yMin - pad, yMax + pad]} tick={{ fontSize: 11, fill: theme.textMuted as string }} tickLine={false} tickFormatter={(v: number) => String(Math.round(v * 10) / 10)} width={40} />
                    <Tooltip contentStyle={{ background: theme.card as string, border: `1px solid ${theme.borderColor}`, borderRadius: 6, fontSize: 12 }} labelStyle={{ color: theme.textMuted as string }} formatter={(val: number) => [`${val} ${unit}`, chartOpenMarker]} />
                    {optimal && <ReferenceArea y1={optimal.min} y2={optimal.max} fill="#10B981" fillOpacity={0.08} stroke="#10B981" strokeOpacity={0.3} label="" />}
                    {optimal && <ReferenceLine y={optimal.min} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    {optimal && <ReferenceLine y={optimal.max} stroke="#10B981" strokeDasharray="4 3" strokeOpacity={0.5} />}
                    <Line type="monotone" dataKey="value" stroke={theme.blue as string} strokeWidth={2} dot={{ r: 4, fill: theme.blue as string, strokeWidth: 0 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )
          })()}
        </div>
      )}

      {/* Detailed Results Table */}
      {filteredResults.length > 0 ? (
        <div>
          {selectedMarker && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>History: {selectedMarker}</h3>
              <button
                onClick={() => setSelectedMarker(null)}
                style={{
                  background: 'none',
                  border: `1.5px solid ${theme.borderColor}`,
                  borderRadius: 6,
                  padding: '3px 10px',
                  fontSize: 12,
                  color: theme.textMuted,
                  cursor: 'pointer',
                }}
              >
                Show all
              </button>
            </div>
          )}
          <div
            style={{
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: theme.card,
              }}
            >
              <thead>
                <tr style={{ background: theme.bgSecondary, borderBottom: `1.5px solid ${theme.borderColor}` }}>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: theme.text }}>Date</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: theme.text }}>Marker</th>
                  <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: theme.text }}>Value</th>
                  <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: theme.text }}>Range</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: theme.text }}>Status</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: theme.text }}>NHLS Score</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: theme.text }}>Verified</th>
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: theme.text }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, i) => {
                  const effRange = getEffectiveRange(result.markerName, result.minNormal, result.maxNormal)
                  const status = getStatusColor(result.value, effRange.min, effRange.max)
                  const isNormal = result.value >= effRange.min && result.value <= effRange.max
                  const markerScore = bhasResult?.markerScores.find(
                    m => m.markerName.toLowerCase() === result.markerName.toLowerCase()
                  )
                  const isNotScored = markerScore?.label === 'Not Scored'
                  const scoreBg =
                    markerScore?.score === 1   ? 'rgba(16, 185, 129, 0.12)' :
                    markerScore?.score === 0.5 ? 'rgba(245, 158, 11, 0.12)' :
                    isNotScored                ? 'transparent' :
                                                 'rgba(239, 68, 68, 0.12)'
                  const scoreColor =
                    markerScore?.score === 1   ? '#10B981' :
                    markerScore?.score === 0.5 ? '#D97706' :
                    isNotScored                ? theme.textMuted :
                                                 '#EF4444'
                  return (
                    <tr key={result.id} style={{ borderTop: i > 0 ? `1.5px solid ${theme.borderColor}` : 'none' }}>
                      <td style={{ padding: 12, fontSize: 13 }}>{result.date}</td>
                      <td style={{ padding: 12, fontSize: 13, fontWeight: 600 }}>{result.markerName}</td>
                      <td style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: status }}>
                        {result.value} {result.unit}
                      </td>
                      <td style={{ padding: 12, fontSize: 13, color: theme.textMuted }}>
                        {result.minNormal} - {result.maxNormal}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>
                        <span
                          style={{
                            background: isNormal ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: isNormal ? '#10B981' : '#EF4444',
                            padding: '4px 8px',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {isNormal ? 'Normal' : 'Out of Range'}
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 13 }}>
                        {markerScore ? (
                          <span
                            style={{
                              background: scoreBg,
                              color: scoreColor,
                              padding: '4px 10px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                            title={isNotScored ? 'No scoring rules configured for this marker' : (markerScore.tag || 'No matching rule')}
                          >
                            {isNotScored ? '— Not scored' : `${markerScore.score} — ${markerScore.label}`}
                          </span>
                        ) : (
                          <span style={{ color: theme.textMuted, fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center', fontSize: 12 }}>
                        {result.verificationType === 'provider' && result.verification ? (
                          <span
                            title={`Verified by ${result.verification.verifierName}${result.verification.verifierCredential ? ', ' + result.verification.verifierCredential : ''}${result.verification.verifierNpi ? ' (NPI: ' + result.verification.verifierNpi + ')' : ''} on ${result.verification.verifiedAt}`}
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 4, padding: '3px 8px', fontWeight: 700, cursor: 'default' }}
                          >
                            Provider
                          </span>
                        ) : result.verificationType === 'pdf' ? (
                          <span style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb', borderRadius: 4, padding: '3px 8px', fontWeight: 700 }}>PDF</span>
                        ) : (
                          <span style={{ color: theme.textMuted }}>Self</span>
                        )}
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => removeResult(result.id)}
                          style={{
                            background: 'transparent',
                            color: '#EF4444',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 48,
            textAlign: 'center',
            color: theme.textMuted,
          }}
        >
          <p style={{ margin: 0 }}>No lab results logged yet. Click "Log New Result" to get started.</p>
        </div>
      )}

      {/* F90 — Lab Progress Comparison */}
      <LabSetsComparison theme={theme} />

      {triggerMessages && (
        <LabTriggerMessagesModal
          messages={triggerMessages}
          onClose={() => setTriggerMessages(null)}
        />
      )}
    </div>
  )
}
