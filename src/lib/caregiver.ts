import type { Caregiver } from '@/lib/types'

const STORAGE_KEY = 'caregiver'

export const CAREGIVERS: { id: Caregiver; name: string }[] = [
  { id: 'luis', name: 'Luis' },
  { id: 'clau', name: 'Clau' },
]

export function isCaregiver(value: string | null): value is Caregiver {
  return value === 'luis' || value === 'clau'
}

export function readCaregiver(): Caregiver | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  return isCaregiver(stored) ? stored : null
}

export function writeCaregiver(caregiver: Caregiver) {
  localStorage.setItem(STORAGE_KEY, caregiver)
}

export function caregiverName(caregiver: Caregiver) {
  return CAREGIVERS.find((item) => item.id === caregiver)?.name ?? caregiver
}
