/** Non-breaking space: keeps "2 h" and "15 min" from splitting across lines. */
const NB = ' '

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

export function withTime(date: Date, hours: number, minutes: number) {
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function startOfLocalDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function isSameLocalDay(a: Date, b: Date) {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime()
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** 24-hour clock, the same format the time editor and the schedule copy use. */
export function formatClock(date: Date) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

/** Weekday and day without the trailing period: "lun 23". */
export function formatShortDay(date: Date) {
  const weekday = date.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '')
  return `${weekday} ${date.getDate()}`
}

/** "14:30", "ayer 23:50", or "lun 23 · 14:30", relative to now. */
export function formatWhen(date: Date, now = new Date()) {
  if (isSameLocalDay(date, now)) return formatClock(date)
  if (isSameLocalDay(date, addDays(now, -1))) return `ayer ${formatClock(date)}`
  return `${formatShortDay(date)} · ${formatClock(date)}`
}

export function formatDayLabel(date: Date, now = new Date()) {
  const day = startOfLocalDay(date).getTime()
  const today = startOfLocalDay(now).getTime()
  const yesterday = addDays(startOfLocalDay(now), -1).getTime()
  if (day === today) return 'Hoy'
  if (day === yesterday) return 'Ayer'
  return capitalize(
    date.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).replace('.', ''),
  )
}

function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00`)
    .toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    .replaceAll('.', '')
}

export function formatRange(start: string, end: string) {
  return `${shortDate(start)} – ${shortDate(end)}`
}

/** "Hoy es el último día", "Hasta mañana", "Hasta el lun 1 dic". */
export function formatDeadline(end: string, today = toDateInput(new Date())) {
  if (end === today) return 'Hoy es el último día'
  if (end === toDateInput(addDays(new Date(`${today}T00:00:00`), 1))) return 'Hasta mañana'
  return `Hasta el ${shortDate(end)}`
}

export function formatStarts(start: string) {
  return `Empieza el ${shortDate(start)}`
}

export function formatShortDate(date: Date) {
  return date
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    .replaceAll('.', '')
}

/** "45 min", "2 h", "2 h 15 min". */
export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours <= 0) return `${rest}${NB}min`
  if (rest === 0) return `${hours}${NB}h`
  return `${hours}${NB}h ${rest}${NB}min`
}

/** Elapsed time with no prefix: "un momento", "45 min", "2 h 15 min", "3 días". */
export function formatElapsed(from: Date, now = new Date()) {
  const ms = now.getTime() - from.getTime()
  if (ms < 60_000) return 'un momento'
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 24) return formatDuration(Math.floor(ms / 60_000) * 60_000)
  const days = Math.floor(hours / 24)
  return days === 1 ? `1${NB}día` : `${days}${NB}días`
}

/** "hace un momento", "hace 45 min", "hace 2 h 15 min", "hace 3 días". */
export function formatAgo(from: Date, now = new Date()) {
  return `hace ${formatElapsed(from, now)}`
}

export function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
