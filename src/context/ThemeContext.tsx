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
    const saved = localStorage.getItem('nhl-dark-mode') ?? localStorage.getItem('bhi-dark-mode')
    return saved ? JSON.parse(saved) : false
  })

  useEffect(() => {
    localStorage.setItem('nhl-dark-mode', JSON.stringify(darkMode))
    if (darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }, [darkMode])

  // "Vital" palette — chosen by Damon from the three design previews (public/preview/).
  // `blue` is a legacy token name: it is the primary accent, used both as a fill behind
  // white text and as link/border colour, so the value must hold contrast in both roles.
  // Lime (#B8E62E) is deliberately NOT used here — it is unreadable on light surfaces and
  // behind white text; it is reserved for the dark hero blocks added in later steps.
  const theme: Theme = darkMode
    ? {
        bg: '#0C1512',
        bgSecondary: '#101B17',
        text: '#EAF1ED',
        textMuted: '#9AAAA2',
        textLight: '#7A8A82',
        card: '#14211C',
        borderColor: '#2A3A33',
        borderLight: '#1F2D27',
        blue: '#1F8F63',
      }
    : {
        bg: '#F4F6F3',
        bgSecondary: '#F4F6F3',
        text: '#101A16',
        textMuted: '#5E6B65',
        textLight: '#97A39D',
        card: '#ffffff',
        borderColor: '#E4E8E3',
        borderLight: '#EEF1ED',
        blue: '#12332A',
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
