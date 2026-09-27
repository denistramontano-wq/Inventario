import { createClient } from '@supabase/supabase-js'
import { createCloudApi, createLocalApi } from './api'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = backend non configurato: l'app gira in modalità locale */
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const api = supabase ? createCloudApi(supabase) : createLocalApi()
