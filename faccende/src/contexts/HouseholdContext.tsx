import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/supabase'
import type { Household, Member, Profile } from '../lib/types'
import { useAuth } from './AuthContext'

interface HouseholdContextValue {
  households: Household[]
  currentHousehold: Household | null
  members: Member[]
  profile: Profile | null
  loading: boolean
  isOwner: boolean
  setCurrentHouseholdId: (id: string) => void
  createHousehold: (name: string) => Promise<{ error: string | null }>
  joinHousehold: (code: string) => Promise<{ error: string | null }>
  createInvite: () => Promise<{ code: string | null; error: string | null }>
  renameHousehold: (name: string) => Promise<{ error: string | null }>
  leaveHousehold: () => Promise<{ error: string | null }>
  saveProfile: (patch: Partial<Omit<Profile, 'id'>>) => Promise<{ error: string | null }>
  memberById: (id: string | null) => Member | undefined
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

const STORAGE_KEY = 'faccende.currentHouseholdId'

function readStoredId() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function defaultName(email: string | null) {
  if (!email) return 'Io'
  const base = email.split('@')[0].split(/[._-]/)[0]
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [households, setHouseholds] = useState<Household[]>([])
  const [currentId, setCurrentId] = useState<string | null>(readStoredId)
  const [members, setMembers] = useState<Member[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) return
    const [list, prof] = await Promise.all([api.listHouseholds(), api.getProfile(user.id)])
    setHouseholds(list)
    setCurrentId((prev) => (prev && list.some((h) => h.id === prev) ? prev : (list[0]?.id ?? null)))
    if (prof) {
      setProfile(prof)
    } else {
      // Primo accesso a questa app: crea il profilo visibile ai coinquilini
      const fresh: Profile = { id: user.id, display_name: defaultName(user.email), avatar: '🙂', color: '#3b9ee6' }
      await api.saveProfile(fresh)
      setProfile(fresh)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loadMembers = useCallback(async () => {
    if (!currentId) {
      setMembers([])
      return
    }
    setMembers(await api.listMembers(currentId))
  }, [currentId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers, profile])

  function setCurrentHouseholdId(id: string) {
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // preferenza non salvata: pazienza
    }
    setCurrentId(id)
  }

  async function createHousehold(name: string) {
    const { data, error } = await api.createHousehold(name)
    if (error) return { error }
    await refresh()
    if (data) setCurrentHouseholdId(data.id)
    return { error: null }
  }

  async function joinHousehold(code: string) {
    const { data, error } = await api.joinHousehold(code)
    if (error) return { error }
    await refresh()
    if (data) setCurrentHouseholdId(data)
    return { error: null }
  }

  async function createInvite() {
    if (!currentId) return { code: null, error: 'Nessuna casa selezionata' }
    const { data, error } = await api.createInvite(currentId)
    return { code: data, error }
  }

  async function renameHousehold(name: string) {
    if (!currentId) return { error: 'Nessuna casa selezionata' }
    const { error } = await api.renameHousehold(currentId, name)
    if (!error) await refresh()
    return { error }
  }

  async function leaveHousehold() {
    if (!currentId || !user) return { error: 'Nessuna casa selezionata' }
    const { error } = await api.leaveHousehold(currentId, user.id)
    if (!error) await refresh()
    return { error }
  }

  async function saveProfile(patch: Partial<Omit<Profile, 'id'>>) {
    if (!user || !profile) return { error: 'Profilo non caricato' }
    const next = { ...profile, ...patch }
    const { error } = await api.saveProfile(next)
    if (!error) setProfile(next)
    return { error }
  }

  const currentHousehold = households.find((h) => h.id === currentId) ?? null
  const isOwner = members.some((m) => m.user_id === user?.id && m.role === 'owner')

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        members,
        profile,
        loading,
        isOwner,
        setCurrentHouseholdId,
        createHousehold,
        joinHousehold,
        createInvite,
        renameHousehold,
        leaveHousehold,
        saveProfile,
        memberById: (id) => (id ? members.find((m) => m.user_id === id) : undefined),
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold deve essere usato dentro HouseholdProvider')
  return ctx
}
