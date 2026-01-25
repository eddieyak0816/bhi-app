import React from 'react'

export default function Onboarding({ onClose }: { onClose: () => void }) {
  return (
    <div className="card onboarding">
      <h2>Welcome to Balanced Health Institute</h2>
      <p style={{fontSize:16,lineHeight:1.6,color:'var(--text-secondary)',marginTop:8}}>
        Your trusted resource for evidence-based health education. This platform provides curated educational content to help you understand your lab results.
      </p>

      <div style={{background:'#FFF7ED',padding:16,borderRadius:6,marginTop:20,marginBottom:20,borderLeft:'3px solid var(--warning)'}}>
        <strong style={{fontSize:14,color:'var(--text-primary)'}}>Important:</strong>
        <p style={{margin:'6px 0 0 0',fontSize:14,color:'var(--text-secondary)'}}>
          This is an educational tool, not a medical diagnostic service. Always consult your healthcare provider for medical advice.
        </p>
      </div>

      <h3 style={{fontSize:18,marginTop:24,marginBottom:12}}>How to Use This Platform</h3>
      <ol style={{fontSize:15,lineHeight:1.8}}>
        <li>Select your lab test from the dropdown menu (e.g., Vitamin D, Glucose)</li>
        <li>Enter your test result value (optional)</li>
        <li>Click "View Resources" to see relevant educational materials</li>
      </ol>

      <div className="actions">
        <button onClick={onClose} className="btn-primary">Get Started</button>
        <button onClick={onClose} className="btn-ghost">Skip Introduction</button>
      </div>
    </div>
  )
}
