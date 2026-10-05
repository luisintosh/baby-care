/** Born 9 May 2026. Age uses the Mexico City calendar. */
export const BABY_BORN = { year: 2026, month: 5, day: 9 } as const

type Ymd = { year: number; month: number; day: number }

export type BabyAge = {
  years: number
  months: number
  weeks: number
  days: number
  label: string
}

function mexicoYmd(date: Date): Ymd {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return { year: num('year'), month: num('month'), day: num('day') }
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function isBefore(a: Ymd, b: Ymd) {
  if (a.year !== b.year) return a.year < b.year
  if (a.month !== b.month) return a.month < b.month
  return a.day < b.day
}

function unit(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

function joinAge(parts: string[]) {
  if (parts.length === 0) return 'recién nacida'
  if (parts.length === 1) return parts[0]
  return `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

export function babyAge(now = new Date()): BabyAge {
  const today = mexicoYmd(now)
  if (isBefore(today, BABY_BORN)) {
    return { years: 0, months: 0, weeks: 0, days: 0, label: 'aún no nace' }
  }

  let years = today.year - BABY_BORN.year
  let months = today.month - BABY_BORN.month
  let days = today.day - BABY_BORN.day

  if (days < 0) {
    months -= 1
    const prevMonth = today.month === 1 ? 12 : today.month - 1
    const prevYear = today.month === 1 ? today.year - 1 : today.year
    days += daysInMonth(prevYear, prevMonth)
  }
  if (months < 0) {
    years -= 1
    months += 12
  }

  const weeks = Math.floor(days / 7)
  const restDays = days % 7
  const parts = [
    years > 0 ? unit(years, 'año', 'años') : null,
    months > 0 ? unit(months, 'mes', 'meses') : null,
    weeks > 0 ? unit(weeks, 'semana', 'semanas') : null,
    restDays > 0 ? unit(restDays, 'día', 'días') : null,
  ].filter((part): part is string => part !== null)

  return { years, months, weeks, days: restDays, label: joinAge(parts) }
}
