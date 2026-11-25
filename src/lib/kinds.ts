import type { EventKind } from '@/lib/types'

export const KINDS: {
  id: EventKind
  emoji: string
  label: string
  past: string
}[] = [
  { id: 'feed', emoji: '🍼', label: 'Comida', past: 'Comió' },
  { id: 'poop', emoji: '💩', label: 'Popó', past: 'Hizo popó' },
  { id: 'sleep', emoji: '😴', label: 'Sueño', past: 'Durmió' },
  { id: 'medicine', emoji: '💊', label: 'Medicina', past: 'Tomó medicina' },
  { id: 'solid', emoji: '🥣', label: 'Papilla', past: 'Comió papilla' },
]

/** The small buttons under Comida on Registrar. Sleep is no longer logged there. */
export const PAD_KINDS: EventKind[] = ['poop', 'solid', 'medicine']

export function kindMeta(kind: EventKind) {
  return KINDS.find((item) => item.id === kind) ?? KINDS[0]
}
