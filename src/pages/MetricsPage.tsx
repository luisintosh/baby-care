import { useNow } from '@/hooks/use-now'
import { BABY_BORN, babyAge } from '@/lib/baby'
import { whoLabel } from '@/lib/caregiver'
import {
  formatAgo,
  formatClock,
  formatDuration,
  formatElapsed,
  formatShortDate,
  formatWhen,
} from '@/lib/format'
import { computeMetrics } from '@/lib/metrics'
import { cn } from '@/lib/utils'
import type { BabyEvent, Caregiver } from '@/lib/types'

type MetricsPageProps = {
  caregiver: Caregiver
  events: BabyEvent[]
  loading: boolean
}

const BORN_LABEL = new Date(BABY_BORN.year, BABY_BORN.month - 1, BABY_BORN.day)
  .toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

export function MetricsPage({ caregiver, events, loading }: MetricsPageProps) {
  const now = useNow(30_000)
  const age = babyAge(now)
  const metrics = computeMetrics(events, now)
  const maxFeeds = Math.max(1, ...metrics.week.map((day) => day.feeds))
  const maxPoops = Math.max(1, ...metrics.week.map((day) => day.poops))
  const maxSleep = Math.max(1, ...metrics.week.map((day) => day.sleepMs))

  const sleepNow = metrics.openSleep
    ? `Dormida ${formatElapsed(new Date(metrics.openSleep.occurred_at), now)}`
    : metrics.lastClosedSleep?.ended_at
      ? `Despierta ${formatAgo(new Date(metrics.lastClosedSleep.ended_at), now)}`
      : 'Sin registro'

  const sleepHint = metrics.openSleep
    ? `desde las ${formatClock(new Date(metrics.openSleep.occurred_at))}`
    : metrics.lastClosedSleep?.ended_at
      ? `Último sueño: ${formatDuration(
          new Date(metrics.lastClosedSleep.ended_at).getTime() -
            new Date(metrics.lastClosedSleep.occurred_at).getTime(),
        )}`
      : undefined

  function lastLine(event: BabyEvent | null) {
    if (!event) return { value: 'Sin registro', hint: undefined }
    const at = new Date(event.occurred_at)
    return {
      value: formatAgo(at, now),
      hint: `${formatWhen(at, now)} · ${whoLabel(event.caregiver, caregiver)}`,
    }
  }

  const feed = lastLine(metrics.lastFeed)
  const poop = lastLine(metrics.lastPoop)
  const medsToday = metrics.medicineToday
  const lastMed = metrics.lastMedicine
  const medicine = medsToday.length
    ? {
        value: `Hoy ${formatClock(new Date(medsToday[0].occurred_at))} · ${whoLabel(medsToday[0].caregiver, caregiver)}`,
        hint:
          [medsToday[0].note?.trim(), medsToday.length > 1 ? `${medsToday.length} hoy` : null]
            .filter(Boolean)
            .join(' · ') || undefined,
      }
    : {
        value: 'Hoy no',
        hint: lastMed ? `Última: ${formatShortDate(new Date(lastMed.occurred_at))}` : undefined,
      }

  const y = metrics.yesterdaySoFar

  return (
    <div className="flex flex-col gap-6 pt-1">
      <p className="rounded-2xl bg-card px-4 py-3 text-sm leading-snug">
        <span className="font-medium text-foreground">{age.label}</span>
        <span className="text-muted-foreground"> · nació el {BORN_LABEL}</span>
      </p>

      <section aria-labelledby="ahora">
        <h2 id="ahora" className="mb-2 text-base font-semibold">
          Ahora
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {loading ? (
            [0, 1, 2, 3].map((tile) => <div key={tile} className="h-24 rounded-2xl bg-card" />)
          ) : (
            <>
              <Stat emoji="🍼" label="Última comida" value={feed.value} hint={feed.hint} />
              <Stat emoji="💩" label="Última popó" value={poop.value} hint={poop.hint} />
              <Stat
                emoji="😴"
                label="Sueño"
                value={sleepNow}
                hint={sleepHint}
                tone={metrics.openSleep ? 'sleep' : undefined}
              />
              <Stat emoji="💊" label="Medicina" value={medicine.value} hint={medicine.hint} />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="hoy">
        <h2 id="hoy" className="mb-2 flex items-baseline justify-between text-base font-semibold">
          Hoy
          <span className="text-xs font-normal text-muted-foreground">
            comparado con ayer a las {formatClock(now)}
          </span>
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {loading ? (
            [0, 1, 2, 3].map((tile) => <div key={tile} className="h-24 rounded-2xl bg-card" />)
          ) : (
            <>
              <Mini emoji="🍼" count={metrics.todayFeeds} label="comidas" compare={String(y.feeds)} />
              <Mini emoji="💩" count={metrics.todayPoops} label="popós" compare={String(y.poops)} />
              <Mini
                emoji="💊"
                count={metrics.todayMedicines}
                label="medicinas"
                compare={String(y.medicines)}
              />
              <Mini
                emoji="😴"
                count={formatDuration(metrics.todaySleepMs)}
                label="de sueño"
                compare={formatDuration(y.sleepMs)}
              />
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="tendencia">
        <h2 id="tendencia" className="mb-2 text-base font-semibold">
          Últimos 7 días
        </h2>
        {loading || !metrics.hasTrend ? (
          <p className="rounded-2xl bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            {loading ? 'Cargando…' : 'Con dos días completos registrados verás la tendencia.'}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-1.5 rounded-2xl bg-card px-4 py-3 text-sm">
              {metrics.summaries.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {metrics.feedAvgMs ? (
                <li>Entre comidas: {formatDuration(metrics.feedAvgMs)} de media</li>
              ) : null}
              {!metrics.canCompare ? (
                <li className="text-muted-foreground">
                  La comparación con la semana pasada aparece con 5 días registrados en cada una.
                </li>
              ) : null}
            </ul>
            <Bars
              title="🍼 Comidas"
              tone="bg-kind-feed"
              points={metrics.week.map((day) => ({
                ...day,
                value: day.feeds,
                max: maxFeeds,
                display: String(day.feeds),
              }))}
            />
            <Bars
              title="💩 Popó"
              tone="bg-kind-poop"
              points={metrics.week.map((day) => ({
                ...day,
                value: day.poops,
                max: maxPoops,
                display: String(day.poops),
              }))}
            />
            <Bars
              title="😴 Horas de sueño"
              tone="bg-kind-sleep"
              points={metrics.week.map((day) => ({
                ...day,
                value: day.sleepMs,
                max: maxSleep,
                display: (day.sleepMs / 3_600_000).toLocaleString('es-MX', { maximumFractionDigits: 1 }),
                spoken: formatDuration(day.sleepMs),
              }))}
            />
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  emoji,
  label,
  value,
  hint,
  tone,
}: {
  emoji: string
  label: string
  value: string
  hint?: string
  tone?: 'sleep'
}) {
  return (
    <article className="rounded-2xl bg-card px-4 py-3">
      <p className="text-sm text-muted-foreground">
        <span className="kind-emoji" aria-hidden>
          {emoji}
        </span>{' '}
        {label}
      </p>
      <p className={cn('mt-1 text-lg leading-snug font-medium', tone === 'sleep' && 'text-sleep')}>{value}</p>
      {hint ? <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{hint}</p> : null}
    </article>
  )
}

function Mini({
  emoji,
  count,
  label,
  compare,
}: {
  emoji: string
  count: number | string
  label: string
  compare: string
}) {
  return (
    <article className="rounded-2xl bg-card px-4 py-3 text-center">
      <p className="text-3xl font-semibold text-foreground">{count}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        <span className="kind-emoji" aria-hidden>
          {emoji}
        </span>{' '}
        {label}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">ayer: {compare}</p>
    </article>
  )
}

function Bars({
  title,
  tone,
  points,
}: {
  title: string
  tone: string
  points: {
    key: string
    label: string
    isToday: boolean
    value: number
    max: number
    display: string
    spoken?: string
  }[]
}) {
  return (
    <figure>
      <figcaption className="mb-2 text-sm font-medium">{title}</figcaption>
      <div
        className="flex h-28 items-end gap-1.5"
        role="img"
        aria-label={`${title}: ${points.map((point) => `${point.label} ${point.spoken ?? point.display}`).join(', ')}`}
      >
        {points.map((point) => (
          <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center gap-1" aria-hidden>
            <span className="font-clock text-xs text-muted-foreground">{point.value ? point.display : ''}</span>
            <div className="flex h-20 w-full items-end rounded-md bg-foreground/5">
              {point.value ? (
                <div
                  className={cn('w-full rounded-md', tone, point.isToday ? 'opacity-60' : 'opacity-90')}
                  style={{ height: `${Math.max(6, (point.value / point.max) * 100)}%` }}
                />
              ) : null}
            </div>
            <span
              className={cn(
                'text-xs capitalize',
                point.isToday ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {point.isToday ? 'hoy' : point.label}
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}
