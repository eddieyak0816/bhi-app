import React, { createContext, useContext, useState, useEffect } from 'react'

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
  addResult: (result: Omit<UserLabResult, 'id'>) => void
  removeResult: (id: string) => void
  getResultsForMarker: (markerName: string) => UserLabResult[]
  getLatestResults: () => UserLabResult[]
  clearAllResults: () => void
}

const ResultsContext = createContext<ResultsContextType | undefined>(undefined)

const STORAGE_KEY = 'bhi-user-lab-results'

export function ResultsProvider({ children }: { children: React.ReactNode }) {
  const [results, setResults] = useState<UserLabResult[]>(() => {
    if (typeof window === 'undefined') return []
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results))
  }, [results])

  const addResult = (result: Omit<UserLabResult, 'id'>) => {
    const newResult: UserLabResult = {
      ...result,
      id: `${result.markerName}-${Date.now()}`,
    }
    setResults(prev => [newResult, ...prev])
  }

  const removeResult = (id: string) => {
    setResults(prev => prev.filter(r => r.id !== id))
  }

  const getResultsForMarker = (markerName: string) => {
    return results.filter(r => r.markerName === markerName).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const getLatestResults = () => {
    const latestByMarker = new Map<string, UserLabResult>()
    results.forEach(result => {
      const current = latestByMarker.get(result.markerName)
      if (!current || new Date(result.date) > new Date(current.date)) {
        latestByMarker.set(result.markerName, result)
      }
    })
    return Array.from(latestByMarker.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const clearAllResults = () => {
    setResults([])
  }

  return (
    <ResultsContext.Provider value={{ results, addResult, removeResult, getResultsForMarker, getLatestResults, clearAllResults }}>
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
