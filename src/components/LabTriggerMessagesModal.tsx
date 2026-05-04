import React from 'react'
import { useTheme } from '../context/ThemeContext'
import { TriggerMessage, TriggerLevel } from '../utils/labTriggerMessages'

interface Props {
  messages: TriggerMessage[]
  onClose: () => void
}

const LEVEL_STYLES: Record<TriggerLevel, { border: string; bg: string; icon: string; iconColor: string }> = {
  success: { border: '#10B981', bg: '#F0FDF4', icon: '✓', iconColor: '#10B981' },
  warning: { border: '#F59E0B', bg: '#FFFBEB', icon: '!', iconColor: '#F59E0B' },
  danger:  { border: '#EF4444', bg: '#FEF2F2', icon: '!', iconColor: '#EF4444' },
}

const LEVEL_LABEL: Record<TriggerLevel, string> = {
  success: 'Optimal',
  warning: 'Needs Attention',
  danger:  'Out of Range',
}

export default function LabTriggerMessagesModal({ messages, onClose }: Props) {
  const { theme, darkMode } = useTheme()

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: theme.bgSecondary,
          borderRadius: 12,
          border: `1.5px solid ${theme.borderColor}`,
          width: '100%',
          maxWidth: 560,
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${theme.borderColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>
              Your Lab Results
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: theme.textMuted }}>
              Personalized insights based on your values
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 20, color: theme.textMuted, lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Messages list */}
        <div style={{ overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => {
            const s = LEVEL_STYLES[msg.level]
            const bgColor = darkMode ? (
              msg.level === 'success' ? '#052e16' :
              msg.level === 'warning' ? '#451a03' : '#450a0a'
            ) : s.bg
            const borderColor = s.border

            return (
              <div
                key={i}
                style={{
                  borderRadius: 10,
                  border: `1.5px solid ${borderColor}`,
                  background: bgColor,
                  padding: '16px 18px',
                }}
              >
                {/* Level badge + headline */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{
                    flexShrink: 0,
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: borderColor,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    {s.icon}
                  </span>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', color: borderColor,
                    }}>
                      {LEVEL_LABEL[msg.level]}
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 600, color: theme.text }}>
                      {msg.headline}
                    </p>
                  </div>
                </div>

                {/* Body */}
                <p style={{ margin: '0 0 10px', fontSize: 13, color: theme.textMuted, lineHeight: 1.5 }}>
                  {msg.body}
                </p>

                {/* Action steps */}
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {msg.actions.map((a, j) => (
                    <li key={j} style={{ fontSize: 13, color: theme.text, lineHeight: 1.4 }}>{a}</li>
                  ))}
                </ul>

                {/* Escalation notice */}
                {msg.escalate && (
                  <p style={{
                    margin: '12px 0 0',
                    fontSize: 12,
                    fontWeight: 600,
                    color: borderColor,
                    borderTop: `1px solid ${borderColor}`,
                    paddingTop: 10,
                  }}>
                    {msg.escalate}
                  </p>
                )}
              </div>
            )
          })}

          {/* HIPAA note */}
          <p style={{ margin: 0, fontSize: 11, color: theme.textMuted, textAlign: 'center' }}>
            These insights are shown only to you and are never shared with employers or third parties.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: `1px solid ${theme.borderColor}`,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              background: theme.blue,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '9px 24px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
