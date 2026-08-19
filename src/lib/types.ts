export type EventKind = 'feed' | 'poop' | 'sleep' | 'medicine'
export type Caregiver = 'luis' | 'clau'

export type BabyEvent = {
  id: number
  kind: EventKind
  occurred_at: string
  ended_at: string | null
  caregiver: Caregiver
  note: string | null
  created_at: string
}

export type Reminder = {
  id: number
  title: string
  starts_on: string
  ends_on: string
  completed_at: string | null
  completed_by: Caregiver | null
  created_at: string
}
