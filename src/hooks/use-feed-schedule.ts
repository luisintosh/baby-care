import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_FEED_INTERVALS,
  clampIntervalMinutes,
  type FeedIntervals,
} from '@/lib/feed-schedule'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type FeedScheduleRow = {
  day_minutes: number
  night_minutes: number
}

function fromRow(row: FeedScheduleRow | null | undefined): FeedIntervals {
  if (!row) return DEFAULT_FEED_INTERVALS
  return {
    dayMinutes: clampIntervalMinutes(row.day_minutes),
    nightMinutes: clampIntervalMinutes(row.night_minutes),
  }
}

export function useFeedSchedule() {
  const [intervals, setIntervals] = useState<FeedIntervals>(DEFAULT_FEED_INTERVALS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    const { data, error: queryError } = await supabase
      .from('feed_schedule')
      .select('day_minutes, night_minutes')
      .eq('id', 1)
      .maybeSingle()

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    setIntervals(fromRow(data as FeedScheduleRow | null))
    setError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
    if (!isSupabaseConfigured) return

    const channel = supabase
      .channel('feed-schedule-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feed_schedule' }, () => {
        void load()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [load])

  async function saveIntervals(next: FeedIntervals) {
    const dayMinutes = clampIntervalMinutes(next.dayMinutes)
    const nightMinutes = clampIntervalMinutes(next.nightMinutes)
    const { error: updateError } = await supabase
      .from('feed_schedule')
      .update({
        day_minutes: dayMinutes,
        night_minutes: nightMinutes,
      })
      .eq('id', 1)
    if (updateError) throw updateError
    setIntervals({ dayMinutes, nightMinutes })
  }

  return {
    intervals,
    loading,
    error,
    saveIntervals,
  }
}
