import { useEffect } from 'react'

/**
 * Hook that reloads the page when the tab becomes visible again
 * after being hidden. This ensures all data is fresh when the user returns.
 */
export function useVisibilityRefresh() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        window.location.reload()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
