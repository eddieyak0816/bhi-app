import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'user' | 'admin' | 'super_admin'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, name: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user && mounted) {
          // Fetch user role from profiles table
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile?.name || '',
            role: (profile?.role || 'user') as UserRole,
          })
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .single()

        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: profile?.name || '',
          role: (profile?.role || 'user') as UserRole,
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data?.user) {
        // Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', data.user.id)
          .single()

        setUser({
          id: data.user.id,
          email: data.user.email || '',
          name: profile?.name || '',
          role: (profile?.role || 'user') as UserRole,
        })

        return { success: true }
      }

      return { success: false, error: 'Login failed' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const signup = async (email: string, name: string, password: string) => {
    try {
      // Validate password requirements: min 6 chars, uppercase, lowercase, number
      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
      }
      if (!/[A-Z]/.test(password)) {
        return { success: false, error: 'Password must include an uppercase letter' }
      }
      if (!/[a-z]/.test(password)) {
        return { success: false, error: 'Password must include a lowercase letter' }
      }
      if (!/[0-9]/.test(password)) {
        return { success: false, error: 'Password must include a number' }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data?.user) {
        // Create profile with default user role
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            name,
            role: 'user',
          })

        if (profileError) {
          return { success: false, error: profileError.message }
        }

        setUser({
          id: data.user.id,
          email,
          name,
          role: 'user',
        })

        return { success: true }
      }

      return { success: false, error: 'Signup failed' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        isAdmin: user?.role === 'admin' || user?.role === 'super_admin',
        isSuperAdmin: user?.role === 'super_admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
