import type { Caregiver } from '@/lib/types'

export const CAREGIVERS: { id: Caregiver; name: string; email: string }[] = [
  { id: 'luis', name: 'Luis', email: 'luis@familia.baby' },
  { id: 'clau', name: 'Clau', email: 'clau@familia.baby' },
]

export function isCaregiver(value: string | null): value is Caregiver {
  return value === 'luis' || value === 'clau'
}

export function caregiverName(caregiver: Caregiver) {
  return CAREGIVERS.find((item) => item.id === caregiver)?.name ?? caregiver
}

export function caregiverEmail(caregiver: Caregiver) {
  return CAREGIVERS.find((item) => item.id === caregiver)?.email ?? ''
}
