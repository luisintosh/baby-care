import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ActionPad } from '@/components/ActionPad'
import { EventDialogs } from '@/components/EventDialogs'
import { FeedAlert } from '@/components/FeedAlert'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { RecentLog } from '@/components/RecentLog'
import { ReminderBanner } from '@/components/ReminderBanner'
import { TimeSheet, TimeStamp } from '@/components/TimeSheet'
import { useSelectedTime } from '@/hooks/use-selected-time'
import type { useEvents } from '@/hooks/use-events'
import type { useReminders } from '@/hooks/use-reminders'
import { kindMeta } from '@/lib/kinds'
import type { BabyEvent, Caregiver, EventKind } from '@/lib/types'

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
  const [deleting, setDeleting] = useState<BabyEvent | null>(null)
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

  async function logKind(kind: EventKind, extraNote?: string | null) {
    try {
      const created = await eventsApi.createEvent({
        kind,
        occurredAt: clock.live ? new Date() : clock.value,
        caregiver,
        note: extraNote,
      })
      const meta = kindMeta(kind)
      toast.success(`${meta.emoji} ${meta.past}`, {
        action: {
          label: 'Deshacer',
          onClick: () => {
            void eventsApi.deleteEvent(created.id)
          },
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar')
    }
  }

  function handleSelect(kind: EventKind) {
    if (kind === 'sleep' && eventsApi.openSleep) {
      setSleepEvent(eventsApi.openSleep)
      return
    }
    if (kind === 'medicine') {
      setNote('')
      setPendingKind('medicine')
      return
    }
    void logKind(kind)
  }

  function handleTimelineSelect(event: BabyEvent) {
    if (event.kind === 'sleep') {
      setSleepEvent(event)
      return
    }
    setDeleting(event)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="registrar-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-y-contain pb-1">
        <ReminderBanner
          reminders={remindersApi.active}
          onComplete={(id) => {
            void remindersApi.completeReminder(id, caregiver).then(
              () => toast.success('Listo, se oculta el aviso'),
              (error: unknown) => toast.error(error instanceof Error ? error.message : 'No se pudo marcar'),
            )
          }}
        />
        {eventsApi.error ? <p className="shrink-0 text-sm text-destructive">{eventsApi.error}</p> : null}
        <RecentLog
          events={eventsApi.events}
          loading={eventsApi.loading}
          onSelect={handleTimelineSelect}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-3 pb-2">
        <FeedAlert caregiver={caregiver} events={eventsApi.events} />
        <TimeStamp
          value={clock.value}
          live={clock.live}
          onOpen={() => setTimeOpen(true)}
          onNow={clock.resetToNow}
        />
        <ActionPad
          onSelect={handleSelect}
          openSleepSince={eventsApi.openSleep ? new Date(eventsApi.openSleep.occurred_at) : null}
          lastAtByKind={lastAtByKind}
        />
      </div>
      <TimeSheet
        open={timeOpen}
        onOpenChange={setTimeOpen}
        value={clock.value}
        live={clock.live}
        onShift={clock.shift}
        onChange={clock.setValue}
        onNow={clock.resetToNow}
      />
      <EventDialogs
        eventsApi={eventsApi}
        sleepEvent={sleepEvent}
        deleting={deleting}
        onSleepOpenChange={(open) => {
          if (!open) setSleepEvent(null)
        }}
        onDeletingOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />

      <NightSheet
        open={pendingKind === 'medicine'}
        onOpenChange={(open) => {
          if (!open) setPendingKind(null)
        }}
        title="Medicina 💊"
        description="La nota es opcional. Puedes guardar en blanco."
      >
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Cuál, dosis…"
          rows={3}
          className="min-h-24 w-full resize-none rounded-2xl bg-secondary px-3 py-3 text-base text-foreground caret-lamp outline-none selection:bg-lamp/30 placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <SheetButton
          onClick={() => {
            void logKind('medicine', note.trim() || null)
            setPendingKind(null)
          }}
        >
          Registrar
        </SheetButton>
      </NightSheet>
    </div>
  )
}
