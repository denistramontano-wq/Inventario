import { useState, type FormEvent } from 'react'
import { useHousehold } from '../contexts/HouseholdContext'
import { useAuth } from '../contexts/AuthContext'

export function Onboarding() {
  const { createHousehold, joinHousehold } = useHousehold()
  const { signOut } = useAuth()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
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
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">👨‍👩‍👧</div>
          <h1 className="text-xl font-semibold text-gray-900">Nucleo familiare</h1>
          <p className="mt-1 text-sm text-gray-500">Crea un nuovo inventario o unisciti a uno esistente</p>
        </div>

        <div className="mb-4 flex rounded-lg bg-gray-100 p-1 text-sm">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 rounded-md py-1.5 font-medium ${mode === 'create' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
          >
            Crea
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 rounded-md py-1.5 font-medium ${mode === 'join' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
          >
            Unisciti
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'create' ? (
            <input
              required
              placeholder="Nome del nucleo (es. Casa Rossi)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          ) : (
            <input
              required
              placeholder="Codice invito"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase tracking-widest focus:border-green-500 focus:outline-none"
            />
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Attendere...' : mode === 'create' ? 'Crea nucleo' : 'Unisciti'}
          </button>
        </form>

        <button onClick={signOut} className="mt-4 w-full text-center text-sm text-gray-400 hover:underline">
          Esci
        </button>
      </div>
    </div>
  )
}
