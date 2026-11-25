import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useResume } from '@/hooks/use-resume'
import { friendlyError } from '@/lib/errors'
import { addDays } from '@/lib/format'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { BabyEvent, Caregiver, EventKind } from '@/lib/types'

export const LOOKBACK_DAYS = 14

type NewEvent = {
  kind: EventKind
  occurredAt: Date
  caregiver: Caregiver
  note?: string | null
  endedAt?: Date | null
}

function sortEvents(list: BabyEvent[]) {
  return [...list].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
}

export function useEvents() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const tempId = useRef(-1)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Falta configurar Supabase en el archivo .env')
      return
    }

    const since = addDays(new Date(), -LOOKBACK_DAYS).toISOString()
    try {
      const [recent, openSleep] = await Promise.all([
        supabase
          .from('events')
          .select('*')
          .gte('occurred_at', since)
          .order('occurred_at', { ascending: false }),
        supabase.from('events').select('*').eq('kind', 'sleep').is('ended_at', null).limit(1),
      ])

      if (recent.error || openSleep.error) throw recent.error ?? openSleep.error

      const merged = new Map<number, BabyEvent>()
      for (const row of [...(recent.data ?? []), ...(openSleep.data ?? [])] as BabyEvent[]) {
        merged.set(row.id, row)
      }
      setEvents((current) => {
        // Keep rows still waiting on the server so they don't flicker away.
        const pending = current.filter((event) => event.pending)
        return sortEvents([...merged.values(), ...pending])
      })
      setError(null)
    } catch (loadError) {
      setError(friendlyError(loadError, 'No pudimos cargar el registro'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    if (!isSupabaseConfigured) return

    let joined = false
    const channel = supabase
      .channel('events-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void load()
      })
      .subscribe((status) => {
        // A rejoin after a dropped socket may have missed changes.
        if (status === 'SUBSCRIBED') {
          if (joined) void load()
          joined = true
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  useResume(() => void load())

  const openSleep = useMemo(
    () => events.find((event) => event.kind === 'sleep' && !event.ended_at && !event.pending) ?? null,
    [events],
  )

  async function createEvent(input: NewEvent) {
    const id = tempId.current--
    const optimistic: BabyEvent = {
      id,
      kind: input.kind,
      occurred_at: input.occurredAt.toISOString(),
      ended_at: input.endedAt ? input.endedAt.toISOString() : null,
      caregiver: input.caregiver,
      note: input.note ?? null,
      created_at: new Date().toISOString(),
      pending: true,
    }
    setEvents((current) => sortEvents([optimistic, ...current]))

    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        kind: input.kind,
        occurred_at: optimistic.occurred_at,
        ended_at: optimistic.ended_at,
        caregiver: input.caregiver,
        note: optimistic.note,
      })
      .select('*')
      .single()

    if (insertError) {
      setEvents((current) => current.filter((event) => event.id !== id))
      if (insertError.code === '23505') {
        throw new Error('Ya hay un sueño abierto. Edítalo para registrar el despertar.')
      }
      throw insertError
    }

    const saved = data as BabyEvent
    setEvents((current) =>
      sortEvents([saved, ...current.filter((event) => event.id !== id && event.id !== saved.id)]),
    )
    return saved
  }

  /** Puts a deleted event back (undo). It gets a new id. */
  async function restoreEvent(event: BabyEvent) {
    return createEvent({
      kind: event.kind,
      occurredAt: new Date(event.occurred_at),
      endedAt: event.ended_at ? new Date(event.ended_at) : null,
      caregiver: event.caregiver,
      note: event.note,
    })
  }

  async function updateEvent(
    id: number,
    patch: Partial<Pick<BabyEvent, 'occurred_at' | 'ended_at' | 'note'>>,
  ) {
    const { error: updateError } = await supabase.from('events').update(patch).eq('id', id)
    if (updateError) throw updateError
    await load()
  }

  async function deleteEvent(id: number) {
    const before = events
    setEvents((current) => current.filter((event) => event.id !== id))
    const { error: deleteError } = await supabase.from('events').delete().eq('id', id)
    if (deleteError) {
      setEvents(before)
      throw deleteError
    }
  }

  return {
    events,
    openSleep,
    loading,
    error,
    reload: load,
    createEvent,
    restoreEvent,
    updateEvent,
    deleteEvent,
  }
}
