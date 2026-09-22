import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from './HouseholdContext'

export interface CatalogItem {
  id: string
  name: string
}

interface CatalogContextValue {
  locations: CatalogItem[]
  categories: CatalogItem[]
  loading: boolean
  addLocation: (name: string) => Promise<{ error: string | null }>
  removeLocation: (id: string) => Promise<{ error: string | null }>
  addCategory: (name: string) => Promise<{ error: string | null }>
  removeCategory: (id: string) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { currentHousehold } = useHousehold()
  const [locations, setLocations] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!currentHousehold) {
      setLocations([])
      setCategories([])
      setLoading(false)
      return
    }
    setLoading(true)
    const [locRes, catRes] = await Promise.all([
      supabase
        .from('household_locations')
        .select('id, name')
        .eq('household_id', currentHousehold.id)
        .order('sort_order'),
      supabase
        .from('household_categories')
        .select('id, name')
        .eq('household_id', currentHousehold.id)
        .order('sort_order'),
    ])
    setLocations(locRes.data ?? [])
    setCategories(catRes.data ?? [])
    setLoading(false)
  }, [currentHousehold])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function addLocation(name: string) {
    if (!currentHousehold) return { error: 'Nessun nucleo familiare selezionato' }
    const trimmed = name.trim()
    if (!trimmed) return { error: 'Nome non valido' }
    const { error } = await supabase
      .from('household_locations')
      .insert({ household_id: currentHousehold.id, name: trimmed, sort_order: locations.length })
    if (error) return { error: error.code === '23505' ? 'Esiste già una posizione con questo nome' : error.message }
    await refresh()
    return { error: null }
  }

  async function removeLocation(id: string) {
    const { error } = await supabase.from('household_locations').delete().eq('id', id)
    if (error) return { error: error.message }
    await refresh()
    return { error: null }
  }

  async function addCategory(name: string) {
    if (!currentHousehold) return { error: 'Nessun nucleo familiare selezionato' }
    const trimmed = name.trim()
    if (!trimmed) return { error: 'Nome non valido' }
    const { error } = await supabase
      .from('household_categories')
      .insert({ household_id: currentHousehold.id, name: trimmed, sort_order: categories.length })
    if (error) return { error: error.code === '23505' ? 'Esiste già una categoria con questo nome' : error.message }
    await refresh()
    return { error: null }
  }

  async function removeCategory(id: string) {
    const { error } = await supabase.from('household_categories').delete().eq('id', id)
    if (error) return { error: error.message }
    await refresh()
    return { error: null }
  }

  return (
    <CatalogContext.Provider
      value={{ locations, categories, loading, addLocation, removeLocation, addCategory, removeCategory, refresh }}
    >
      {children}
    </CatalogContext.Provider>
  )
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog deve essere usato dentro CatalogProvider')
  return ctx
}
