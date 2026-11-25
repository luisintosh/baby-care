import { useEffect, useMemo, useState } from 'react'
import { BellOff, BellRing, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { useFeedSchedule } from '@/hooks/use-feed-schedule'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import { friendlyError } from '@/lib/errors'
import {
  INTERVAL_STEP_MINUTES,
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  clampIntervalMinutes,
  formatFeedClock,
  nextFeed,
  nextFeedStatus,
  type FeedIntervals,
  type NextFeed,
} from '@/lib/feed-schedule'
import { formatDuration, formatElapsed } from '@/lib/format'
import type { BabyEvent, Caregiver } from '@/lib/types'
import { cn } from '@/lib/utils'

type FeedAlertProps = {
  caregiver: Caregiver
  events: BabyEvent[]
  /** While the log is loading or failed, "no feed yet" would be a lie. */
  ready: boolean
}

type PushSupport = ReturnType<typeof usePushSubscription>['support']

function pushHint(support: PushSupport) {
  if (support === 'ios-install') return 'Para recibir alertas con el teléfono bloqueado, agrega Baby a tu pantalla de inicio.'
  if (support === 'unsupported') return 'Este navegador no puede recibir alertas.'
  if (support === 'denied') return 'Las alertas están bloqueadas en los ajustes del navegador.'
  if (support === 'on') return 'Alertas de comida activas: te avisamos 15 min antes y otra vez si pasan 30 min.'
  return 'Activa las alertas para que lleguen con el teléfono bloqueado.'
}

export function FeedAlert({ caregiver, events, ready }: FeedAlertProps) {
  const push = usePushSubscription(caregiver)
  const schedule = useFeedSchedule()
  const [sheetOpen, setSheetOpen] = useState(false)
  const prediction = useMemo(
    () =>
      nextFeed(
        events
          .filter((event) => event.kind === 'feed')
          .map((event) => ({ id: event.id, occurredAt: new Date(event.occurred_at) })),
        schedule.intervals,
      ),
    [events, schedule.intervals],
  )

  function togglePush() {
    void push.toggle().catch((error: unknown) => {
      toast.error(friendlyError(error, 'No se pudieron cambiar las alertas'))
    })
  }

  return (
    <section aria-label="Próxima comida" className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={cn(
          'flex min-h-14 flex-1 items-center justify-between gap-2 rounded-2xl px-4 py-1.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px',
          prediction && ready && nextFeedStatus(prediction) === 'late'
            ? 'border border-due/50 bg-due/15'
            : 'border border-transparent bg-card/60',
        )}
      >
        {ready ? (
          prediction ? (
            <NextFeedLine next={prediction} pushOn={push.support === 'on'} />
          ) : (
            <span className="text-sm text-muted-foreground">
              Registra una comida y calculamos la próxima.
            </span>
          )
        ) : (
          <span className="h-5 w-40 rounded-md bg-foreground/5" aria-hidden />
        )}
        <span className="flex shrink-0 items-center text-muted-foreground">
          <span className="sr-only">Cambiar horario</span>
          <ChevronRight className="size-5" aria-hidden />
        </span>
      </button>
      {push.support === 'off' || push.support === 'ios-install' ? (
        <button
          type="button"
          disabled={push.busy}
          onClick={push.support === 'off' ? togglePush : () => setSheetOpen(true)}
          aria-label={
            push.support === 'off'
              ? 'Activar alertas de comida'
              : 'Alertas de comida: cómo activarlas en iPhone'
          }
          className="flex min-h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-secondary text-lamp outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40"
        >
          <BellOff className="size-5" aria-hidden />
        </button>
      ) : null}
      <FeedScheduleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        intervals={schedule.intervals}
        push={push.support}
        pushBusy={push.busy}
        onTogglePush={togglePush}
        onSave={async (next) => {
          try {
            await schedule.saveIntervals(next)
            toast.success('Horario guardado')
            setSheetOpen(false)
          } catch (error) {
            toast.error(friendlyError(error, 'No se pudo guardar'))
          }
        }}
      />
    </section>
  )
}

/** Upcoming: the time, big. Within 15 min: amber countdown. Late: coral, how late. */
function NextFeedLine({ next, pushOn }: { next: NextFeed; pushOn: boolean }) {
  const now = new Date()
  const status = nextFeedStatus(next, now)
  const clock = formatFeedClock(next.dueAt)
  const rule = `cada ${formatDuration(next.intervalMs)}`

  if (status === 'late') {
    return (
      <span className="flex min-w-0 flex-col" role="status">
        <span className="text-base font-semibold text-due">Toca comida</span>
        <span className="text-sm text-due/90">
          desde las <span className="font-clock font-medium">{clock}</span> · hace{' '}
          {formatElapsed(next.dueAt, now)}
        </span>
      </span>
    )
  }

  return (
    <span className="flex min-w-0 flex-col">
      <span className="text-xs text-muted-foreground">
        Próxima comida · {rule}
        {pushOn ? (
          <BellRing className="ml-1.5 inline size-3.5 align-[-2px] text-lamp" aria-label="alertas activas" />
        ) : null}
      </span>
      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-clock text-2xl leading-tight font-semibold',
            status === 'soon' ? 'text-lamp' : 'text-foreground',
          )}
        >
          {clock}
        </span>
        <span className={cn('text-sm whitespace-nowrap', status === 'soon' ? 'font-medium text-lamp' : 'text-muted-foreground')}>
          en {formatElapsed(now, next.dueAt)}
        </span>
      </span>
    </span>
  )
}

type FeedScheduleSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  intervals: FeedIntervals
  push: PushSupport
  pushBusy: boolean
  onTogglePush: () => void
  onSave: (next: FeedIntervals) => Promise<void>
}

function FeedScheduleSheet({
  open,
  onOpenChange,
  intervals,
  push,
  pushBusy,
  onTogglePush,
  onSave,
}: FeedScheduleSheetProps) {
  const [draft, setDraft] = useState(intervals)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setDraft(intervals)
  }, [open, intervals])

  return (
    <NightSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Horario de comidas"
      description="La próxima comida es la última más el intervalo del momento en que comió: uno de día y otro de noche, desde las 22:00."
    >
      {open ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            setSaving(true)
            void onSave(draft).finally(() => setSaving(false))
          }}
        >
          <IntervalStepper
            label="Día"
            detail="De 7:00 a 22:00"
            minutes={draft.dayMinutes}
            onChange={(dayMinutes) => setDraft((current) => ({ ...current, dayMinutes }))}
          />
          <IntervalStepper
            label="Noche"
            detail="De 22:00 a 7:00"
            minutes={draft.nightMinutes}
            onChange={(nightMinutes) => setDraft((current) => ({ ...current, nightMinutes }))}
          />
          <SheetButton type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </SheetButton>
          <div className="flex flex-col gap-2 rounded-2xl bg-secondary/60 px-4 py-3">
            <p className="flex items-start gap-2 text-sm leading-snug">
              {push === 'on' ? (
                <BellRing className="mt-0.5 size-4 shrink-0 text-lamp" aria-hidden />
              ) : (
                <BellOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <span className={push === 'on' ? 'text-foreground' : 'text-muted-foreground'}>
                {pushHint(push)}
              </span>
            </p>
            {push === 'off' || push === 'on' ? (
              <SheetButton tone="secondary" disabled={pushBusy} onClick={onTogglePush}>
                {push === 'on' ? 'Desactivar alertas de comida' : 'Activar alertas de comida'}
              </SheetButton>
            ) : null}
          </div>
        </form>
      ) : null}
    </NightSheet>
  )
}

type IntervalStepperProps = {
  label: string
  detail: string
  minutes: number
  onChange: (minutes: number) => void
}

function IntervalStepper({ label, detail, minutes, onChange }: IntervalStepperProps) {
  const value = clampIntervalMinutes(minutes)

  function step(delta: number) {
    onChange(clampIntervalMinutes(value + delta))
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-secondary/60 px-3 py-3">
      <div className="min-w-0 text-left">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${label}, bajar 15 minutos`}
          disabled={value <= MIN_INTERVAL_MINUTES}
          onClick={() => step(-INTERVAL_STEP_MINUTES)}
          className="flex size-11 items-center justify-center rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40"
        >
          <ChevronDown className="size-5" />
        </button>
        <p
          className="font-clock min-w-24 text-center text-lg font-semibold text-foreground"
          aria-live="polite"
        >
          {formatDuration(value * 60_000)}
        </p>
        <button
          type="button"
          aria-label={`${label}, subir 15 minutos`}
          disabled={value >= MAX_INTERVAL_MINUTES}
          onClick={() => step(INTERVAL_STEP_MINUTES)}
          className="flex size-11 items-center justify-center rounded-2xl bg-secondary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40"
        >
          <ChevronUp className="size-5" />
        </button>
      </div>
    </div>
  )
}
