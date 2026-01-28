import React, { useEffect, useState } from 'react'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { ThemeProvider } from './context/ThemeContext'
import { ResultsProvider } from './context/ResultsContext'
import { EvaluationProvider } from './context/EvaluationContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Onboarding from './pages/Onboarding'
import LabInput from './pages/LabInput'
import Results from './pages/Results'
import Admin from './pages/Admin'
import Dashboard from './pages/Dashboard'
import Resources from './pages/ResourcesPage'
import Labs from './pages/LabsPage'
import Profile from './pages/ProfilePage'
import { loadSampleData, SampleData } from './sample-data'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

function createOptionalSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

function AppContent() {
  const [supabase] = useState<SupabaseClient | null>(() => createOptionalSupabase())
  const [data, setData] = useState<SampleData | null>(null)
  const [dataSource, setDataSource] = useState<'supabase' | 'sample' | 'none'>('none')
  const [currentPage, setCurrentPage] = useState<string>('home')
  const [showOnboard, setShowOnboard] = useState(true)
  const [tags, setTags] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentRoute, setCurrentRoute] = useState<string>('login')
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    let mounted = true
    async function init() {
      // Prefer Supabase when configured, but be explicit about what we received so debugging is easy
      if (supabase) {
        try {
          const [{ data: lm, error: lmErr }, { data: lr, error: lrErr }, { data: r, error: rErr }] = await Promise.all([
            supabase.from('lab_markers').select('id,name,unit'),
            supabase.from('logic_rules').select('marker_id,min_value,max_value,tag_to_apply'),
            supabase.from('resources').select('type,title,description,link_url,tags')
          ])

          // Log detailed results for debugging (visible in DevTools)
          console.debug('Supabase query results', {
            lab_markers_count: (lm || []).length,
            logic_rules_count: (lr || []).length,
            resources_count: (r || []).length,
            errors: { lmErr, lrErr, rErr }
          })

          if (!mounted) return

          // If queries returned usable rows, use them; otherwise fall back to sample data
          const hasRows = (lm && lm.length > 0) || (lr && lr.length > 0) || (r && r.length > 0)
          if (hasRows && !lmErr && !lrErr && !rErr) {
            const normalizeTags = (t: any): string[] => {
              if (!t) return []
              if (Array.isArray(t)) return t.map(String).map(s => s.trim())
              // Postgres text[] sometimes arrives as a string like '{a,b}' — handle that
              if (typeof t === 'string') return t.replace(/^[{]|[}]$/g, '').split(',').map(s => s.trim()).filter(Boolean)
              return []
            }
            const normalizedResources = (r || []).map((res: any) => ({ ...res, tags: normalizeTags(res.tags) }))
            setData({ lab_markers: lm || [], logic_rules: lr || [], resources: normalizedResources })
            setDataSource('supabase')
            return
          }

          console.warn('Supabase connected but returned no rows or errors — falling back to sample data', { lmErr, lrErr, rErr })
        } catch (err) {
          console.warn('Supabase read failed (exception), falling back to sample data', err)
        }
      }

      // fallback
      setData(loadSampleData())
      setDataSource('sample')
    }
    init()
    return () => { mounted = false }
  }, [supabase, refreshKey])

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) || '/'
      if (hash === '/login' || hash === '/signup' || hash === '/') {
        setCurrentRoute(hash === '/' ? 'login' : hash.slice(1))
      } else if (isAuthenticated) {
        // Navigate to dashboard if authenticated
        const route = hash.split('/')[1] || 'home'
        setCurrentRoute(route)
      } else {
        // Redirect to login if not authenticated
        setCurrentRoute('login')
        window.location.hash = '#/login'
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Initial route
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isAuthenticated])

  // Handle auth state changes
  useEffect(() => {
    if (loading) return
    
    if (!isAuthenticated && currentRoute !== 'login' && currentRoute !== 'signup') {
      window.location.hash = '#/login'
    } else if (isAuthenticated && (currentRoute === 'login' || currentRoute === 'signup')) {
      window.location.hash = '#/home'
    }
  }, [isAuthenticated, loading, currentRoute])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Loading...</p>
      </div>
    )
  }

  // Route to login/signup pages
  if (currentRoute === 'login') {
    return <LoginPage />
  }

  if (currentRoute === 'signup') {
    return <SignupPage />
  }

  // All other routes require authentication
  if (!isAuthenticated) {
    return <LoginPage />
  }

  if (!data) return <div className="center">Loading…</div>

  if (showOnboard) {
    return <Onboarding onClose={() => setShowOnboard(false)} />
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  return (
    <ProtectedRoute>
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onLogout={() => { window.location.hash = '#/login' }}>
        {currentPage === 'home' && <Dashboard recentResources={data.resources.slice(0, 3)} bookmarkedCount={2} onNavigate={handleNavigate} />}
        {currentPage === 'resources' && <Resources />}
        {currentPage === 'labs' && <Labs />}
        {currentPage === 'profile' && <Profile userEmail="user@example.com" userName="John Doe" />}
        {currentPage === 'admin' && <Admin onResourcesChanged={() => setRefreshKey(k => k + 1)} />}
      </Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ResultsProvider>
          <EvaluationProvider>
            <AppContent />
          </EvaluationProvider>
        </ResultsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
