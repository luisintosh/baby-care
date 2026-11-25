import { useState } from 'react'
import { EventDialogs } from '@/components/EventDialogs'
import { LoadError } from '@/components/LoadError'
import { Timeline } from '@/components/Timeline'
import type { useEvents } from '@/hooks/use-events'
import type { BabyEvent, Caregiver } from '@/lib/types'

type HistoryPageProps = {
  caregiver: Caregiver
  eventsApi: ReturnType<typeof useEvents>
}

export function HistoryPage({ caregiver, eventsApi }: HistoryPageProps) {
  const [sleepEvent, setSleepEvent] = useState<BabyEvent | null>(null)
  const [detail, setDetail] = useState<BabyEvent | null>(null)

  function handleSelect(event: BabyEvent) {
    if (event.pending) return
    if (event.kind === 'sleep') {
      setSleepEvent(event)
      return
    }
    setDetail(event)
  }

  return (
    <div className="flex flex-col gap-4">
      {eventsApi.error ? <LoadError message={eventsApi.error} onRetry={eventsApi.reload} /> : null}
      {eventsApi.loading ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Cargando historial">
          <div className="h-6 w-32 rounded-md bg-foreground/5" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="h-16 rounded-2xl bg-card" />
          ))}
        </div>
      ) : eventsApi.error && eventsApi.events.length === 0 ? null : (
        <Timeline caregiver={caregiver} events={eventsApi.events} onSelect={handleSelect} />
      )}
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
    </div>
  )
}
