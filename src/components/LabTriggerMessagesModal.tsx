import React from 'react'
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
  return (
    <div className="md-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="md" role="dialog" aria-modal="true" aria-label="Your Lab Results">
        {/* Header */}
        <div className="md-head">
          <div>
            <h2>Your Lab Results</h2>
            <p>Personalized insights based on your values</p>
          </div>
          <button className="md-x" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Messages list */}
        <div className="md-body">
          <div className="md-list">
            {messages.map((msg, i) => {
              const s = LEVEL_STYLES[msg.level]
              return (
                <div key={i} className={`md-msg ${msg.level}`}>
                  {/* Level badge + headline */}
                  <div className="md-msg-top">
                    <span className="md-ic">{s.icon}</span>
                    <div>
                      <span className="md-lvl">{LEVEL_LABEL[msg.level]}</span>
                      <p className="md-hl">{msg.headline}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <p className="md-msg-body">{msg.body}</p>

                  {/* Action steps */}
                  <ul>
                    {msg.actions.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>

                  {/* Escalation notice */}
                  {msg.escalate && <p className="md-esc">{msg.escalate}</p>}
                </div>
              )
            })}

            {/* HIPAA note */}
            <p className="md-hipaa">
              These insights are shown only to you and are never shared with employers or third parties.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="md-foot">
          <button className="md-btn primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  )
}
