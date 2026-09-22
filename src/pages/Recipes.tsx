import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import type { Recipe, RecipeIngredient } from '../lib/types'

interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: RecipeIngredient[]
}

interface RecipeMatch {
  recipe: RecipeWithIngredients
  have: string[]
  missing: string[]
  score: number
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function Recipes() {
  const { currentHousehold } = useHousehold()
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [pantryNames, setPantryNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [onlyReady, setOnlyReady] = useState(false)

  useEffect(() => {
    if (!currentHousehold) return
    setLoading(true)

    Promise.all([
      supabase.from('recipes').select('*, recipe_ingredients(*)'),
      supabase.from('inventory_items').select('product:products(name)').eq('household_id', currentHousehold.id).gt('quantity', 0),
    ]).then(([recipesRes, inventoryRes]) => {
      if (recipesRes.data) setRecipes(recipesRes.data as unknown as RecipeWithIngredients[])
      if (inventoryRes.data) {
        const names = (inventoryRes.data as unknown as { product: { name: string } }[]).map((i) =>
          normalize(i.product.name),
        )
        setPantryNames(names)
      }
      setLoading(false)
    })
  }, [currentHousehold])

  const matches = useMemo<RecipeMatch[]>(() => {
    return recipes
      .map((recipe) => {
        const have: string[] = []
        const missing: string[] = []
        for (const ing of recipe.recipe_ingredients) {
          const normalized = normalize(ing.name)
          const inPantry = pantryNames.some((p) => p.includes(normalized) || normalized.includes(p))
          if (inPantry) have.push(ing.name)
          else missing.push(ing.name)
        }
        const total = recipe.recipe_ingredients.length || 1
        return { recipe, have, missing, score: have.length / total }
      })
      .sort((a, b) => b.score - a.score)
  }, [recipes, pantryNames])

  const visibleMatches = onlyReady ? matches.filter((m) => m.missing.length === 0) : matches

  if (!currentHousehold) return null

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Ricette</h1>
      <p className="mb-4 text-sm text-gray-500">In base a quello che hai in casa</p>

      <label className="mb-4 flex items-center gap-2 text-sm text-gray-600">
        <input type="checkbox" checked={onlyReady} onChange={(e) => setOnlyReady(e.target.checked)} className="rounded border-gray-300" />
        Mostra solo ricette pronte da fare
      </label>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Caricamento...</p>
      ) : visibleMatches.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Nessuna ricetta trovata</p>
      ) : (
        <ul className="space-y-3">
          {visibleMatches.map(({ recipe, have, missing, score }) => (
            <li key={recipe.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="font-medium text-gray-900">{recipe.name}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    missing.length === 0
                      ? 'bg-green-100 text-green-700'
                      : score >= 0.5
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {missing.length === 0 ? 'Pronta!' : `${have.length}/${recipe.recipe_ingredients.length}`}
                </span>
              </div>
              {recipe.description && <p className="mb-2 text-sm text-gray-500">{recipe.description}</p>}
              {recipe.prep_minutes && <p className="mb-2 text-xs text-gray-400">⏱ {recipe.prep_minutes} min</p>}
              {missing.length > 0 && (
                <p className="text-xs text-orange-600">Manca: {missing.join(', ')}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
