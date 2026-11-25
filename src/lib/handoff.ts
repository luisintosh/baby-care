import type { BabyEvent, Caregiver } from '@/lib/types'

const FALLBACK_WINDOW_MS = 12 * 3_600_000

export type Handoff = {
  /** Your last own entry, or null if you have none in the log. */
  since: Date | null
  by: Caregiver
  feeds: number
  poops: number
  medicines: number
  solids: number
  /** Sleep time inside the window, open sleeps counted up to now. */
  sleepMs: number
}

/**
 * What the other caregiver logged since your own last entry: the handoff in
 * one line. Null when they logged nothing since then.
 */
export function computeHandoff(events: BabyEvent[], me: Caregiver, now = new Date()): Handoff | null {
  const saved = events.filter((event) => !event.pending)
  const mine = saved
    .filter((event) => event.caregiver === me)
    .reduce<number | null>((latest, event) => {
      const at = new Date(event.created_at).getTime()
      return latest === null || at > latest ? at : latest
    }, null)
  const since = mine === null ? null : new Date(mine)
  const from = since ? since.getTime() : now.getTime() - FALLBACK_WINDOW_MS

  const theirs = saved.filter(
    (event) => event.caregiver !== me && new Date(event.created_at).getTime() > from,
  )
  if (theirs.length === 0) return null

  let sleepMs = 0
  for (const event of theirs) {
    if (event.kind !== 'sleep') continue
    const start = Math.max(new Date(event.occurred_at).getTime(), from)
    const end = (event.ended_at ? new Date(event.ended_at) : now).getTime()
    if (end > start) sleepMs += end - start
  }

  return {
    since,
    by: theirs[0].caregiver,
    feeds: theirs.filter((event) => event.kind === 'feed').length,
    poops: theirs.filter((event) => event.kind === 'poop').length,
    medicines: theirs.filter((event) => event.kind === 'medicine').length,
    solids: theirs.filter((event) => event.kind === 'solid').length,
    sleepMs,
  }
}
