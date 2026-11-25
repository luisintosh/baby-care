import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { ActionPad } from '@/components/ActionPad'
import { EventDialogs } from '@/components/EventDialogs'
import { FeedAlert } from '@/components/FeedAlert'
import { LoadError } from '@/components/LoadError'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { RecentLog } from '@/components/RecentLog'
import { ReminderBanner } from '@/components/ReminderBanner'
import { TimeSheet, TimeStamp } from '@/components/TimeSheet'
import { useSelectedTime } from '@/hooks/use-selected-time'
import type { useEvents } from '@/hooks/use-events'
import type { useReminders } from '@/hooks/use-reminders'
import { friendlyError } from '@/lib/errors'
import { formatWhen } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { kindMeta } from '@/lib/kinds'
import type { BabyEvent, Caregiver, EventKind } from '@/lib/types'

/** A second tap of the same button within this window is treated as a slip. */
const REPEAT_GUARD_MS = 3000

type TrackPageProps = {
  caregiver: Caregiver
  eventsApi: ReturnType<typeof useEvents>
  remindersApi: ReturnType<typeof useReminders>
}

export function TrackPage({ caregiver, eventsApi, remindersApi }: TrackPageProps) {
  const clock = useSelectedTime()
  const [timeOpen, setTimeOpen] = useState(false)
  const [sleepEvent, setSleepEvent] = useState<BabyEvent | null>(null)
  const [pendingKind, setPendingKind] = useState<EventKind | null>(null)
  const [note, setNote] = useState('')
  const [detail, setDetail] = useState<BabyEvent | null>(null)
  const [busyKinds, setBusyKinds] = useState<ReadonlySet<EventKind>>(new Set())
  const lastTap = useRef<Partial<Record<EventKind, number>>>({})
  const [clockSlot, setClockSlot] = useState<HTMLElement | null>(null)

  // The live clock sits in the header; a moved clock comes down next to the pad.
  useLayoutEffect(() => {
    setClockSlot(document.getElementById('registrar-clock'))
  }, [])

  const lastAtByKind = useMemo(() => {
    const last: Partial<Record<EventKind, Date>> = {}
    for (const event of eventsApi.events) {
      if (last[event.kind]) continue
      last[event.kind] = new Date(
        event.kind === 'sleep' && event.ended_at ? event.ended_at : event.occurred_at,
      )
    }
    return last
  }, [eventsApi.events])

  function setBusy(kind: EventKind, busy: boolean) {
    setBusyKinds((current) => {
      const next = new Set(current)
      if (busy) next.add(kind)
      else next.delete(kind)
      return next
    })
  }

  async function logKind(kind: EventKind, extraNote: string | null, occurredAt: Date) {
    const meta = kindMeta(kind)
    setBusy(kind, true)
    try {
      const created = await eventsApi.createEvent({ kind, occurredAt, caregiver, note: extraNote })
      haptic('success')
      const title =
        kind === 'sleep'
          ? `${meta.emoji} Se durmió · ${formatWhen(occurredAt)}`
          : `${meta.emoji} ${meta.label} · ${formatWhen(occurredAt)}`
      toast.success(title, {
        duration: 7000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            void eventsApi.deleteEvent(created.id).then(
              () => {
                haptic('tap')
                toast('Deshecho', { duration: 2500 })
              },
              (error: unknown) => toast.error(friendlyError(error, 'No se pudo deshacer')),
            )
          },
        },
      })
    } catch (error) {
      haptic('error')
      toast.error(friendlyError(error, `No se guardó ${meta.label.toLowerCase()}`), {
        duration: Number.POSITIVE_INFINITY,
        description: `Era para las ${formatWhen(occurredAt)}.`,
        action: {
          label: 'Reintentar',
          onClick: () => void logKind(kind, extraNote, occurredAt),
        },
      })
    } finally {
      setBusy(kind, false)
    }
  }

  /** Logs at the chosen time, then puts the clock back to now for the next log. */
  function logAtClock(kind: EventKind, extraNote: string | null = null) {
    const occurredAt = clock.live ? new Date() : clock.value
    if (!clock.live) clock.resetToNow()
    void logKind(kind, extraNote, occurredAt)
  }

  function handleSelect(kind: EventKind) {
    haptic('tap')
    if (kind === 'sleep' && eventsApi.openSleep) {
      setSleepEvent(eventsApi.openSleep)
      return
    }
    if (kind === 'medicine') {
      setNote('')
      setPendingKind('medicine')
      return
    }
    const now = Date.now()
    const previous = lastTap.current[kind]
    if (busyKinds.has(kind) || (previous && now - previous < REPEAT_GUARD_MS)) {
      toast(`${kindMeta(kind).emoji} Ya lo registraste hace un momento`, {
        description: 'Si fue otra, espera unos segundos y toca de nuevo.',
        duration: 3000,
      })
      return
    }
    lastTap.current[kind] = now
    logAtClock(kind)
  }

  function handleTimelineSelect(event: BabyEvent) {
    if (event.pending) return
    if (event.kind === 'sleep') {
      setSleepEvent(event)
      return
    }
    setDetail(event)
  }

  const failed = Boolean(eventsApi.error)
  const ready = !eventsApi.loading && !failed

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain">
      <div className="registrar-scroll scroll-fade flex min-h-[6.5rem] flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pb-4">
        {failed ? <LoadError message={eventsApi.error ?? ''} onRetry={eventsApi.reload} /> : null}
        <ReminderBanner
          reminders={remindersApi.active}
          onComplete={(id) => {
            void remindersApi.completeReminder(id, caregiver).then(
              () => {
                haptic('success')
                toast.success('Aviso hecho')
              },
              (error: unknown) => toast.error(friendlyError(error, 'No se pudo marcar')),
            )
          }}
        />
        <RecentLog
          caregiver={caregiver}
          events={eventsApi.events}
          loading={eventsApi.loading}
          failed={failed}
          onSelect={handleTimelineSelect}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-3 pb-3">
        <FeedAlert caregiver={caregiver} events={eventsApi.events} ready={ready} />
        {clock.live ? null : (
          <TimeStamp value={clock.value} live={false} onOpen={() => setTimeOpen(true)} onNow={clock.resetToNow} />
        )}
        <ActionPad
          onSelect={handleSelect}
          openSleepSince={eventsApi.openSleep ? new Date(eventsApi.openSleep.occurred_at) : null}
          lastAtByKind={lastAtByKind}
          busyKinds={busyKinds}
        />
      </div>
      {clock.live && clockSlot
        ? createPortal(
            <TimeStamp value={clock.value} live onOpen={() => setTimeOpen(true)} onNow={clock.resetToNow} />,
            clockSlot,
          )
        : null}
      <TimeSheet
        open={timeOpen}
        onOpenChange={setTimeOpen}
        title="¿A qué hora fue?"
        value={clock.value}
        live={clock.live}
        onShift={clock.shift}
        onChange={clock.setValue}
        onNow={clock.resetToNow}
      />
      <EventDialogs
        caregiver={caregiver}
        eventsApi={eventsApi}
        sleepEvent={sleepEvent}
        detail={detail}
        onSleepOpenChange={(open) => {
          if (!open) setSleepEvent(null)
        }}
        onDetailOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      />

      <NightSheet
        open={pendingKind === 'medicine'}
        onOpenChange={(open) => {
          if (!open) setPendingKind(null)
        }}
        title="Medicina 💊"
        description={
          clock.live
            ? 'La nota es opcional. Puedes guardar en blanco.'
            : `Se registra a las ${formatWhen(clock.value)}. La nota es opcional.`
        }
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Nota</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Cuál y dosis"
            rows={3}
            aria-label="Nota de medicina"
            className="min-h-24 w-full resize-none rounded-2xl bg-secondary px-3 py-3 text-base text-foreground caret-lamp outline-none selection:bg-lamp/30 placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <SheetButton
          onClick={() => {
            logAtClock('medicine', note.trim() || null)
            setPendingKind(null)
          }}
        >
          Registrar medicina
        </SheetButton>
      </NightSheet>
    </div>
  )
}
