import { useCallback, useState } from 'react'
import { readCaregiver, writeCaregiver } from '@/lib/caregiver'
import type { Caregiver } from '@/lib/types'

export function useCaregiver() {
  const [caregiver, setCaregiver] = useState<Caregiver | null>(() =>
    typeof window === 'undefined' ? null : readCaregiver(),
  )

  const choose = useCallback((next: Caregiver) => {
    writeCaregiver(next)
    setCaregiver(next)
  }, [])

  const reset = useCallback(() => {
    localStorage.removeItem('caregiver')
    setCaregiver(null)
  }, [])

  return { caregiver, choose, reset }
}
