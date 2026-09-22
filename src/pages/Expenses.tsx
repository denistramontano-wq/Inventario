import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import type { InventoryMovement, Product } from '../lib/types'

interface MovementWithProduct extends InventoryMovement {
  product: Product
}

function startOfMonth(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() - offset, 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function Expenses() {
  const { currentHousehold } = useHousehold()
  const [movements, setMovements] = useState<MovementWithProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentHousehold) return
    const since = startOfMonth(2).toISOString()
    supabase
      .from('inventory_movements')
      .select('*, product:products(*)')
      .eq('household_id', currentHousehold.id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setMovements(data as unknown as MovementWithProduct[])
        setLoading(false)
      })
  }, [currentHousehold])

  const stats = useMemo(() => {
    const thisMonthStart = startOfMonth(0)
    const lastMonthStart = startOfMonth(1)

    const spentInRange = (from: Date, to: Date | null) =>
      movements
        .filter((m) => m.type === 'added' && m.price != null)
        .filter((m) => {
          const d = new Date(m.created_at)
          return d >= from && (!to || d < to)
        })
        .reduce((sum, m) => sum + Number(m.price), 0)

    const wastedInRange = (from: Date, to: Date | null) =>
      movements
        .filter((m) => m.type === 'wasted')
        .filter((m) => {
          const d = new Date(m.created_at)
          return d >= from && (!to || d < to)
        })

    const thisMonthSpent = spentInRange(thisMonthStart, null)
    const lastMonthSpent = spentInRange(lastMonthStart, thisMonthStart)
    const wastedItems = wastedInRange(lastMonthStart, null)

    const byCategory = new Map<string, number>()
    for (const m of movements) {
      if (m.type !== 'added' || m.price == null) continue
      const cat = m.product.category ?? 'Altro'
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(m.price))
    }
    const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    return { thisMonthSpent, lastMonthSpent, wastedCount: wastedItems.length, topCategories }
  }, [movements])

  if (!currentHousehold) return null
  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Caricamento...</p>

  const delta = stats.lastMonthSpent > 0 ? ((stats.thisMonthSpent - stats.lastMonthSpent) / stats.lastMonthSpent) * 100 : null

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Statistiche spesa</h1>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Questo mese</p>
          <p className="text-2xl font-semibold text-gray-900">€{stats.thisMonthSpent.toFixed(2)}</p>
          {delta !== null && (
            <p className={`text-xs ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}% vs mese scorso
            </p>
          )}
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Sprechi (60gg)</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.wastedCount}</p>
          <p className="text-xs text-gray-400">prodotti buttati</p>
        </div>
      </div>

      {stats.topCategories.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-900">Spesa per categoria (ultimi 2 mesi)</h2>
          <ul className="space-y-2">
            {stats.topCategories.map(([cat, amount]) => {
              const max = stats.topCategories[0][1]
              return (
                <li key={cat}>
                  <div className="mb-1 flex justify-between text-xs text-gray-600">
                    <span>{cat}</span>
                    <span>€{amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${(amount / max) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
