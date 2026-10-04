import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EventDialogs } from '@/components/EventDialogs'
import { Timeline } from '@/components/Timeline'
import type { useEvents } from '@/hooks/use-events'
import type { BabyEvent } from '@/lib/types'

type HistoryPageProps = {
  eventsApi: ReturnType<typeof useEvents>
}

export function HistoryPage({ eventsApi }: HistoryPageProps) {
  const [sleepEvent, setSleepEvent] = useState<BabyEvent | null>(null)
  const [deleting, setDeleting] = useState<BabyEvent | null>(null)

  function handleSelect(event: BabyEvent) {
    if (event.kind === 'sleep') {
      setSleepEvent(event)
      return
    }
    setDeleting(event)
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/"
        className="w-fit rounded-full px-1 py-1 text-sm text-lamp outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        ← Registrar
      </Link>
      <h1 className="text-xl">Anteriores</h1>
      {eventsApi.error ? (
        <p className="text-sm text-destructive">{eventsApi.error}</p>
      ) : (
        <Timeline events={eventsApi.events} onSelect={handleSelect} />
      )}
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
    </div>
  )
}
