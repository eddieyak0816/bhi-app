import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
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
  const initializedRef = useRef(false)

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true

    // Check for existing session first
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('[Auth] getSession result:', session?.user?.id, error)

        if (!mounted) return

        if (error) {
          console.error('[Auth] getSession error:', error)
          setLoading(false)
          initializedRef.current = true
          return
        }

        if (session?.user) {
          // Set basic user info immediately
          const basicUser = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || '',
            role: 'user' as UserRole,
          }
          setUser(basicUser)
          console.log('[Auth] Session found, user set')

          // Fetch profile for role - add retry logic
          const fetchProfile = async (retries = 3): Promise<void> => {
            for (let i = 0; i < retries; i++) {
              try {
                console.log(`[Auth] Fetching profile (attempt ${i + 1})...`)
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('name, role')
                  .eq('id', session.user.id)
                  .single()

                if (!mounted) return

                if (!profileError && profile) {
                  console.log('[Auth] Profile loaded successfully, role:', profile.role)
                  setUser({
                    id: session.user.id,
                    email: session.user.email || '',
                    name: profile.name || '',
                    role: (profile.role || 'user') as UserRole,
                  })
                  return
                } else if (profileError) {
                  console.warn(`[Auth] Profile fetch error (attempt ${i + 1}):`, profileError.message, profileError.code)
                  // If it's a "not found" error, the profile might not exist yet
                  if (profileError.code === 'PGRST116' && i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500))
                    continue
                  }
                }
              } catch (profileErr) {
                console.warn(`[Auth] Profile fetch exception (attempt ${i + 1}):`, profileErr)
                if (i < retries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500))
                }
              }
            }
          }
          await fetchProfile()
        } else {
          console.log('[Auth] No existing session')
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
    console.log('[Auth] Logging out...')
    try {
      // Clear user state immediately for responsive UI
      setUser(null)
      await supabase.auth.signOut()
      console.log('[Auth] Logout complete')
    } catch (err) {
      console.error('[Auth] Logout error:', err)
      // Still clear user even if signOut fails
      setUser(null)
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
