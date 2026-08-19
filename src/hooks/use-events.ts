import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays } from '@/lib/format'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { BabyEvent, Caregiver, EventKind } from '@/lib/types'

const LOOKBACK_DAYS = 14

export function useEvents() {
  const [events, setEvents] = useState<BabyEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      setError('Falta configurar Supabase en el archivo .env')
      return
    }

    const since = addDays(new Date(), -LOOKBACK_DAYS).toISOString()
    const [recent, openSleep] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('events')
        .select('*')
        .eq('kind', 'sleep')
        .is('ended_at', null)
        .limit(1),
    ])

    if (recent.error || openSleep.error) {
      setError(recent.error?.message ?? openSleep.error?.message ?? 'No se pudo cargar')
      setLoading(false)
      return
    }

    const merged = new Map<number, BabyEvent>()
    for (const row of [...(recent.data ?? []), ...(openSleep.data ?? [])] as BabyEvent[]) {
      merged.set(row.id, row)
    }
    setEvents([...merged.values()].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)))
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('events-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  const openSleep = useMemo(
    () => events.find((event) => event.kind === 'sleep' && !event.ended_at) ?? null,
    [events],
  )

  async function createEvent(input: {
    kind: EventKind
    occurredAt: Date
    caregiver: Caregiver
    note?: string | null
  }) {
    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        kind: input.kind,
        occurred_at: input.occurredAt.toISOString(),
        caregiver: input.caregiver,
        note: input.note ?? null,
      })
      .select('*')
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('Ya hay un sueño abierto. Edítalo para registrar el despertar.')
      }
      throw insertError
    }
    await load()
    return data as BabyEvent
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
    const { error: deleteError } = await supabase.from('events').delete().eq('id', id)
    if (deleteError) throw deleteError
    await load()
  }

  return { events, openSleep, loading, error, reload: load, createEvent, updateEvent, deleteEvent }
}
