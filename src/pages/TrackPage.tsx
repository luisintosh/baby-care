import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ActionPad } from '@/components/ActionPad'
import { FeedAlert } from '@/components/FeedAlert'
import { ReminderBanner } from '@/components/ReminderBanner'
import { SleepEditor } from '@/components/SleepEditor'
import { TimeAdjuster } from '@/components/TimeAdjuster'
import { Timeline } from '@/components/Timeline'
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
    <div className="flex flex-col gap-5">
      <ReminderBanner
        reminders={remindersApi.active}
        onComplete={(id) => {
          void remindersApi.completeReminder(id, caregiver).then(
            () => toast.success('Listo, se oculta el aviso'),
            (error: unknown) => toast.error(error instanceof Error ? error.message : 'No se pudo marcar'),
          )
        }}
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
        lastAtByKind={lastAtByKind}
      />
      <FeedAlert caregiver={caregiver} events={eventsApi.events} />
      {eventsApi.error ? (
        <p className="text-sm text-destructive">{eventsApi.error}</p>
      ) : (
        <Timeline events={eventsApi.events} onSelect={handleTimelineSelect} />
      )}

      <SleepEditor
        event={sleepEvent}
        open={Boolean(sleepEvent)}
        onOpenChange={(open) => {
          if (!open) setSleepEvent(null)
        }}
        onSave={async (id, occurredAt, endedAt) => {
          await eventsApi.updateEvent(id, {
            occurred_at: occurredAt.toISOString(),
            ended_at: endedAt ? endedAt.toISOString() : null,
          })
          toast.success(endedAt ? 'Despertar registrado' : 'Sigue durmiendo')
        }}
        onDelete={async (id) => {
          await eventsApi.deleteEvent(id)
          toast.success('Sueño borrado')
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

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Borrar este registro?</DialogTitle>
            <DialogDescription>
              {deleting ? `${kindMeta(deleting.kind).past} no se podrá recuperar.` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              className="h-11 rounded-xl"
              onClick={() => {
                if (!deleting) return
                void eventsApi.deleteEvent(deleting.id).then(
                  () => toast.success('Borrado'),
                  (error: unknown) => toast.error(error instanceof Error ? error.message : 'No se pudo borrar'),
                )
                setDeleting(null)
              }}
            >
              Borrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
