import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface UserLabResult {
  id: string
  markerName: string
  value: number
  unit: string
  date: string
  minNormal: number
  maxNormal: number
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

const STORAGE_KEY = 'bhi-user-lab-results'

function rowToResult(row: any): UserLabResult {
  return {
    id: row.id,
    markerName: row.marker_name,
    value: Number(row.value),
    unit: row.unit ?? '',
    date: row.date,
    minNormal: row.min_normal != null ? Number(row.min_normal) : 0,
    maxNormal: row.max_normal != null ? Number(row.max_normal) : 0,
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

    const { data, error } = await supabase
      .from('user_lab_results')
      .insert({
        user_id: user.id,
        marker_name: result.markerName,
        value: result.value,
        unit: result.unit,
        date: result.date,
        min_normal: result.minNormal,
        max_normal: result.maxNormal,
      })
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
