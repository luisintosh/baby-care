import { useState } from 'react'
import { toast } from 'sonner'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { SleepEditor } from '@/components/SleepEditor'
import { TimeSheet } from '@/components/TimeSheet'
import { notInFuture } from '@/hooks/use-selected-time'
import { registeredBy } from '@/lib/caregiver'
import { friendlyError } from '@/lib/errors'
import { addMinutes, formatAgo, formatDuration, formatWhen } from '@/lib/format'
import { haptic } from '@/lib/haptics'
import { kindMeta } from '@/lib/kinds'
import type { BabyEvent, Caregiver } from '@/lib/types'
import type { useEvents } from '@/hooks/use-events'

type EventDialogsProps = {
  caregiver: Caregiver
  eventsApi: ReturnType<typeof useEvents>
  sleepEvent: BabyEvent | null
  detail: BabyEvent | null
  onSleepOpenChange: (open: boolean) => void
  onDetailOpenChange: (open: boolean) => void
}

/** Deletes an event and offers to put it back. */
export function deleteWithUndo(
  eventsApi: ReturnType<typeof useEvents>,
  event: BabyEvent,
  label: string,
) {
  return eventsApi.deleteEvent(event.id).then(
    () => {
      haptic('success')
      toast.success(label, {
        duration: 7000,
        action: {
          label: 'Deshacer',
          onClick: () => {
            void eventsApi.restoreEvent(event).then(
              () => toast.success('Recuperado'),
              (error: unknown) => toast.error(friendlyError(error, 'No se pudo recuperar')),
            )
          },
        },
      })
    },
    (error: unknown) => {
      haptic('error')
      toast.error(friendlyError(error, 'No se pudo borrar'))
      throw error
    },
  )
}

export function EventDialogs({
  caregiver,
  eventsApi,
  sleepEvent,
  detail,
  onSleepOpenChange,
  onDetailOpenChange,
}: EventDialogsProps) {
  return (
    <>
      <SleepEditor
        event={sleepEvent}
        open={Boolean(sleepEvent)}
        onOpenChange={onSleepOpenChange}
        onSave={async (id, occurredAt, endedAt) => {
          await eventsApi.updateEvent(id, {
            occurred_at: occurredAt.toISOString(),
            ended_at: endedAt ? endedAt.toISOString() : null,
          })
          haptic('success')
          toast.success(
            endedAt
              ? `☀️ Despertó · durmió ${formatDuration(endedAt.getTime() - occurredAt.getTime())}`
              : '😴 Sigue dormida',
          )
        }}
        onDelete={async () => {
          if (sleepEvent) await deleteWithUndo(eventsApi, sleepEvent, 'Sueño borrado')
        }}
      />

      <EventDetail
        caregiver={caregiver}
        event={detail}
        eventsApi={eventsApi}
        onOpenChange={onDetailOpenChange}
      />
    </>
  )
}

function EventDetail({
  caregiver,
  event,
  eventsApi,
  onOpenChange,
}: {
  caregiver: Caregiver
  event: BabyEvent | null
  eventsApi: ReturnType<typeof useEvents>
  onOpenChange: (open: boolean) => void
}) {
  const [timeOpen, setTimeOpen] = useState(false)
  const [draft, setDraft] = useState<Date | null>(null)
  const [busy, setBusy] = useState(false)

  if (!event) return null
  const current = event
  const meta = kindMeta(current.kind)
  const at = new Date(current.occurred_at)
  const note = current.note?.trim()

  async function saveTime(next: Date) {
    setBusy(true)
    try {
      await eventsApi.updateEvent(current.id, { occurred_at: next.toISOString() })
      toast.success(`${meta.emoji} Hora cambiada a ${formatWhen(next)}`)
      onOpenChange(false)
    } catch (error) {
      toast.error(friendlyError(error, 'No se pudo cambiar la hora'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <NightSheet
        open
        onOpenChange={onOpenChange}
        autoFocus={false}
        title={`${meta.emoji} ${meta.label} · ${formatWhen(at)}`}
        description={`${registeredBy(current.caregiver, caregiver)} · ${formatAgo(at)}`}
      >
        {note ? (
          <p className="rounded-2xl bg-secondary px-4 py-3 text-base leading-snug break-words whitespace-pre-wrap">
            {note}
          </p>
        ) : null}
        <SheetButton
          tone="secondary"
          disabled={busy || current.pending}
          onClick={() => {
            setDraft(at)
            setTimeOpen(true)
          }}
        >
          Cambiar hora
        </SheetButton>
        <SheetButton
          tone="danger"
          disabled={busy || current.pending}
          onClick={() => {
            onOpenChange(false)
            void deleteWithUndo(eventsApi, current, `${meta.emoji} ${meta.label} borrada`).catch(() => {})
          }}
        >
          Borrar
        </SheetButton>
      </NightSheet>
      <TimeSheet
        open={timeOpen}
        raised
        title={`Hora de ${meta.label.toLowerCase()}`}
        value={draft ?? at}
        onOpenChange={(open) => {
          setTimeOpen(open)
          if (!open && draft && draft.getTime() !== at.getTime()) void saveTime(draft)
        }}
        onShift={(minutes) => setDraft((value) => notInFuture(addMinutes(value ?? at, minutes)))}
        onChange={(next) => setDraft(notInFuture(next))}
      />
    </>
  )
}
