import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api } from '../lib/supabase'
import type { Chore, Completion, NewChore, Room } from '../lib/types'
import { addDays, todayKey } from '../lib/dates'
import { choreStatus, EFFORT_POINTS, indexCompletions, type ChoreStatus } from '../lib/chores'
import { completionCheer } from '../lib/motivation'
import { useAuth } from './AuthContext'
import { useHousehold } from './HouseholdContext'

interface Cheer {
  id: number
  text: string
}

interface HomeContextValue {
  loading: boolean
  rooms: Room[]
  chores: Chore[]
  completions: Completion[]
  statuses: Map<string, ChoreStatus>
  history: Map<string, Completion[]>
  roomById: (id: string) => Room | undefined
  cheer: Cheer | null
  addRoom: (name: string, roomType: string, presets: NewChore[]) => Promise<{ room: Room | null; error: string | null }>
  updateRoom: (id: string, patch: Partial<Pick<Room, 'name' | 'room_type'>>) => Promise<{ error: string | null }>
  deleteRoom: (id: string) => Promise<{ error: string | null }>
  addChore: (chore: NewChore) => Promise<{ error: string | null }>
  updateChore: (id: string, patch: Partial<NewChore>) => Promise<{ error: string | null }>
  deleteChore: (id: string) => Promise<{ error: string | null }>
  completeChore: (chore: Chore) => Promise<{ error: string | null }>
  undoCompletion: (id: string) => Promise<{ error: string | null }>
  distributeChores: (onlyUnassigned: boolean) => Promise<{ error: string | null }>
}

const HomeContext = createContext<HomeContextValue | null>(null)

/** Storico caricato: ~13 mesi bastano per streak, statistiche e ultima esecuzione */
const HISTORY_DAYS = 400

export function HomeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { currentHousehold, members } = useHousehold()
  const householdId = currentHousehold?.id ?? null
  const [rooms, setRooms] = useState<Room[]>([])
  const [chores, setChores] = useState<Chore[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [cheer, setCheer] = useState<Cheer | null>(null)
  const [today, setToday] = useState(todayKey)
  const cheerTimer = useRef<number | undefined>(undefined)

  const reload = useCallback(async () => {
    if (!householdId) return
    const since = new Date(`${addDays(todayKey(), -HISTORY_DAYS)}T00:00:00`).toISOString()
    const snap = await api.loadHome(householdId, since)
    setRooms(snap.rooms)
    setChores(snap.chores)
    setCompletions(snap.completions)
    setLoading(false)
  }, [householdId])

  useEffect(() => {
    setLoading(true)
    reload()
    if (!householdId) return
    return api.subscribe(householdId, reload)
  }, [householdId, reload])

  // Ricalcola quando si torna sull'app (es. il giorno dopo) o cambia data
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      setToday(todayKey())
      reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(() => setToday(todayKey()), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [reload])

  const history = useMemo(() => indexCompletions(completions), [completions])
  const statuses = useMemo(() => {
    const map = new Map<string, ChoreStatus>()
    for (const c of chores) map.set(c.id, choreStatus(c, history.get(c.id), today))
    return map
  }, [chores, history, today])

  async function run(p: Promise<{ error: string | null }>) {
    const { error } = await p
    await reload()
    return { error }
  }

  async function addRoom(name: string, roomType: string, presets: NewChore[]) {
    if (!householdId || !user) return { room: null, error: 'Nessuna casa selezionata' }
    const { data: room, error } = await api.addRoom(householdId, name, roomType)
    if (error || !room) return { room: null, error: error ?? 'Errore' }
    const res = await api.addChores(
      householdId,
      user.id,
      presets.map((p) => ({ ...p, room_id: room.id })),
    )
    await reload()
    return { room, error: res.error }
  }

  async function completeChore(chore: Chore) {
    if (!householdId || !user) return { error: 'Nessuna casa selezionata' }
    const points = EFFORT_POINTS[chore.effort]
    const optimistic: Completion = {
      id: `tmp-${Date.now()}`,
      household_id: householdId,
      chore_id: chore.id,
      completed_by: user.id,
      completed_at: new Date().toISOString(),
      points,
    }
    setCompletions((prev) => [optimistic, ...prev])
    window.clearTimeout(cheerTimer.current)
    setCheer({ id: Date.now(), text: completionCheer(points) })
    cheerTimer.current = window.setTimeout(() => setCheer(null), 2600)
    if ('vibrate' in navigator) navigator.vibrate?.(30)
    return run(api.complete(householdId, chore.id, user.id, points))
  }

  async function distributeChores(onlyUnassigned: boolean) {
    if (members.length === 0) return { error: 'Nessun membro nella casa' }
    // Carico settimanale stimato di una faccenda = punti × volte a settimana
    const weekly = (c: Chore) => EFFORT_POINTS[c.effort] * (c.frequency_days ? 7 / c.frequency_days : 1)
    const load = new Map(members.map((m) => [m.user_id, 0]))
    const toAssign: Chore[] = []
    for (const c of chores) {
      const s = statuses.get(c.id)
      if (s?.done) continue
      if (onlyUnassigned && c.assigned_to && load.has(c.assigned_to)) {
        load.set(c.assigned_to, (load.get(c.assigned_to) ?? 0) + weekly(c))
      } else {
        toAssign.push(c)
      }
    }
    toAssign.sort((a, b) => weekly(b) - weekly(a))
    const updates: Promise<{ error: string | null }>[] = []
    for (const c of toAssign) {
      let best = members[0].user_id
      for (const [id, l] of load) if (l < (load.get(best) ?? 0)) best = id
      load.set(best, (load.get(best) ?? 0) + weekly(c))
      if (c.assigned_to !== best) updates.push(api.updateChore(c.id, { assigned_to: best }))
    }
    const results = await Promise.all(updates)
    await reload()
    return { error: results.find((r) => r.error)?.error ?? null }
  }

  const value: HomeContextValue = {
    loading,
    rooms,
    chores,
    completions,
    statuses,
    history,
    roomById: (id) => rooms.find((r) => r.id === id),
    cheer,
    addRoom,
    updateRoom: (id, patch) => run(api.updateRoom(id, patch)),
    deleteRoom: (id) => run(api.deleteRoom(id)),
    addChore: (chore) =>
      householdId && user ? run(api.addChores(householdId, user.id, [chore])) : Promise.resolve({ error: 'Nessuna casa' }),
    updateChore: (id, patch) => run(api.updateChore(id, patch)),
    deleteChore: (id) => run(api.deleteChore(id)),
    completeChore,
    undoCompletion: (id) => run(api.undoCompletion(id)),
    distributeChores,
  }

  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
}

export function useHome() {
  const ctx = useContext(HomeContext)
  if (!ctx) throw new Error('useHome deve essere usato dentro HomeProvider')
  return ctx
}

