import React, { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useResults } from '../context/ResultsContext'

export default function Labs() {
  const { theme } = useTheme()
  const { results, addResult, removeResult, getResultsForMarker } = useResults()
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    markerName: '',
    value: '',
    unit: '',
    minNormal: '',
    maxNormal: '',
  })

  const commonMarkers = [
    { name: 'Blood Glucose', unit: 'mg/dL', minNormal: 70, maxNormal: 100 },
    { name: 'Cholesterol', unit: 'mg/dL', minNormal: 0, maxNormal: 200 },
    { name: 'HDL', unit: 'mg/dL', minNormal: 40, maxNormal: 500 },
    { name: 'LDL', unit: 'mg/dL', minNormal: 0, maxNormal: 100 },
    { name: 'Triglycerides', unit: 'mg/dL', minNormal: 0, maxNormal: 150 },
    { name: 'Blood Pressure Systolic', unit: 'mmHg', minNormal: 90, maxNormal: 120 },
    { name: 'Blood Pressure Diastolic', unit: 'mmHg', minNormal: 60, maxNormal: 80 },
  ]

  const uniqueMarkers = Array.from(new Set(results.map(r => r.markerName)))
  const filteredResults = selectedMarker ? getResultsForMarker(selectedMarker) : results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const getStatusColor = (value: number, min: number, max: number) => {
    if (value < min) return '#EF4444'
    if (value > max) return '#EF4444'
    return '#10B981'
  }

  const handleAddResult = () => {
    if (!formData.markerName || !formData.value) {
      alert('Please fill in marker name and value')
      return
    }

    const selectedMarkerData = commonMarkers.find(m => m.name === formData.markerName)
    const minNormal = parseFloat(formData.minNormal) || selectedMarkerData?.minNormal || 0
    const maxNormal = parseFloat(formData.maxNormal) || selectedMarkerData?.maxNormal || 100

    addResult({
      markerName: formData.markerName,
      value: parseFloat(formData.value),
      unit: formData.unit || selectedMarkerData?.unit || '',
      date: new Date().toISOString().split('T')[0],
      minNormal,
      maxNormal,
    })

    setFormData({
      markerName: '',
      value: '',
      unit: '',
      minNormal: '',
      maxNormal: '',
    })
    setShowForm(false)
  }

  const handleSelectCommonMarker = (marker: { name: string; unit: string; minNormal: number; maxNormal: number }) => {
    setFormData(prev => ({
      ...prev,
      markerName: marker.name,
      unit: marker.unit,
      minNormal: String(marker.minNormal),
      maxNormal: String(marker.maxNormal),
    }))
  }

  return (
    <div>
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

      {/* Add New Result Button */}
      <div style={{ marginBottom: 24 }}>
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
      </div>

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

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: theme.textMuted, textTransform: 'uppercase' }}>
              Select Marker or Enter Custom
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 16 }}>
              {commonMarkers.map(marker => (
                <button
                  key={marker.name}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
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
              <button
                onClick={handleAddResult}
                style={{
                  background: theme.blue,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Save Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Overview */}
      {uniqueMarkers.length > 0 && (
        <div
          style={{
            background: theme.card,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Your Markers</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {uniqueMarkers.map(marker => {
              const latest = getResultsForMarker(marker)[0]
              const statusColor = latest ? getStatusColor(latest.value, latest.minNormal, latest.maxNormal) : theme.textMuted
              return (
                <button
                  key={marker}
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
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Detailed Results Table */}
      {filteredResults.length > 0 ? (
        <div>
          {selectedMarker && <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>History: {selectedMarker}</h3>}
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
                  <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: theme.text }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result, i) => {
                  const status = getStatusColor(result.value, result.minNormal, result.maxNormal)
                  const isNormal = result.value >= result.minNormal && result.value <= result.maxNormal
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
    </div>
  )
}
