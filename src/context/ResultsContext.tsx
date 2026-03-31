import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface ProviderVerification {
  verifierName: string
  verifierCredential: string
  verifierNpi: string
  verifierSignature: string
  verifiedAt: string  // ISO date string YYYY-MM-DD
}

export interface UserLabResult {
  id: string
  markerName: string
  value: number
  unit: string
  date: string
  minNormal: number
  maxNormal: number
  verificationType?: 'self' | 'provider' | 'pdf'
  verification?: ProviderVerification | null
}

interface ResultsContextType {
  results: UserLabResult[]
  latestLabDate: string | null
  addResult: (result: Omit<UserLabResult, 'id'>) => Promise<void>
  removeResult: (id: string) => Promise<void>
  getResultsForMarker: (markerName: string) => UserLabResult[]
  getLatestResults: () => UserLabResult[]
  clearAllResults: () => Promise<void>
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined)

const STORAGE_KEY = 'nhl-user-lab-results'

function rowToResult(row: any): UserLabResult {
  const hasVerification = row.verification_type === 'provider' && row.verifier_name
  return {
    id: row.id,
    markerName: row.marker_name,
    value: Number(row.value),
    unit: row.unit ?? '',
    date: row.date,
    minNormal: row.min_normal != null ? Number(row.min_normal) : 0,
    maxNormal: row.max_normal != null ? Number(row.max_normal) : 0,
    verificationType: row.verification_type ?? 'self',
    verification: hasVerification ? {
      verifierName: row.verifier_name,
      verifierCredential: row.verifier_credential ?? '',
      verifierNpi: row.verifier_npi ?? '',
      verifierSignature: row.verifier_signature ?? '',
      verifiedAt: row.verified_at ?? '',
    } : null,
  }
}

export function ResultsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const [results, setResults] = useState<UserLabResult[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })

  // Sync localStorage cache whenever results change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  }, [results])

  // Load results from Supabase when user is available
  useEffect(() => {
    if (!user?.id) return

    async function fetchResults() {
      const { data, error } = await supabase
        .from('user_lab_results')
        .select('*')
        .eq('user_id', user!.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching user lab results:', error)
        return
      }

      if (data) {
        setResults(data.map(rowToResult))
      }
    }

    fetchResults()
  }, [user?.id])

  const addResult = async (result: Omit<UserLabResult, 'id'>) => {
    if (!user?.id) {
      // Not logged in — fall back to localStorage-only (offline mode)
      const newResult: UserLabResult = {
        ...result,
        id: `${result.markerName}-${Date.now()}`,
      }
      setResults(prev => [newResult, ...prev])
      return
    }

    const row: Record<string, any> = {
      user_id: user.id,
      marker_name: result.markerName,
      value: result.value,
      unit: result.unit,
      date: result.date,
      min_normal: result.minNormal,
      max_normal: result.maxNormal,
      verification_type: result.verificationType ?? 'self',
    }
    if (result.verificationType === 'provider' && result.verification) {
      row.verifier_name = result.verification.verifierName
      row.verifier_credential = result.verification.verifierCredential || null
      row.verifier_npi = result.verification.verifierNpi || null
      row.verifier_signature = result.verification.verifierSignature || null
      row.verified_at = result.verification.verifiedAt || null
    }

    const { data, error } = await supabase
      .from('user_lab_results')
      .insert(row)
      .select()
      .single()

    if (error) {
      console.error('Error saving lab result:', error)
      return
    }

    setResults(prev => [rowToResult(data), ...prev])
  }

  const removeResult = async (id: string) => {
    if (user?.id) {
      const { error } = await supabase
        .from('user_lab_results')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting lab result:', error)
        return
      }
    }

    setResults(prev => prev.filter(r => r.id !== id))
  }

  const getResultsForMarker = (markerName: string) => {
    return results
      .filter(r => r.markerName === markerName)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const getLatestResults = () => {
    const latestByMarker = new Map<string, UserLabResult>()
    results.forEach(result => {
      const current = latestByMarker.get(result.markerName)
      if (!current || new Date(result.date) > new Date(current.date)) {
        latestByMarker.set(result.markerName, result)
      }
    })
    return Array.from(latestByMarker.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  }

  const clearAllResults = async () => {
    if (user?.id) {
      const { error } = await supabase
        .from('user_lab_results')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Error clearing lab results:', error)
        return
      }
    }

    setResults([])
  }

  // Derive the most recent lab date across all results
  const latestLabDate: string | null = results.length > 0
    ? results.reduce((latest, r) => {
        return new Date(r.date) > new Date(latest) ? r.date : latest
      }, results[0].date)
    : null

  return (
    <ResultsContext.Provider
      value={{ results, latestLabDate, addResult, removeResult, getResultsForMarker, getLatestResults, clearAllResults }}
    >
      {children}
    </ResultsContext.Provider>
  )
}

export function useResults() {
  const context = useContext(ResultsContext)
  if (!context) {
    throw new Error('useResults must be used within ResultsProvider')
  }
  return context
}
