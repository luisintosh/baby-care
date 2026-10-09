import { toast } from 'sonner'
import { NightSheet, SheetButton } from '@/components/NightSheet'
import { SleepEditor } from '@/components/SleepEditor'
import { kindMeta } from '@/lib/kinds'
import type { BabyEvent } from '@/lib/types'
import type { useEvents } from '@/hooks/use-events'

type EventDialogsProps = {
  eventsApi: ReturnType<typeof useEvents>
  sleepEvent: BabyEvent | null
  deleting: BabyEvent | null
  onSleepOpenChange: (open: boolean) => void
  onDeletingOpenChange: (open: boolean) => void
}

export function EventDialogs({
  eventsApi,
  sleepEvent,
  deleting,
  onSleepOpenChange,
  onDeletingOpenChange,
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
          toast.success(endedAt ? 'Despertar registrado' : 'Sigue durmiendo')
        }}
        onDelete={async (id) => {
          await eventsApi.deleteEvent(id)
          toast.success('Sueño borrado')
        }}
      />

      <NightSheet
        open={Boolean(deleting)}
        onOpenChange={onDeletingOpenChange}
        autoFocus={false}
        title="¿Borrar este registro?"
        description={
          deleting
            ? `${kindMeta(deleting.kind).past} no se podrá recuperar.`
            : 'Este registro no se podrá recuperar.'
        }
      >
        <SheetButton
          tone="danger"
          onClick={() => {
            if (!deleting) return
            void eventsApi.deleteEvent(deleting.id).then(
              () => toast.success('Borrado'),
              (error: unknown) =>
                toast.error(error instanceof Error ? error.message : 'No se pudo borrar'),
            )
            onDeletingOpenChange(false)
          }}
        >
          Borrar
        </SheetButton>
      </NightSheet>
    </>
  )
}
