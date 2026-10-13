import React from 'react'

interface AuthBrandProps {
  /** Headline; wrap the part that should be lime in a <span>. */
  title: React.ReactNode
  /** Supporting sentence, hidden on small screens (see styles.css .auth-pitch p). */
  text: string
}

/**
 * Forest-green brand panel shared by the login and signup screens ("Vital" design,
 * chosen by Damon from public/preview/). Pure presentation — styles live in styles.css
 * under .auth-*, and the panel is always dark green in both light and dark mode.
 */
export default function AuthBrand({ title, text }: AuthBrandProps) {
  return (
    <aside className="auth-brand">
      <svg className="auth-rings" viewBox="0 0 340 340" fill="none" aria-hidden="true">
        <circle cx="170" cy="170" r="160" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
        <circle cx="170" cy="170" r="122" stroke="rgba(255,255,255,0.09)" strokeWidth="1.5" />
        <circle cx="170" cy="170" r="84" stroke="rgba(184,230,46,0.28)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray="528" strokeDashoffset="132" transform="rotate(-90 170 170)" />
      </svg>

      <div className="auth-logo">
        <div className="auth-mark"><i /></div>
        <div className="auth-logo-t">National<br />Health League</div>
      </div>

      <div className="auth-pitch">
        <h2>{title}</h2>
        <p>{text}</p>
      </div>

      <div className="auth-trust">
        We only analyze data you enter yourself. We have no access to your medical records or health data.
      </div>
    </aside>
  )
}
