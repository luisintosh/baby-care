import { useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePushSubscription } from '@/hooks/use-push-subscription'
import { nextFeed, nextFeedLabel } from '@/lib/feed-schedule'
import type { BabyEvent, Caregiver } from '@/lib/types'

type FeedAlertProps = {
  caregiver: Caregiver
  events: BabyEvent[]
}

function hintFor(support: ReturnType<typeof usePushSubscription>['support']) {
  if (support === 'ios-install') return 'En iPhone, agrega Baby a la pantalla de inicio para recibir avisos.'
  if (support === 'unsupported') return 'Este navegador no puede recibir avisos.'
  if (support === 'denied') return 'Los avisos están bloqueados en el navegador.'
  if (support === 'on') return 'Te avisamos cuando toque la próxima comida.'
  return 'Activa los avisos para que lleguen con el teléfono bloqueado.'
}

export function FeedAlert({ caregiver, events }: FeedAlertProps) {
  const push = usePushSubscription(caregiver)
  const prediction = useMemo(
    () =>
      nextFeed(
        events
          .filter((event) => event.kind === 'feed')
          .map((event) => ({ id: event.id, occurredAt: new Date(event.occurred_at) })),
      ),
    [events],
  )
  const canToggle = push.support === 'on' || push.support === 'off'

  return (
    <section className="flex items-center gap-3 rounded-2xl bg-card px-3 py-3 ring-1 ring-white/8">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {prediction ? nextFeedLabel(prediction) : 'Cuando registres comidas, calculamos la próxima.'}
        </p>
        <p className="text-xs text-muted-foreground">{hintFor(push.support)}</p>
      </div>
      {canToggle ? (
        <Button
          type="button"
          variant={push.support === 'on' ? 'secondary' : 'default'}
          className="h-11 rounded-xl px-3"
          aria-pressed={push.support === 'on'}
          disabled={push.busy}
          onClick={() => {
            void push.toggle().catch((error: unknown) => {
              toast.error(error instanceof Error ? error.message : 'No se pudieron cambiar los avisos')
            })
          }}
        >
          {push.support === 'on' ? 'Avisos activos' : 'Activar avisos'}
        </Button>
      ) : null}
    </section>
  )
}
