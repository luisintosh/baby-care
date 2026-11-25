import { useEffect, useState } from 'react'
import { useResume } from '@/hooks/use-resume'
import { addDays, addMinutes } from '@/lib/format'

/** How far past "now" a chosen time may go before it counts as yesterday. */
export const FUTURE_SLACK_MS = 10 * 60_000

/** Moves a future time back a day at a time until it is no later than now + slack. */
export function notInFuture(date: Date, now = new Date()) {
  let next = date
  while (next.getTime() > now.getTime() + FUTURE_SLACK_MS) next = addDays(next, -1)
  return next
}

export function clampToNow(date: Date, now = new Date()) {
  const max = now.getTime() + FUTURE_SLACK_MS
  return date.getTime() > max ? new Date(max) : date
}

export function useSelectedTime() {
  const [live, setLive] = useState(true)
  const [frozen, setFrozen] = useState(() => new Date())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // A chosen time is for the log at hand. Coming back to the app means now.
  useResume(() => {
    setNow(new Date())
    setLive(true)
  })

  const value = live ? now : frozen

  function shift(minutes: number) {
    const base = live ? new Date() : frozen
    const next = clampToNow(addMinutes(base, minutes))
    if (Math.abs(next.getTime() - Date.now()) < 60_000) {
      resetToNow()
      return
    }
    setFrozen(next)
    setLive(false)
  }

  function resetToNow() {
    setNow(new Date())
    setFrozen(new Date())
    setLive(true)
  }

  function setValue(next: Date) {
    setFrozen(notInFuture(next))
    setLive(false)
  }

  return { value, live, shift, resetToNow, setValue }
}
