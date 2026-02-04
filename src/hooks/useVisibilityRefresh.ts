import { useEffect, useRef } from 'react'

/**
 * Hook that reloads the page when the tab becomes visible again
 * after being hidden for more than 5 seconds.
 * This ensures all data is fresh when the user returns.
 */
export function useVisibilityRefresh() {
  const lastHiddenTimeRef = useRef<number | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastHiddenTimeRef.current = Date.now()
      } else {
        const hiddenDuration = lastHiddenTimeRef.current ? Date.now() - lastHiddenTimeRef.current : 0

        if (hiddenDuration > 5000) {
          console.log('[useVisibilityRefresh] Page hidden for', Math.round(hiddenDuration / 1000), 'seconds - reloading')
          window.location.reload()
        }

        lastHiddenTimeRef.current = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
