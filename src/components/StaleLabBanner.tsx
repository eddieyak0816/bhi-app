import React from 'react'
import { isLabDataStale, daysSinceLastLab } from '../utils/staleCheck'
import { useTheme } from '../context/ThemeContext'

interface StaleLabBannerProps {
  latestLabDate: string | null
  onNavigate?: (page: string) => void
}

export default function StaleLabBanner({ latestLabDate, onNavigate }: StaleLabBannerProps) {
  const { theme } = useTheme()

  if (!latestLabDate || !isLabDataStale(latestLabDate)) return null

  const days = daysSinceLastLab(latestLabDate)

  return (
    <div
      style={{
        background: 'rgba(217, 119, 6, 0.08)',
        border: '1.5px solid #D97706',
        borderRadius: 8,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontWeight: 600, color: '#D97706', marginBottom: 2 }}>
          Lab results are {days} days old
        </div>
        <div style={{ fontSize: 13, color: theme.textMuted }}>
          For accurate health scoring, update your labs every 6 months.
        </div>
      </div>
      {onNavigate && (
        <button
          onClick={() => onNavigate('labs')}
          style={{
            background: '#D97706',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 14px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Log New Results
        </button>
      )}
    </div>
  )
}
