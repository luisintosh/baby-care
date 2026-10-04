import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ActionPad } from '@/components/ActionPad'
import { EventDialogs } from '@/components/EventDialogs'
import { FeedAlert } from '@/components/FeedAlert'
import { RecentLog } from '@/components/RecentLog'
import { ReminderBanner } from '@/components/ReminderBanner'
import { TimeAdjuster } from '@/components/TimeAdjuster'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useFitLogRows } from '@/hooks/use-fit-log-rows'
import { useSelectedTime } from '@/hooks/use-selected-time'
import type { useEvents } from '@/hooks/use-events'
import type { useReminders } from '@/hooks/use-reminders'
import { kindMeta } from '@/lib/kinds'
import { cn } from '@/lib/utils'
import type { BabyEvent, Caregiver, EventKind } from '@/lib/types'

type TrackPageProps = {
  caregiver: Caregiver
  eventsApi: ReturnType<typeof useEvents>
  remindersApi: ReturnType<typeof useReminders>
}

export function TrackPage({ caregiver, eventsApi, remindersApi }: TrackPageProps) {
  const clock = useSelectedTime()
  const columnRef = useRef<HTMLDivElement>(null)
  const logFit = useFitLogRows(
    columnRef,
    [
      remindersApi.active.length,
      eventsApi.loading ? 1 : 0,
      eventsApi.events.length,
      eventsApi.error ? 1 : 0,
      clock.live ? 1 : 0,
    ].join(':'),
  )
  const [sleepEvent, setSleepEvent] = useState<BabyEvent | null>(null)
  const [pendingKind, setPendingKind] = useState<EventKind | null>(null)
  const [note, setNote] = useState('')
  const [deleting, setDeleting] = useState<BabyEvent | null>(null)

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
    <div
      ref={columnRef}
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden',
        logFit.gap === '1' ? 'gap-1' : logFit.gap === '2' ? 'gap-2' : 'gap-5',
      )}
    >
      <ReminderBanner
        reminders={remindersApi.active}
        onComplete={(id) => {
          void remindersApi.completeReminder(id, caregiver).then(
            () => toast.success('Listo, se oculta el aviso'),
            (error: unknown) => toast.error(error instanceof Error ? error.message : 'No se pudo marcar'),
          )
        }}
      />
      <FeedAlert caregiver={caregiver} events={eventsApi.events} />
      {eventsApi.error ? <p className="text-sm text-destructive">{eventsApi.error}</p> : null}
      <RecentLog
        events={eventsApi.events}
        loading={eventsApi.loading}
        limit={logFit.rows}
        onSelect={handleTimelineSelect}
      />
      <TimeAdjuster
        value={clock.value}
        live={clock.live}
        onShift={clock.shift}
        onNow={clock.resetToNow}
        onChange={clock.setValue}
      />
      <ActionPad
        onSelect={handleSelect}
        openSleepSince={eventsApi.openSleep ? new Date(eventsApi.openSleep.occurred_at) : null}
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

      <Dialog
        open={pendingKind === 'medicine'}
        onOpenChange={(open) => {
          if (!open) setPendingKind(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Medicina 💊</DialogTitle>
            <DialogDescription>La nota es opcional. Puedes guardar en blanco.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Cuál, dosis…"
            className="min-h-24"
          />
          <DialogFooter>
            <Button
              className="h-11 rounded-xl"
              onClick={() => {
                void logKind('medicine', note.trim() || null)
                setPendingKind(null)
              }}
            >
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
