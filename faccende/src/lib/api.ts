import type { SupabaseClient } from '@supabase/supabase-js'
import type { Chore, Completion, Household, Member, NewChore, Profile, Room } from './types'

export interface HomeSnapshot {
  rooms: Room[]
  chores: Chore[]
  completions: Completion[]
}

type Result<T = null> = { data: T | null; error: string | null }

export interface Api {
  mode: 'cloud' | 'local'
  listHouseholds(): Promise<Household[]>
  createHousehold(name: string): Promise<Result<Household>>
  joinHousehold(code: string): Promise<Result<string>>
  createInvite(householdId: string): Promise<Result<string>>
  renameHousehold(householdId: string, name: string): Promise<Result>
  leaveHousehold(householdId: string, userId: string): Promise<Result>
  listMembers(householdId: string): Promise<Member[]>
  getProfile(userId: string): Promise<Profile | null>
  saveProfile(profile: Profile): Promise<Result>
  loadHome(householdId: string, since: string): Promise<HomeSnapshot>
  addRoom(householdId: string, name: string, roomType: string): Promise<Result<Room>>
  updateRoom(id: string, patch: Partial<Pick<Room, 'name' | 'room_type'>>): Promise<Result>
  deleteRoom(id: string): Promise<Result>
  addChores(householdId: string, userId: string, chores: NewChore[]): Promise<Result>
  updateChore(id: string, patch: Partial<NewChore>): Promise<Result>
  deleteChore(id: string): Promise<Result>
  complete(householdId: string, choreId: string, userId: string, points: number, at?: string): Promise<Result>
  undoCompletion(id: string): Promise<Result>
  subscribe(householdId: string, onChange: () => void): () => void
}

// ------------------------------------------------------------------
// Invite code
// ------------------------------------------------------------------

// Alfabeto senza caratteri ambigui (0/O, 1/I/L)
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateInviteCode() {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => INVITE_CODE_ALPHABET[b % INVITE_CODE_ALPHABET.length]).join('')
}

// ------------------------------------------------------------------
// Supabase
// ------------------------------------------------------------------

export function createCloudApi(supabase: SupabaseClient): Api {
  const err = (e: { message: string } | null) => e?.message ?? null

  return {
    mode: 'cloud',

    async listHouseholds() {
      const { data } = await supabase.from('households').select('*').order('created_at', { ascending: true })
      return (data ?? []) as Household[]
    },

    async createHousehold(name) {
      const { data, error } = await supabase.rpc('create_household', { household_name: name })
      return { data: data as Household | null, error: err(error) }
    },

    async joinHousehold(code) {
      const { data, error } = await supabase.rpc('redeem_household_invite', { invite_code: code })
      return { data: data as string | null, error: err(error) }
    },

    async createInvite(householdId) {
      // Il codice concede accesso completo alla casa: lungo e da CSPRNG
      for (let attempt = 0; attempt < 3; attempt++) {
        const code = generateInviteCode()
        const { error } = await supabase.from('household_invites').insert({ household_id: householdId, code })
        if (!error) return { data: code, error: null }
        if (error.code !== '23505') return { data: null, error: error.message }
      }
      return { data: null, error: 'Impossibile generare un codice invito, riprova' }
    },

    async renameHousehold(householdId, name) {
      const { error } = await supabase.from('households').update({ name }).eq('id', householdId)
      return { data: null, error: err(error) }
    },

    async leaveHousehold(householdId, userId) {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', userId)
      return { data: null, error: err(error) }
    },

    async listMembers(householdId) {
      const { data: rows } = await supabase
        .from('household_members')
        .select('user_id, role')
        .eq('household_id', householdId)
        .order('joined_at', { ascending: true })
      const members = (rows ?? []) as { user_id: string; role: 'owner' | 'member' }[]
      if (members.length === 0) return []
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', members.map((m) => m.user_id))
      const byId = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]))
      return members.map((m, i) => {
        const p = byId.get(m.user_id)
        return {
          user_id: m.user_id,
          role: m.role,
          display_name: p?.display_name || `Membro ${i + 1}`,
          avatar: p?.avatar ?? '🙂',
          color: p?.color ?? '#3b9ee6',
        }
      })
    },

    async getProfile(userId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      return (data as Profile | null) ?? null
    },

    async saveProfile(profile) {
      const { error } = await supabase.from('profiles').upsert(profile)
      return { data: null, error: err(error) }
    },

    async loadHome(householdId, since) {
      const [rooms, chores, completions] = await Promise.all([
        supabase.from('rooms').select('*').eq('household_id', householdId).order('sort_order').order('created_at'),
        supabase.from('chores').select('*').eq('household_id', householdId).order('created_at'),
        supabase
          .from('chore_completions')
          .select('*')
          .eq('household_id', householdId)
          .gte('completed_at', since)
          .order('completed_at', { ascending: false })
          .limit(5000),
      ])
      return {
        rooms: (rooms.data ?? []) as Room[],
        chores: (chores.data ?? []) as Chore[],
        completions: (completions.data ?? []) as Completion[],
      }
    },

    async addRoom(householdId, name, roomType) {
      const { data, error } = await supabase
        .from('rooms')
        .insert({ household_id: householdId, name, room_type: roomType })
        .select()
        .single()
      return { data: data as Room | null, error: err(error) }
    },

    async updateRoom(id, patch) {
      const { error } = await supabase.from('rooms').update(patch).eq('id', id)
      return { data: null, error: err(error) }
    },

    async deleteRoom(id) {
      const { error } = await supabase.from('rooms').delete().eq('id', id)
      return { data: null, error: err(error) }
    },

    async addChores(householdId, userId, chores) {
      if (chores.length === 0) return { data: null, error: null }
      const { error } = await supabase
        .from('chores')
        .insert(chores.map((c) => ({ ...c, household_id: householdId, created_by: userId })))
      return { data: null, error: err(error) }
    },

    async updateChore(id, patch) {
      const { error } = await supabase.from('chores').update(patch).eq('id', id)
      return { data: null, error: err(error) }
    },

    async deleteChore(id) {
      const { error } = await supabase.from('chores').delete().eq('id', id)
      return { data: null, error: err(error) }
    },

    async complete(householdId, choreId, userId, points, at) {
      const { error } = await supabase.from('chore_completions').insert({
        household_id: householdId,
        chore_id: choreId,
        completed_by: userId,
        points,
        ...(at ? { completed_at: at } : {}),
      })
      return { data: null, error: err(error) }
    },

    async undoCompletion(id) {
      const { error } = await supabase.from('chore_completions').delete().eq('id', id)
      return { data: null, error: err(error) }
    },

    subscribe(householdId, onChange) {
      const filter = `household_id=eq.${householdId}`
      const channel = supabase
        .channel(`home-${householdId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chores', filter }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_completions', filter }, onChange)
        .subscribe()
      return () => {
        supabase.removeChannel(channel)
      }
    },
  }
}

// ------------------------------------------------------------------
// Modalità locale (nessun backend configurato): dati nel browser,
// una sola persona, niente condivisione.
// ------------------------------------------------------------------

export const LOCAL_USER_ID = 'local-user'
const LOCAL_KEY = 'faccende.local.v1'

interface LocalDb {
  households: Household[]
  profile: Profile | null
  rooms: Room[]
  chores: Chore[]
  completions: Completion[]
}

function readLocal(): LocalDb {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw) as LocalDb
  } catch {
    // dati corrotti o storage non disponibile: si riparte da zero
  }
  return { households: [], profile: null, rooms: [], chores: [], completions: [] }
}

function writeLocal(db: LocalDb) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db))
  } catch {
    // storage pieno o bloccato: i dati restano solo in memoria
  }
}

export function createLocalApi(): Api {
  let db = readLocal()
  const listeners = new Set<() => void>()
  const ok = { data: null, error: null }
  const now = () => new Date().toISOString()

  function commit(mutate: (d: LocalDb) => void) {
    mutate(db)
    writeLocal(db)
    db = readLocal()
  }

  return {
    mode: 'local',

    async listHouseholds() {
      return db.households
    },

    async createHousehold(name) {
      const h: Household = { id: crypto.randomUUID(), name, created_by: LOCAL_USER_ID, created_at: now() }
      commit((d) => d.households.push(h))
      return { data: h, error: null }
    },

    async joinHousehold() {
      return { data: null, error: 'Per unirti a una casa condivisa serve la versione online dell\'app' }
    },

    async createInvite() {
      return { data: null, error: 'La condivisione richiede la versione online (Supabase configurato)' }
    },

    async renameHousehold(householdId, name) {
      commit((d) => {
        const h = d.households.find((x) => x.id === householdId)
        if (h) h.name = name
      })
      return ok
    },

    async leaveHousehold(householdId) {
      commit((d) => {
        d.households = d.households.filter((h) => h.id !== householdId)
        d.rooms = d.rooms.filter((r) => r.household_id !== householdId)
        d.chores = d.chores.filter((c) => c.household_id !== householdId)
        d.completions = d.completions.filter((c) => c.household_id !== householdId)
      })
      return ok
    },

    async listMembers() {
      const p = db.profile
      return [
        {
          user_id: LOCAL_USER_ID,
          role: 'owner' as const,
          display_name: p?.display_name || 'Io',
          avatar: p?.avatar ?? '🙂',
          color: p?.color ?? '#3b9ee6',
        },
      ]
    },

    async getProfile() {
      return db.profile
    },

    async saveProfile(profile) {
      commit((d) => (d.profile = profile))
      return ok
    },

    async loadHome(householdId, since) {
      return {
        rooms: db.rooms.filter((r) => r.household_id === householdId),
        chores: db.chores.filter((c) => c.household_id === householdId),
        completions: db.completions.filter((c) => c.household_id === householdId && c.completed_at >= since),
      }
    },

    async addRoom(householdId, name, roomType) {
      const room: Room = {
        id: crypto.randomUUID(),
        household_id: householdId,
        name,
        room_type: roomType,
        sort_order: 0,
        created_at: now(),
      }
      commit((d) => d.rooms.push(room))
      return { data: room, error: null }
    },

    async updateRoom(id, patch) {
      commit((d) => {
        const r = d.rooms.find((x) => x.id === id)
        if (r) Object.assign(r, patch)
      })
      return ok
    },

    async deleteRoom(id) {
      commit((d) => {
        const choreIds = new Set(d.chores.filter((c) => c.room_id === id).map((c) => c.id))
        d.rooms = d.rooms.filter((r) => r.id !== id)
        d.chores = d.chores.filter((c) => c.room_id !== id)
        d.completions = d.completions.filter((c) => !choreIds.has(c.chore_id))
      })
      return ok
    },

    async addChores(householdId, _userId, chores) {
      commit((d) => {
        for (const c of chores) d.chores.push({ ...c, id: crypto.randomUUID(), household_id: householdId, created_at: now() })
      })
      return ok
    },

    async updateChore(id, patch) {
      commit((d) => {
        const c = d.chores.find((x) => x.id === id)
        if (c) Object.assign(c, patch)
      })
      return ok
    },

    async deleteChore(id) {
      commit((d) => {
        d.chores = d.chores.filter((c) => c.id !== id)
        d.completions = d.completions.filter((c) => c.chore_id !== id)
      })
      return ok
    },

    async complete(householdId, choreId, userId, points, at) {
      commit((d) =>
        d.completions.push({
          id: crypto.randomUUID(),
          household_id: householdId,
          chore_id: choreId,
          completed_by: userId,
          completed_at: at ?? now(),
          points,
        }),
      )
      return ok
    },

    async undoCompletion(id) {
      commit((d) => (d.completions = d.completions.filter((c) => c.id !== id)))
      return ok
    },

    subscribe(_householdId, onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  }
}
