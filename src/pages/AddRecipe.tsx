import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface IngredientRow {
  id: string
  name: string
  quantity: string
  unit: string
}

function emptyRow(): IngredientRow {
  return { id: crypto.randomUUID(), name: '', quantity: '', unit: '' }
}

export function AddRecipe() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prepMinutes, setPrepMinutes] = useState('')
  const [instructions, setInstructions] = useState('')
  const [ingredients, setIngredients] = useState<IngredientRow[]>([emptyRow(), emptyRow(), emptyRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateIngredient(id: string, patch: Partial<IngredientRow>) {
    setIngredients((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((row) => row.id !== id))
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, emptyRow()])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const validIngredients = ingredients.filter((row) => row.name.trim())
    if (validIngredients.length === 0) {
      setError('Aggiungi almeno un ingrediente')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          prep_minutes: prepMinutes ? Number(prepMinutes) : null,
          instructions: instructions.trim() || null,
          created_by: user?.id ?? null,
        })
        .select('id')
        .single()
      if (recipeError) throw recipeError

      const { error: ingredientsError } = await supabase.from('recipe_ingredients').insert(
        validIngredients.map((row) => ({
          recipe_id: recipe.id,
          name: row.name.trim(),
          quantity: row.quantity ? Number(row.quantity) : null,
          unit: row.unit.trim() || null,
        })),
      )
      if (ingredientsError) throw ingredientsError

      navigate('/ricette')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500">
        ← Indietro
      </button>

      <h1 className="mb-4 text-xl font-semibold text-gray-900">Nuova ricetta</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nome ricetta</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Descrizione (opzionale)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Es. Piatto veloce per una cena in settimana"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Tempo di preparazione (minuti)</label>
          <input
            type="number"
            min="0"
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-600">Ingredienti</label>
          </div>
          <div className="space-y-2">
            {ingredients.map((row) => (
              <div key={row.id} className="flex gap-2">
                <input
                  value={row.name}
                  onChange={(e) => updateIngredient(row.id, { name: e.target.value })}
                  placeholder="Nome ingrediente"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                />
                <input
                  value={row.quantity}
                  onChange={(e) => updateIngredient(row.id, { quantity: e.target.value })}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Qt."
                  className="w-16 shrink-0 rounded-lg border border-gray-300 px-1 py-1.5 text-center text-sm focus:border-green-500 focus:outline-none"
                />
                <input
                  value={row.unit}
                  onChange={(e) => updateIngredient(row.id, { unit: e.target.value })}
                  placeholder="g, pz..."
                  className="w-20 shrink-0 rounded-lg border border-gray-300 px-1 py-1.5 text-sm focus:border-green-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(row.id)}
                  className="shrink-0 text-gray-300 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredientRow}
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            + Aggiungi ingrediente
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Istruzioni</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={6}
            placeholder="Scrivi i passaggi separati da un punto. Es: Cuoci la pasta. Scalda il sugo. Manteca e servi."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            Separa i passaggi con un punto: li mostro come lista numerata nella scheda della ricetta.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva ricetta'}
        </button>
      </form>
    </div>
  )
}
