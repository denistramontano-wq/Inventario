import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'

export function Settings() {
  const { user, signOut } = useAuth()
  const { currentHousehold, households, setCurrentHouseholdId, createInviteCode } = useHousehold()
  const [invite, setInvite] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleInvite() {
    setError(null)
    const result = await createInviteCode()
    if (result.error) setError(result.error)
    else setInvite(result.code)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Impostazioni</h1>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="text-xs text-gray-500">Account</p>
        <p className="text-sm font-medium text-gray-900">{user?.email}</p>
      </div>

      {households.length > 1 && (
        <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs text-gray-500">Nucleo familiare attivo</p>
          <select
            value={currentHousehold?.id ?? ''}
            onChange={(e) => setCurrentHouseholdId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-500">Invita qualcuno nel nucleo "{currentHousehold?.name}"</p>
        <button
          onClick={handleInvite}
          className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Genera codice invito
        </button>
        {invite && (
          <p className="mt-3 rounded-lg bg-gray-100 py-2 text-center font-mono text-lg tracking-widest text-gray-900">
            {invite}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <button onClick={signOut} className="w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
        Esci
      </button>
    </div>
  )
}
