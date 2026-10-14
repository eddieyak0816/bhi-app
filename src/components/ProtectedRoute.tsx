import React from 'react'
import { useAuth, UserRole } from '../context/AuthContext'
import LoginPage from '../pages/LoginPage'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole | UserRole[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-center">
        <div className="app-spin" aria-hidden="true" />
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (requiredRole) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!user || !requiredRoles.includes(user.role)) {
      return (
        <div className="app-center">
          <div className="app-card">
            <div className="app-ic" aria-hidden="true">🔒</div>
            <h1>Access Denied</h1>
            <p style={{ marginBottom: 0 }}>You don't have permission to access this page.</p>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
