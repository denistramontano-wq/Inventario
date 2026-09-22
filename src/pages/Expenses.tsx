import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import { formatMoney } from '../lib/currency'
import type { InventoryMovement, Product } from '../lib/types'

interface MovementWithProduct extends InventoryMovement {
  product: Product
}

type CurrencyAmounts = Record<string, number>

function addAmount(map: CurrencyAmounts, currency: string, amount: number) {
  map[currency] = (map[currency] ?? 0) + amount
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
    const lookback = startOfMonth(2)
    const resetAt = currentHousehold.stats_reset_at ? new Date(currentHousehold.stats_reset_at) : null
    const since = (resetAt && resetAt > lookback ? resetAt : lookback).toISOString()
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

    // Valute diverse non si possono sommare: ogni totale è tenuto separato
    // per valuta, invece di mischiare € e $ in un unico numero sbagliato.
    const spentInRange = (from: Date, to: Date | null): CurrencyAmounts => {
      const result: CurrencyAmounts = {}
      movements
        .filter((m) => m.type === 'added' && m.price != null)
        .filter((m) => {
          const d = new Date(m.created_at)
          return d >= from && (!to || d < to)
        })
        .forEach((m) => addAmount(result, m.currency, Number(m.price)))
      return result
    }

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

    const byCategory = new Map<string, CurrencyAmounts>()
    for (const m of movements) {
      if (m.type !== 'added' || m.price == null) continue
      const cat = m.product.category ?? 'Altro'
      const existing = byCategory.get(cat) ?? {}
      addAmount(existing, m.currency, Number(m.price))
      byCategory.set(cat, existing)
    }
    const categoryRows = [...byCategory.entries()]
      .flatMap(([cat, amounts]) => Object.entries(amounts).map(([currency, amount]) => ({ cat, currency, amount })))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    return { thisMonthSpent, lastMonthSpent, wastedCount: wastedItems.length, categoryRows }
  }, [movements])

  if (!currentHousehold) return null
  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Caricamento...</p>

  const thisMonthEntries = Object.entries(stats.thisMonthSpent)
  const maxCategoryAmount = Math.max(...stats.categoryRows.map((r) => r.amount), 1)

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <h1 className="mb-1 text-xl font-semibold text-gray-900">Statistiche spesa</h1>
      {currentHousehold.stats_reset_at && (
        <p className="mb-4 text-xs text-gray-400">
          Conteggi azzerati il{' '}
          {new Date(currentHousehold.stats_reset_at).toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}
      {!currentHousehold.stats_reset_at && <div className="mb-4" />}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Questo mese</p>
          {thisMonthEntries.length === 0 ? (
            <p className="text-2xl font-semibold text-gray-900">{formatMoney(0, currentHousehold.default_currency)}</p>
          ) : (
            thisMonthEntries.map(([currency, amount]) => {
              const last = stats.lastMonthSpent[currency]
              const delta = last && last > 0 ? ((amount - last) / last) * 100 : null
              return (
                <div key={currency} className="mb-1 last:mb-0">
                  <p className="text-2xl font-semibold text-gray-900">{formatMoney(amount, currency)}</p>
                  {delta !== null && (
                    <p className={`text-xs ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}% vs mese scorso
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Sprechi (60gg)</p>
          <p className="text-2xl font-semibold text-gray-900">{stats.wastedCount}</p>
          <p className="text-xs text-gray-400">prodotti buttati</p>
        </div>
      </div>

      {stats.categoryRows.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-medium text-gray-900">Spesa per categoria (ultimi 2 mesi)</h2>
          <ul className="space-y-2">
            {stats.categoryRows.map(({ cat, currency, amount }) => (
              <li key={`${cat}-${currency}`}>
                <div className="mb-1 flex justify-between text-xs text-gray-600">
                  <span>{cat}</span>
                  <span>{formatMoney(amount, currency)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
