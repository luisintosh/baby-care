import { useCallback, useEffect, useMemo, useState } from 'react'
import { toDateInput } from '@/lib/format'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Caregiver, Reminder } from '@/lib/types'

function isActive(reminder: Reminder, today = toDateInput(new Date())) {
  return !reminder.completed_at && reminder.starts_on <= today && reminder.ends_on >= today
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('reminders')
      .select('*')
      .order('starts_on', { ascending: true })

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    setReminders((data ?? []) as Reminder[])
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('reminders-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  const active = useMemo(() => reminders.filter((reminder) => isActive(reminder)), [reminders])

  async function createReminder(input: { title: string; startsOn: string; endsOn: string }) {
    const { error: insertError } = await supabase.from('reminders').insert({
      title: input.title,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
    })
    if (insertError) throw insertError
    await load()
  }

  async function completeReminder(id: number, caregiver: Caregiver) {
    const { error: updateError } = await supabase
      .from('reminders')
      .update({
        completed_at: new Date().toISOString(),
        completed_by: caregiver,
      })
      .eq('id', id)
    if (updateError) throw updateError
    await load()
  }

  async function deleteReminder(id: number) {
    const { error: deleteError } = await supabase.from('reminders').delete().eq('id', id)
    if (deleteError) throw deleteError
    await load()
  }

  return {
    reminders,
    active,
    loading,
    error,
    createReminder,
    completeReminder,
    deleteReminder,
  }
}
