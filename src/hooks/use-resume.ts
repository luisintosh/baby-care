import { useEffect, useRef } from 'react'

/** Runs `callback` when the app comes back to the screen or the network returns. */
export function useResume(callback: () => void) {
  const saved = useRef(callback)
  useEffect(() => {
    saved.current = callback
  })

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') saved.current()
    }
    const onOnline = () => saved.current()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [])
}
