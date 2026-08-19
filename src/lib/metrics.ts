import { addDays, formatDuration, startOfLocalDay } from '@/lib/format'
import type { BabyEvent, EventKind } from '@/lib/types'

export type DayPoint = {
  key: string
  label: string
  feeds: number
  poops: number
  sleepMs: number
}

export type Metrics = {
  lastFeed: Date | null
  lastPoop: Date | null
  lastMedicine: Date | null
  medicineToday: boolean
  openSleep: BabyEvent | null
  lastClosedSleep: BabyEvent | null
  todayFeeds: number
  todayPoops: number
  todayMedicines: number
  todaySleepMs: number
  week: DayPoint[]
  hasTrend: boolean
  feedAvgMs: number | null
  prevFeedAvgMs: number | null
  summaries: string[]
}

function lastOf(events: BabyEvent[], kind: EventKind) {
  return events.find((event) => event.kind === kind) ?? null
}

function countOnDay(events: BabyEvent[], kind: EventKind, dayStart: Date) {
  const dayEnd = addDays(dayStart, 1)
  return events.filter((event) => {
    if (event.kind !== kind) return false
    const at = new Date(event.occurred_at).getTime()
    return at >= dayStart.getTime() && at < dayEnd.getTime()
  }).length
}

function sleepMsOnDay(events: BabyEvent[], dayStart: Date, now: Date) {
  const dayEnd = addDays(dayStart, 1)
  let total = 0
  for (const event of events) {
    if (event.kind !== 'sleep') continue
    const start = new Date(event.occurred_at).getTime()
    const end = (event.ended_at ? new Date(event.ended_at) : now).getTime()
    const from = Math.max(start, dayStart.getTime())
    const to = Math.min(end, dayEnd.getTime())
    if (to > from) total += to - from
  }
  return total
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

function compareCount(current: number, previous: number, kind: 'feed' | 'poop') {
  const delta = current - previous
  if (kind === 'feed') {
    if (Math.abs(delta) < 0.25) return 'come igual'
    return delta > 0
      ? 'come un poco más que la semana pasada'
      : 'come un poco menos que la semana pasada'
  }
  if (Math.abs(delta) < 0.25) return 'misma popó que la semana pasada'
  return delta > 0 ? 'más popó que la semana pasada' : 'menos popó que la semana pasada'
}

export function computeMetrics(events: BabyEvent[], now = new Date()): Metrics {
  const sorted = [...events].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
  const today = startOfLocalDay(now)
  const openSleep = sorted.find((event) => event.kind === 'sleep' && !event.ended_at) ?? null
  const lastClosedSleep =
    sorted.find((event) => event.kind === 'sleep' && event.ended_at) ?? null

  const week: DayPoint[] = []
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDays(today, -i)
    week.push({
      key: day.toISOString(),
      label: day.toLocaleDateString('es-MX', { weekday: 'narrow' }),
      feeds: countOnDay(sorted, 'feed', day),
      poops: countOnDay(sorted, 'poop', day),
      sleepMs: sleepMsOnDay(sorted, day, now),
    })
  }

  const prevWeekStart = addDays(today, -13)
  const thisWeekStart = addDays(today, -6)
  const prevFeeds: number[] = []
  const prevPoops: number[] = []
  const prevSleep: number[] = []
  for (let i = 0; i < 7; i += 1) {
    const day = addDays(prevWeekStart, i)
    prevFeeds.push(countOnDay(sorted, 'feed', day))
    prevPoops.push(countOnDay(sorted, 'poop', day))
    prevSleep.push(sleepMsOnDay(sorted, day, now))
  }

  const daysWithData = new Set(
    sorted.map((event) => startOfLocalDay(new Date(event.occurred_at)).getTime()),
  )
  const hasTrend = daysWithData.size >= 3

  const thisFeedAvg = average(week.map((day) => day.feeds))
  const prevFeedAvg = average(prevFeeds)
  const thisPoopAvg = average(week.map((day) => day.poops))
  const prevPoopAvg = average(prevPoops)
  const thisSleepAvg = average(week.map((day) => day.sleepMs))
  const prevSleepAvg = average(prevSleep)

  const summaries: string[] = []
  if (hasTrend) {
    summaries.push(compareCount(thisFeedAvg, prevFeedAvg, 'feed'))
    summaries.push(compareCount(thisPoopAvg, prevPoopAvg, 'poop'))
    const sleepDelta = thisSleepAvg - prevSleepAvg
    if (Math.abs(sleepDelta) < 15 * 60_000) {
      summaries.push('duerme parecido a la semana pasada')
    } else if (sleepDelta < 0) {
      summaries.push(`esta semana duerme ${formatDuration(Math.abs(sleepDelta))} menos al día`)
    } else {
      summaries.push(`esta semana duerme ${formatDuration(sleepDelta)} más al día`)
    }
  }

  const lastMedicine = lastOf(sorted, 'medicine')
  const lastFeed = lastOf(sorted, 'feed')
  const lastPoop = lastOf(sorted, 'poop')

  return {
    lastFeed: lastFeed ? new Date(lastFeed.occurred_at) : null,
    lastPoop: lastPoop ? new Date(lastPoop.occurred_at) : null,
    lastMedicine: lastMedicine ? new Date(lastMedicine.occurred_at) : null,
    medicineToday: lastMedicine
      ? startOfLocalDay(new Date(lastMedicine.occurred_at)).getTime() === today.getTime()
      : false,
    openSleep,
    lastClosedSleep,
    todayFeeds: countOnDay(sorted, 'feed', today),
    todayPoops: countOnDay(sorted, 'poop', today),
    todayMedicines: countOnDay(sorted, 'medicine', today),
    todaySleepMs: sleepMsOnDay(sorted, today, now),
    week,
    hasTrend,
    feedAvgMs: feedIntervals(sorted, thisWeekStart, addDays(today, 1)),
    prevFeedAvgMs: feedIntervals(sorted, prevWeekStart, thisWeekStart),
    summaries,
  }
}
