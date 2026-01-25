import React, { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

interface ProfilePageProps {
  userEmail?: string
  userName?: string
}

export default function Profile({ userEmail = 'user@example.com', userName = 'User' }: ProfilePageProps) {
  const { theme } = useTheme()
  const [formData, setFormData] = useState({
    fullName: userName,
    email: userEmail,
    age: '',
    healthGoals: ['Weight Management', 'Energy Levels'],
    preferredResourceTypes: ['Articles', 'Videos'],
    notificationsEnabled: true,
    emailUpdates: false,
  })

  const resourceTypes = ['Articles', 'Videos', 'Podcasts', 'Infographics', 'Research Papers']
  const allGoals = ['Weight Management', 'Energy Levels', 'Blood Sugar Control', 'Heart Health', 'Inflammation', 'Other']

  const handleGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal) ? prev.healthGoals.filter(g => g !== goal) : [...prev.healthGoals, goal],
    }))
  }

  const handleResourceTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      preferredResourceTypes: prev.preferredResourceTypes.includes(type) ? prev.preferredResourceTypes.filter(t => t !== type) : [...prev.preferredResourceTypes, type],
    }))
  }

  const sectionStyle = {
    background: theme.card,
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: theme.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1.5px solid ${theme.borderColor}`,
    borderRadius: 6,
    fontSize: 14,
    background: theme.bg,
    color: theme.text,
    marginBottom: 16,
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Profile Settings</h2>
        <p style={{ color: theme.textMuted, margin: 0 }}>Manage your account and preferences</p>
      </div>

      {/* Personal Information */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Personal Information</h3>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={e => setFormData({ ...formData, fullName: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={formData.email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
        </div>
        <div>
          <label style={labelStyle}>Age</label>
          <input
            type="number"
            value={formData.age}
            onChange={e => setFormData({ ...formData, age: e.target.value })}
            placeholder="Enter your age"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Health Goals */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Health Goals</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Select your primary health focus areas</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, alignItems: 'stretch' }}>
          {allGoals.map(goal => (
            <label
              key={goal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 52,
                padding: '0 12px',
                boxSizing: 'border-box',
                lineHeight: '20px',
                background: theme.bg,
                border: `1.5px solid ${formData.healthGoals.includes(goal) ? theme.blue : theme.borderColor}`,
                borderRadius: 6,
                cursor: 'pointer',
                color: theme.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <input
                type="checkbox"
                checked={formData.healthGoals.includes(goal)}
                onChange={() => handleGoalToggle(goal)}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{goal}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Content Preferences */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>Preferred Content Types</h3>
        <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Choose the formats you prefer</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, alignItems: 'stretch' }}>
          {resourceTypes.map(type => (
            <label
              key={type}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 52,
                padding: '0 12px',
                boxSizing: 'border-box',
                lineHeight: '20px',
                background: theme.bg,
                border: `1.5px solid ${formData.preferredResourceTypes.includes(type) ? theme.blue : theme.borderColor}`,
                borderRadius: 6,
                cursor: 'pointer',
                color: theme.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <input
                type="checkbox"
                checked={formData.preferredResourceTypes.includes(type)}
                onChange={() => handleResourceTypeToggle(type)}
                style={{ cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{type}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div style={sectionStyle}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 600 }}>Notifications</h3>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            background: theme.bg,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 12,
            color: theme.text,
          }}
        >
          <input
            type="checkbox"
            checked={formData.notificationsEnabled}
            onChange={e => setFormData({ ...formData, notificationsEnabled: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>In-App Notifications</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Get alerts about new resources and lab results</div>
          </div>
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            background: theme.bg,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            cursor: 'pointer',
            color: theme.text,
          }}
        >
          <input
            type="checkbox"
            checked={formData.emailUpdates}
            onChange={e => setFormData({ ...formData, emailUpdates: e.target.checked })}
            style={{ cursor: 'pointer' }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Email Updates</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Weekly summary of new resources</div>
          </div>
        </label>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          style={{
            background: theme.blue,
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            flex: 1,
          }}
        >
          Save Changes
        </button>
        <button
          style={{
            background: 'transparent',
            color: theme.text,
            border: `1.5px solid ${theme.borderColor}`,
            borderRadius: 6,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>

      {/* Danger Zone */}
      <div
        style={{
          marginTop: 32,
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1.5px solid #FCA5A5`,
          borderRadius: 8,
          padding: 20,
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#DC2626' }}>Danger Zone</h3>
        <button
          style={{
            background: 'transparent',
            color: '#DC2626',
            border: `1.5px solid #FCA5A5`,
            borderRadius: 6,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Delete Account
        </button>
      </div>
    </div>
  )
}
