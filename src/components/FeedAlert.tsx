import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { useFeedSchedule } from '@/hooks/use-feed-schedule'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import {
  INTERVAL_STEP_MINUTES,
  MAX_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  clampIntervalMinutes,
  nextFeed,
  nextFeedLabel,
  type FeedIntervals,
} from '@/lib/feed-schedule'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { BabyEvent, Caregiver } from '@/lib/types'

type FeedAlertProps = {
  caregiver: Caregiver
  events: BabyEvent[]
}

function hintFor(support: ReturnType<typeof usePushSubscription>['support']) {
  if (support === 'ios-install') return null
  if (support === 'unsupported') return 'Este navegador no puede recibir avisos.'
  if (support === 'denied') return 'Los avisos están bloqueados en el navegador.'
  if (support === 'on') return 'Te avisamos 15 minutos antes de la próxima comida.'
  return 'Activa los avisos para que lleguen con el teléfono bloqueado.'
}

export function FeedAlert({ caregiver, events }: FeedAlertProps) {
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
  const hint = hintFor(push.support)
  const canToggle = push.support === 'on' || push.support === 'off' || push.support === 'ios-install'
  const on = push.support === 'on'

  return (
    <section className="flex flex-col items-center gap-1 text-center">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="rounded-2xl px-2 py-1 text-sm leading-snug outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-white/5"
      >
        {prediction
          ? nextFeedLabel(prediction)
          : 'Cuando registres una comida, marcamos la próxima.'}
      </button>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="h-7 rounded-full px-2.5 text-xs text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        Cambiar horario
      </button>
      {canToggle ? (
        <button
          type="button"
          aria-pressed={on}
          aria-describedby={hint ? 'feed-alert-hint' : undefined}
          disabled={push.busy}
          onClick={() => {
            void push.toggle().catch((error: unknown) => {
              toast.error(error instanceof Error ? error.message : 'No se pudieron cambiar los avisos')
            })
          }}
          className={cn(
            'h-7 rounded-full px-2.5 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px disabled:opacity-40',
            on ? 'text-muted-foreground' : 'bg-secondary text-lamp',
          )}
        >
          {on ? 'Avisos activos' : 'Activar avisos'}
        </button>
      ) : hint ? (
        <p className="text-sm leading-snug text-muted-foreground">{hint}</p>
      ) : null}
      {hint ? (
        <p id="feed-alert-hint" className="sr-only">
          {hint}
        </p>
      ) : null}
      <FeedScheduleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        intervals={schedule.intervals}
        onSave={async (next) => {
          try {
            await schedule.saveIntervals(next)
            toast.success('Horario guardado')
            setSheetOpen(false)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo guardar')
          }
        }}
      />
    </section>
  )
}

type FeedScheduleSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  intervals: FeedIntervals
  onSave: (next: FeedIntervals) => Promise<void>
}

function FeedScheduleSheet({ open, onOpenChange, intervals, onSave }: FeedScheduleSheetProps) {
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
      description="Un intervalo para el día y otro para la noche, desde las 22:00."
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
            detail="Desde las 22:00"
            minutes={draft.nightMinutes}
            onChange={(nightMinutes) => setDraft((current) => ({ ...current, nightMinutes }))}
          />
          <SheetButton type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </SheetButton>
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
        <p className="font-clock w-16 text-center text-xl font-semibold tabular-nums text-lamp">
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
