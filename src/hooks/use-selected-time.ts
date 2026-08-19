import { useEffect, useState } from 'react'
import { addMinutes } from '@/lib/format'

export function useSelectedTime() {
  const [live, setLive] = useState(true)
  const [frozen, setFrozen] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const value = live ? now : frozen

  function shift(minutes: number) {
    const base = live ? new Date() : frozen
    setFrozen(addMinutes(base, minutes))
    setLive(false)
  }

  function resetToNow() {
    const next = new Date()
    setFrozen(next)
    setLive(true)
  }

  function setValue(next: Date) {
    setFrozen(next)
    setLive(false)
  }

  return { value, live, shift, resetToNow, setValue }
}
