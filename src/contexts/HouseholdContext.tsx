import { createContext, useContext, useEffect, useState, type ReactNode, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import type { Household } from '../lib/types'

interface HouseholdContextValue {
  households: Household[]
  currentHousehold: Household | null
  loading: boolean
  setCurrentHouseholdId: (id: string) => void
  createHousehold: (name: string) => Promise<{ error: string | null }>
  joinHousehold: (code: string) => Promise<{ error: string | null }>
  createInviteCode: () => Promise<{ code: string | null; error: string | null }>
  updateDefaultCurrency: (currency: string) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

const STORAGE_KEY = 'inventario.currentHouseholdId'

// Alfabeto senza caratteri ambigui (0/O, 1/I/L)
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const INVITE_CODE_LENGTH = 10

function generateInviteCode() {
  const bytes = new Uint8Array(INVITE_CODE_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => INVITE_CODE_ALPHABET[b % INVITE_CODE_ALPHABET.length]).join('')
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [households, setHouseholds] = useState<Household[]>([])
  const [currentHouseholdId, setCurrentHouseholdIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  )
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setHouseholds([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setHouseholds(data)
      setCurrentHouseholdIdState((prev) => {
        if (prev && data.some((h) => h.id === prev)) return prev
        return data[0]?.id ?? null
      })
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  function setCurrentHouseholdId(id: string) {
    localStorage.setItem(STORAGE_KEY, id)
    setCurrentHouseholdIdState(id)
  }

  async function createHousehold(name: string) {
    const { data, error } = await supabase.rpc('create_household', { household_name: name })
    if (error) return { error: error.message }
    await refresh()
    if (data) setCurrentHouseholdId(data.id)
    return { error: null }
  }

  async function joinHousehold(code: string) {
    const { data, error } = await supabase.rpc('redeem_household_invite', { invite_code: code })
    if (error) return { error: error.message }
    await refresh()
    if (data) setCurrentHouseholdId(data)
    return { error: null }
  }

  async function createInviteCode() {
    if (!currentHouseholdId) return { code: null, error: 'Nessun nucleo familiare selezionato' }

    // Codice lungo e generato con un CSPRNG: un codice invito concede accesso
    // completo all'inventario, quindi deve essere impraticabile da indovinare
    // per tentativi (32^10 combinazioni, alfabeto senza caratteri ambigui).
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateInviteCode()
      const { error } = await supabase
        .from('household_invites')
        .insert({ household_id: currentHouseholdId, code })
      if (!error) return { code, error: null }
      // 23505 = unique_violation: collisione estremamente improbabile, riprova
      if (error.code !== '23505') return { code: null, error: error.message }
    }
    return { code: null, error: 'Impossibile generare un codice invito univoco, riprova' }
  }

  async function updateDefaultCurrency(currency: string) {
    if (!currentHouseholdId) return { error: 'Nessun nucleo familiare selezionato' }
    const { error } = await supabase
      .from('households')
      .update({ default_currency: currency })
      .eq('id', currentHouseholdId)
    if (error) return { error: error.message }
    await refresh()
    return { error: null }
  }

  const currentHousehold = households.find((h) => h.id === currentHouseholdId) ?? null

  return (
    <HouseholdContext.Provider
      value={{
        households,
        currentHousehold,
        loading,
        setCurrentHouseholdId,
        createHousehold,
        joinHousehold,
        createInviteCode,
        updateDefaultCurrency,
        refresh,
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
