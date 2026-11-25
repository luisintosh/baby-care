import { addDays, formatDuration, startOfLocalDay } from '@/lib/format'
import type { BabyEvent, EventKind } from '@/lib/types'

export type DayPoint = {
  key: string
  label: string
  isToday: boolean
  hasData: boolean
  feeds: number
  poops: number
  sleepMs: number
}

export type Metrics = {
  lastFeed: BabyEvent | null
  lastPoop: BabyEvent | null
  lastMedicine: BabyEvent | null
  medicineToday: BabyEvent[]
  openSleep: BabyEvent | null
  lastClosedSleep: BabyEvent | null
  todayFeeds: number
  todayPoops: number
  todayMedicines: number
  todaySleepMs: number
  /** The same counts for yesterday, up to this time of day. */
  yesterdaySoFar: { feeds: number; poops: number; medicines: number; sleepMs: number }
  week: DayPoint[]
  hasTrend: boolean
  /** Both weeks have enough days logged to compare honestly. */
  canCompare: boolean
  feedAvgMs: number | null
  summaries: string[]
}

/** Days with fewer logs than this do not count toward a comparison. */
const MIN_DAYS_TO_COMPARE = 5

function lastOf(events: BabyEvent[], kind: EventKind) {
  return events.find((event) => event.kind === kind) ?? null
}

function countBetween(events: BabyEvent[], kind: EventKind, from: Date, to: Date) {
  return events.filter((event) => {
    if (event.kind !== kind) return false
    const at = new Date(event.occurred_at).getTime()
    return at >= from.getTime() && at < to.getTime()
  }).length
}

function countOnDay(events: BabyEvent[], kind: EventKind, dayStart: Date) {
  return countBetween(events, kind, dayStart, addDays(dayStart, 1))
}

function sleepMsBetween(events: BabyEvent[], from: Date, to: Date, now: Date) {
  let total = 0
  for (const event of events) {
    if (event.kind !== 'sleep') continue
    const start = new Date(event.occurred_at).getTime()
    const end = (event.ended_at ? new Date(event.ended_at) : now).getTime()
    const lo = Math.max(start, from.getTime())
    const hi = Math.min(end, to.getTime())
    if (hi > lo) total += hi - lo
  }
  return total
}

function sleepMsOnDay(events: BabyEvent[], dayStart: Date, now: Date) {
  return sleepMsBetween(events, dayStart, addDays(dayStart, 1), now)
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function feedIntervals(events: BabyEvent[], from: Date, to: Date) {
  const feeds = events
    .filter((event) => event.kind === 'feed')
    .map((event) => new Date(event.occurred_at).getTime())
    .filter((time) => time >= from.getTime() && time < to.getTime())
    .sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < feeds.length; i += 1) gaps.push(feeds[i] - feeds[i - 1])
  return gaps.length >= 1 ? average(gaps) : null
}

function oneDecimal(value: number) {
  return value.toLocaleString('es-MX', { maximumFractionDigits: 1 })
}

function dayLabel(day: Date) {
  // Two letters so martes and miércoles don't both read "M".
  return day.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '').slice(0, 2)
}

export function computeMetrics(events: BabyEvent[], now = new Date()): Metrics {
  const sorted = [...events]
    .filter((event) => !event.pending)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const today = startOfLocalDay(now)
  const openSleep = sorted.find((event) => event.kind === 'sleep' && !event.ended_at) ?? null
  const lastClosedSleep =
    sorted.find((event) => event.kind === 'sleep' && event.ended_at) ?? null

  const daysWithData = new Set(
    sorted.map((event) => startOfLocalDay(new Date(event.occurred_at)).getTime()),
  )

  const week: DayPoint[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i)
    week.push({
      key: day.toISOString(),
      label: dayLabel(day),
      isToday: i === 0,
      hasData: daysWithData.has(day.getTime()),
      feeds: countOnDay(sorted, 'feed', day),
      poops: countOnDay(sorted, 'poop', day),
      sleepMs: sleepMsOnDay(sorted, day, now),
    })
  }

  const prevWeekStart = addDays(today, -13)
  const thisWeekStart = addDays(today, -6)
  const prevWeek: DayPoint[] = []
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(prevWeekStart, i)
    prevWeek.push({
      key: day.toISOString(),
      label: dayLabel(day),
      isToday: false,
      hasData: daysWithData.has(day.getTime()),
      feeds: countOnDay(sorted, 'feed', day),
      poops: countOnDay(sorted, 'poop', day),
      sleepMs: sleepMsOnDay(sorted, day, now),
    })
  }

  // Today is still running, so it never counts toward an average.
  const thisFull = week.filter((day) => day.hasData && !day.isToday)
  const prevFull = prevWeek.filter((day) => day.hasData)
  const hasTrend = thisFull.length >= 2
  const canCompare = thisFull.length >= MIN_DAYS_TO_COMPARE && prevFull.length >= MIN_DAYS_TO_COMPARE

  const summaries: string[] = []
  if (hasTrend) {
    const feeds = average(thisFull.map((day) => day.feeds))
    const poops = average(thisFull.map((day) => day.poops))
    const sleep = average(thisFull.map((day) => day.sleepMs))
    if (canCompare) {
      summaries.push(
        `Comidas: ${oneDecimal(feeds)} al día (semana pasada ${oneDecimal(average(prevFull.map((day) => day.feeds)))})`,
      )
      summaries.push(
        `Popó: ${oneDecimal(poops)} al día (semana pasada ${oneDecimal(average(prevFull.map((day) => day.poops)))})`,
      )
      summaries.push(
        `Sueño: ${formatDuration(sleep)} al día (semana pasada ${formatDuration(average(prevFull.map((day) => day.sleepMs)))})`,
      )
    } else {
      summaries.push(`Comidas: ${oneDecimal(feeds)} al día`)
      summaries.push(`Popó: ${oneDecimal(poops)} al día`)
      summaries.push(`Sueño registrado: ${formatDuration(sleep)} al día`)
    }
  }

  const yesterday = addDays(today, -1)
  const yesterdayNow = addDays(now, -1)

  return {
    lastFeed: lastOf(sorted, 'feed'),
    lastPoop: lastOf(sorted, 'poop'),
    lastMedicine: lastOf(sorted, 'medicine'),
    medicineToday: sorted.filter(
      (event) =>
        event.kind === 'medicine' &&
        startOfLocalDay(new Date(event.occurred_at)).getTime() === today.getTime(),
    ),
    openSleep,
    lastClosedSleep,
    todayFeeds: countOnDay(sorted, 'feed', today),
    todayPoops: countOnDay(sorted, 'poop', today),
    todayMedicines: countOnDay(sorted, 'medicine', today),
    todaySleepMs: sleepMsOnDay(sorted, today, now),
    yesterdaySoFar: {
      feeds: countBetween(sorted, 'feed', yesterday, yesterdayNow),
      poops: countBetween(sorted, 'poop', yesterday, yesterdayNow),
      medicines: countBetween(sorted, 'medicine', yesterday, yesterdayNow),
      sleepMs: sleepMsBetween(sorted, yesterday, yesterdayNow, now),
    },
    week,
    hasTrend,
    canCompare,
    feedAvgMs: feedIntervals(sorted, thisWeekStart, addDays(today, 1)),
    summaries,
  }
}
