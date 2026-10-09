import type { Session } from '@supabase/supabase-js'
import { caregiverEmail, isCaregiver } from '@/lib/caregiver'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { Caregiver } from '@/lib/types'

/** `yyyy-mm-dd` from a date input, shown and sent as Mexican `dd/mm/aaaa`. */
export function mexicanDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return ''
  return `${match[3]}/${match[2]}/${match[1]}`
}

export function caregiverFromSession(session: Session | null): Caregiver | null {
  const claim = session?.user.app_metadata?.caregiver
  if (typeof claim === 'string' && isCaregiver(claim)) return claim
  const name = session?.user.email?.split('@')[0] ?? ''
  return isCaregiver(name) ? name : null
}

export async function signInCaregiver(caregiver: Caregiver, isoDate: string) {
  if (!isSupabaseConfigured) return 'Falta configurar Supabase en el archivo .env'
  const password = mexicanDate(isoDate)
  if (!password) return 'Elige la fecha.'
  const { error } = await supabase.auth.signInWithPassword({
    email: caregiverEmail(caregiver),
    password,
  })
  if (error) return 'Esa fecha no abre la sesión.'
  return null
}

export async function signOutCaregiver() {
  localStorage.removeItem('caregiver')
  await supabase.auth.signOut()
}
