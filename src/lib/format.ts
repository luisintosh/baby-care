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

export function formatClock(date: Date) {
  return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export function formatDayLabel(date: Date, now = new Date()) {
  const day = startOfLocalDay(date).getTime()
  const today = startOfLocalDay(now).getTime()
  const yesterday = addDays(startOfLocalDay(now), -1).getTime()
  if (day === today) return 'Hoy'
  if (day === yesterday) return 'Ayer'
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

export function formatRange(start: string, end: string) {
  const from = new Date(`${start}T00:00:00`)
  const to = new Date(`${end}T00:00:00`)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${from.toLocaleDateString('es-MX', opts)} – ${to.toLocaleDateString('es-MX', opts)}`
}

export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60_000))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours <= 0) return `${rest}m`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}m`
}

export function formatAgo(from: Date, now = new Date()) {
  const ms = now.getTime() - from.getTime()
  if (ms < 60_000) return 'hace un momento'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'hace 1hr' : `hace ${hours}hrs`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}

export function toDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
