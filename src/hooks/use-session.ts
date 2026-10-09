import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    localStorage.removeItem('caregiver')
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return session
}
