import React, { createContext, useContext, useState, useEffect } from 'react'

interface Theme {
  bg: string
  bgSecondary: string
  text: string
  textMuted: string
  textLight: string
  card: string
  borderColor: string
  borderLight: string
  blue: string
}

interface ThemeContextType {
  darkMode: boolean
  setDarkMode: (value: boolean) => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('bhi-dark-mode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('bhi-dark-mode', JSON.stringify(darkMode))
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  const theme: Theme = darkMode
    ? {
        bg: '#252525',
        bgSecondary: '#252525',
        text: '#e0e0e0',
        textMuted: '#aaa',
        textLight: '#ccc',
        card: '#252525',
        borderColor: '#888888',
        borderLight: '#444',
        blue: '#3B82F6',
      }
    : {
        bg: '#ffffff',
        bgSecondary: '#f9fafb',
        text: '#1F2937',
        textMuted: '#666',
        textLight: '#9CA3AF',
        card: '#ffffff',
        borderColor: '#d0d0d0',
        borderLight: '#eee',
        blue: '#2563EB',
      }

  return <ThemeContext.Provider value={{ darkMode, setDarkMode, theme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
