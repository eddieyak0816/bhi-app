import React, { useEffect, useState } from 'react'
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
import Categories from './pages/CategoriesPage'
import Labs from './pages/LabsPage'
import Profile from './pages/ProfilePage'
import ConsentPage from './pages/ConsentPage'
import PublicProfilePage from './pages/PublicProfilePage'
import { loadSampleData, SampleData } from './sample-data'
import { supabase } from './lib/supabase'

function AppContent() {
  const [data, setData] = useState<SampleData | null>(null)
  const [dataSource, setDataSource] = useState<'supabase' | 'sample' | 'none'>('none')
  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Initialize from hash immediately so page survives reload
    const hash = window.location.hash.slice(2) // strip '#/'
    // Accept legacy 'resources' route and normalize to 'library'
    if (hash === 'resources') return 'library'
    return hash || 'home'
  })
  const [showOnboard, setShowOnboard] = useState(() => {
    return localStorage.getItem('bhi-onboarded') !== 'true'
  })
  const [tags, setTags] = useState<string[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const hash = window.location.hash.slice(2) || 'home'
    return hash
  })
  const { isAuthenticated, loading, user } = useAuth()

  console.log('[App] Auth state - isAuthenticated:', isAuthenticated, 'loading:', loading, 'currentRoute:', currentRoute, 'data exists:', !!data)

  useEffect(() => {
    let mounted = true
    console.log('[App] Starting data load...')
    async function init() {
      // Load data from Supabase with timeout
      try {
        console.log('[App] Making Supabase queries...')
        
        const queryPromise = Promise.all([
          supabase.from('lab_markers').select('id,name,unit'),
          supabase.from('logic_rules').select('marker_id,min_value,max_value,tag_to_apply'),
          supabase.from('resources').select('type,title,description,link_url,tags')
        ])
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Data load timeout')), 5000)
        )

        const [{ data: lm, error: lmErr }, { data: lr, error: lrErr }, { data: r, error: rErr }] = await Promise.race([
          queryPromise,
          timeoutPromise as any
        ]) as any

        console.log('[App] Supabase queries completed', {
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
          console.log('[App] Using Supabase data')
          return
        }

        console.warn('Supabase connected but returned no rows or errors — falling back to sample data', { lmErr, lrErr, rErr })
      } catch (err) {
        console.warn('[App] Supabase data load failed or timed out, falling back to sample data', err)
      }

      // Always fall back to sample data if we get here
      if (mounted) {
        console.log('[App] Using sample data')
        setData(loadSampleData())
        setDataSource('sample')
      }
    }
    init()
    return () => { mounted = false }
  }, [refreshKey])

  // Listen for hash changes (browser back/forward, manual URL edits)
  useEffect(() => {
    const handleHashChange = () => {
      let route = (window.location.hash.slice(2)) || 'home' // strip '#/'
      if (route === 'resources') route = 'library' // normalize legacy
      if (route === 'login' || route === 'signup') {
        setCurrentRoute(route)
      } else if (isAuthenticated) {
        setCurrentRoute(route)
        setCurrentPage(route)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [isAuthenticated])

  // Auth gate: once loading is done, decide where to go
  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      setCurrentRoute('login')
      window.location.hash = '#/login'
    } else {
      // Auth just resolved — read the intended page from the hash
      let route = (window.location.hash.slice(2)) || 'home'
      if (route === 'resources') route = 'library'
      if (route === 'login' || route === 'signup') {
        // Was on a pre-auth page; go home
        setCurrentRoute('home')
        setCurrentPage('home')
        window.location.hash = '#/home'
      } else {
        // Hash already has a valid page (e.g. #/resources after reload) — honour it
        setCurrentRoute(route)
        setCurrentPage(route)
      }
    }
  }, [isAuthenticated, loading])

  // Keep URL in sync when user clicks nav tabs
  useEffect(() => {
    if (isAuthenticated && !loading) {
      window.location.hash = `#/${currentPage}`
    }
  }, [currentPage, isAuthenticated, loading])

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

  console.log('[App] About to check data, data exists:', !!data, 'dataSource:', dataSource)
  if (!data) return <div className="center">Loading…</div>

  if (showOnboard) {
    return <Onboarding onClose={() => { localStorage.setItem('bhi-onboarded', 'true'); setShowOnboard(false) }} />
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  return (
    <ProtectedRoute>
      <Layout currentPage={currentPage} onNavigate={handleNavigate} onLogout={() => { window.location.hash = '#/login' }}>
        {currentPage === 'home' && <Dashboard userEmail={user?.email} userName={user?.name} recentResources={data.resources.slice(0, 3)} bookmarkedCount={2} onNavigate={handleNavigate} />}
        {(currentPage === 'resources' || currentPage === 'library') && <Resources />}
        {currentPage === 'categories' && <Categories />}
        {currentPage === 'labs' && <Labs />}
        {currentPage === 'profile' && <Profile userEmail={user?.email} userName={user?.name} onNavigate={handleNavigate} />}
        {currentPage === 'consent' && <ConsentPage onNavigate={handleNavigate} />}
        {currentPage === 'public-profile' && <PublicProfilePage onNavigate={handleNavigate} />}
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
