export interface Household {
  id: string
  name: string
  created_by: string | null
  created_at: string
}

export interface Member {
  user_id: string
  role: 'owner' | 'member'
  display_name: string
  avatar: string
  color: string
}

export interface Profile {
  id: string
  display_name: string
  avatar: string
  color: string
}

export interface Room {
  id: string
  household_id: string
  name: string
  room_type: string
  sort_order: number
  created_at: string
}

export interface Chore {
  id: string
  household_id: string
  room_id: string
  name: string
  /** null = una tantum */
  frequency_days: number | null
  /** yyyy-mm-dd: prima scadenza (o scadenza della faccenda una tantum) */
  start_date: string
  assigned_to: string | null
  effort: 1 | 2 | 3
  created_at: string
}

export interface Completion {
  id: string
  household_id: string
  chore_id: string
  completed_by: string | null
  completed_at: string
  points: number
}

export type NewChore = Pick<Chore, 'room_id' | 'name' | 'frequency_days' | 'start_date' | 'assigned_to' | 'effort'>
