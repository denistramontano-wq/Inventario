import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { api } from '../lib/supabase'

export function Onboarding() {
  const { createHousehold, joinHousehold } = useHousehold()
  const { signOut } = useAuth()
  const cloud = api.mode === 'cloud'
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('Casa mia')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const result = mode === 'create' ? await createHousehold(name.trim()) : await joinHousehold(code.trim().toUpperCase())
    if (result.error) setError(result.error)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="text-center text-6xl">🏡</p>
        <h1 className="mt-3 text-center text-3xl font-black">La tua casa</h1>
        <p className="mt-1 mb-6 text-center text-sub">
          {cloud ? 'Crea la tua casa o unisciti a quella di chi vive con te.' : 'Dai un nome alla tua casa per iniziare.'}
        </p>

        {cloud && (
          <div className="mb-4 grid grid-cols-2 rounded-full bg-card p-1.5">
            {(
              [
                ['create', 'Crea'],
                ['join', 'Ho un codice'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`rounded-full py-2.5 font-extrabold ${mode === id ? 'bg-accent text-white' : 'text-sub'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 rounded-[2rem] bg-card p-5">
          {mode === 'create' ? (
            <input required className="field text-lg font-bold" placeholder="Nome della casa" value={name} onChange={(e) => setName(e.target.value)} />
          ) : (
            <input
              required
              className="field font-mono text-lg tracking-widest uppercase"
              placeholder="CODICE INVITO"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          )}
          {error && <p className="text-sm font-bold text-bad">{error}</p>}
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Attendere…' : mode === 'create' ? 'Iniziamo!' : 'Unisciti'}
          </button>
        </form>
        {cloud && (
          <button onClick={signOut} className="mt-4 w-full text-center text-sm font-bold text-muted">
            Esci
          </button>
        )}
      </div>
    </div>
  )
}
