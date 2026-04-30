import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, getStoredJwt, getStoredSession } from '../lib/supabase'
import { generatePublicId } from '../utils/publicId'

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
  const initializedRef = useRef(false)

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true

    // Read JWT directly from localStorage — never calls getSession() which can
    // deadlock the auth client if a SIGNED_IN event is already in-flight.
    const initializeAuth = async () => {
      try {
        const jwt = getStoredJwt()
        console.log('[Auth] JWT found in localStorage:', !!jwt)

        if (!jwt) {
          console.log('[Auth] No stored JWT — not logged in')
          if (mounted) {
            setLoading(false)
            initializedRef.current = true
          }
          return
        }

        // Decode user id and email from the JWT payload (no network call)
        let userId: string
        let userEmail: string
        let userName: string
        try {
          const payload = JSON.parse(atob(jwt.split('.')[1]))
          userId = payload.sub
          userEmail = payload.email || ''
          userName = payload.user_metadata?.name || ''
        } catch {
          console.warn('[Auth] Could not decode JWT payload — clearing session')
          if (mounted) {
            setLoading(false)
            initializedRef.current = true
          }
          return
        }

        // Hydrate the Supabase JS client session so its own queries (insert/update/delete)
        // can authenticate via RLS. setSession() does not call getSession().
        const storedSession = getStoredSession()
        if (storedSession) {
          await supabase.auth.setSession(storedSession)
          console.log('[Auth] Supabase client session hydrated')
        }

        // Set basic user immediately so the UI unblocks
        if (mounted) {
          setUser({ id: userId, email: userEmail, name: userName, role: 'user' })
          console.log('[Auth] User set from JWT:', userId)
        }

        // Fetch profile (name + role) via plain fetch — bypasses auth client entirely
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
        for (let i = 0; i < 3; i++) {
          try {
            console.log(`[Auth] Fetching profile (attempt ${i + 1})...`)
            const res = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?select=name,role&id=eq.${userId}&limit=1`,
              {
                headers: {
                  'apikey': SUPABASE_ANON_KEY,
                  'Authorization': `Bearer ${jwt}`,
                  'Accept': 'application/json',
                },
              }
            )
            if (!mounted) return
            if (res.ok) {
              const rows = await res.json()
              const profile = rows?.[0]
              if (profile) {
                console.log('[Auth] Profile loaded, role:', profile.role)
                setUser({ id: userId, email: userEmail, name: profile.name || userName, role: (profile.role || 'user') as UserRole })
                break
              }
            } else if (res.status === 401) {
              // JWT expired — clear user so login page shows
              console.warn('[Auth] JWT expired (401) — clearing session')
              if (mounted) setUser(null)
              break
            }
          } catch (profileErr) {
            console.warn(`[Auth] Profile fetch exception (attempt ${i + 1}):`, profileErr)
            if (i < 2) await new Promise(r => setTimeout(r, 500))
          }
        }

        if (mounted) {
          setLoading(false)
          initializedRef.current = true
        }
      } catch (err) {
        console.error('[Auth] Init error:', err)
        if (mounted) {
          setLoading(false)
          initializedRef.current = true
        }
      }
    }

    initializeAuth()

    // Listen for auth state changes after initial load
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event)
      if (!mounted) return

      // Ignore INITIAL_SESSION event - we handle that in initializeAuth
      if (event === 'INITIAL_SESSION') {
        return
      }

      // Ignore events while we're still initializing
      if (!initializedRef.current) {
        console.log('[Auth] Ignoring event during initialization:', event)
        return
      }

      if (event === 'SIGNED_OUT') {
        console.log('[Auth] Signed out')
        setUser(null)
        return
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // If user is already set with this ID, don't overwrite (avoids losing role)
        // This can happen when Supabase fires SIGNED_IN after we already loaded via getSession
        setUser(currentUser => {
          if (currentUser?.id === session.user.id) {
            console.log('[Auth] User already set, keeping existing data')
            return currentUser
          }
          // New user signing in - set basic info and fetch profile
          return {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || '',
            role: 'user' as UserRole,
          }
        })

        // Only fetch profile if this is a different user
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .single()

        if (profile && mounted) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile.name || '',
            role: (profile.role || 'user') as UserRole,
          })
        }
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
          emailRedirectTo: undefined,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data?.user) {
        // Profile is automatically created by the on_auth_user_created trigger.
        // Assign a system-generated public_id (HIPAA-safe de-identified token).
        // Retry a few times in case the trigger hasn't fired yet.
        const publicId = generatePublicId()
        for (let i = 0; i < 3; i++) {
          const { error: pidError } = await supabase
            .from('profiles')
            .update({ public_id: publicId })
            .eq('id', data.user.id)
            .is('public_id', null)
          if (!pidError) break
          await new Promise(r => setTimeout(r, 400))
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
    console.log('[Auth] Logging out...')
    try {
      // Clear user state immediately for responsive UI
      setUser(null)

      // Wipe all localStorage first so the Supabase client cannot restore
      // the session after signOut rewrites its internal state
      localStorage.clear()

      // Now sign out — scope: 'global' invalidates the refresh token server-side
      // so the cleared token cannot be used to re-authenticate
      await supabase.auth.signOut({ scope: 'global' })

      console.log('[Auth] Logout complete')
    } catch (err) {
      console.error('[Auth] Logout error:', err)
      setUser(null)
      localStorage.clear()
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
