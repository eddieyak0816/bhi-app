import React from 'react'

export default function Onboarding({ onClose }: { onClose: () => void }) {
  return (
    <div className="card onboarding">
      <h2>Welcome to Balanced Health</h2>
      <p>Short, trusted health info for employees. Not medical advice.</p>
      <ol>
        <li>Type a test name (example: Vitamin D)</li>
        <li>Type the number from your lab (optional)</li>
        <li>Tap "See resources" to learn more</li>
      </ol>
      <div className="actions">
        <button onClick={onClose} className="btn-primary">All set</button>
        <button onClick={onClose} className="btn-ghost">Skip intro</button>
      </div>
    </div>
  )
}
