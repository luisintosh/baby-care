import { formatAgo, formatDuration } from '@/lib/format'
import { computeMetrics } from '@/lib/metrics'
import { cn } from '@/lib/utils'
import type { BabyEvent } from '@/lib/types'

type MetricsPageProps = {
  events: BabyEvent[]
  loading: boolean
}

export function MetricsPage({ events, loading }: MetricsPageProps) {
  const now = new Date()
  const metrics = computeMetrics(events, now)
  const maxFeeds = Math.max(1, ...metrics.week.map((day) => day.feeds))
  const maxPoops = Math.max(1, ...metrics.week.map((day) => day.poops))
  const maxSleep = Math.max(1, ...metrics.week.map((day) => day.sleepMs))

  const sleepNow = metrics.openSleep
    ? `Durmiendo desde ${formatAgo(new Date(metrics.openSleep.occurred_at), now).replace('hace ', '')}`
    : metrics.lastClosedSleep?.ended_at
      ? `Despierto desde ${formatAgo(new Date(metrics.lastClosedSleep.ended_at), now).replace('hace ', '')}`
      : 'Sin registro de sueño'

  const lastNap =
    metrics.lastClosedSleep?.ended_at
      ? formatDuration(
          new Date(metrics.lastClosedSleep.ended_at).getTime() -
            new Date(metrics.lastClosedSleep.occurred_at).getTime(),
        )
      : null

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-xs tracking-[0.22em] text-muted-foreground uppercase">Ahora</h2>
        <div className="grid grid-cols-2 gap-2">
          <Stat emoji="🍼" label="Última comida" value={metrics.lastFeed ? formatAgo(metrics.lastFeed, now) : 'sin registro'} />
          <Stat emoji="💩" label="Última popó" value={metrics.lastPoop ? formatAgo(metrics.lastPoop, now) : 'sin registro'} />
          <Stat
            emoji="😴"
            label="Sueño"
            value={sleepNow}
            hint={metrics.openSleep ? undefined : lastNap ? `Última siesta ${lastNap}` : undefined}
          />
          <Stat
            emoji="💊"
            label="Última medicina"
            value={
              metrics.lastMedicine
                ? metrics.medicineToday
                  ? formatAgo(metrics.lastMedicine, now)
                  : formatAgo(metrics.lastMedicine, now)
                : 'hoy no'
            }
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs tracking-[0.22em] text-muted-foreground uppercase">Hoy</h2>
        <div className="grid grid-cols-2 gap-2">
          <Mini count={metrics.todayFeeds} label="comidas" />
          <Mini count={metrics.todayPoops} label="popós" />
          <Mini count={metrics.todayMedicines} label="medicinas" />
          <Mini count={formatDuration(metrics.todaySleepMs)} label="dormidas" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs tracking-[0.22em] text-muted-foreground uppercase">
          Tendencia 7 días
        </h2>
        {loading || !metrics.hasTrend ? (
          <p className="rounded-2xl bg-card/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Registra unos días para ver cambios
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <Bars title="Comidas" points={metrics.week.map((day) => ({ label: day.label, value: day.feeds, max: maxFeeds }))} />
            <Bars title="Popó" points={metrics.week.map((day) => ({ label: day.label, value: day.poops, max: maxPoops }))} />
            <Bars
              title="Horas de sueño"
              points={metrics.week.map((day) => ({
                label: day.label,
                value: day.sleepMs,
                max: maxSleep,
                display: formatDuration(day.sleepMs),
              }))}
            />
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {metrics.summaries.map((line) => (
                <li key={line}>· {line}</li>
              ))}
              {metrics.feedAvgMs ? (
                <li>· Entre comidas, {formatDuration(metrics.feedAvgMs)} de media</li>
              ) : null}
            </ul>
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
}: {
  emoji: string
  label: string
  value: string
  hint?: string
}) {
  return (
    <article className="rounded-2xl bg-card/80 px-3 py-3 ring-1 ring-white/8">
      <p className="text-xs text-muted-foreground">
        {emoji} {label}
      </p>
      <p className="mt-1 text-lg leading-snug font-medium">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  )
}

function Mini({ count, label }: { count: number | string; label: string }) {
  return (
    <article className="rounded-2xl bg-card/80 px-3 py-4 text-center ring-1 ring-white/8">
      <p className="font-clock text-3xl text-lamp">{count}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </article>
  )
}

function Bars({
  title,
  points,
}: {
  title: string
  points: { label: string; value: number; max: number; display?: string }[]
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="flex h-24 items-end gap-1.5">
        {points.map((point, index) => (
          <div key={`${point.label}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <div className="flex h-20 w-full items-end rounded-md bg-white/5">
              <div
                className={cn('w-full rounded-md bg-lamp/80')}
                style={{ height: `${Math.max(6, (point.value / point.max) * 100)}%` }}
                title={point.display ?? String(point.value)}
              />
            </div>
            <span className="text-[0.65rem] text-muted-foreground uppercase">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
