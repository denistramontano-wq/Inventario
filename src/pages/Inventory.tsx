import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import { LOCATION_LABELS, type InventoryItemWithProduct } from '../lib/types'

function daysUntil(dateStr: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateStr)
  return Math.round((date.getTime() - today.getTime()) / 86_400_000)
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null
  const days = daysUntil(expiryDate)
  if (days < 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Scaduto</span>
  if (days === 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Scade oggi</span>
  if (days <= 2) return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">Scade tra {days}g</span>
  if (days <= 7) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Scade tra {days}g</span>
  return null
}

export function Inventory() {
  const { currentHousehold } = useHousehold()
  const [items, setItems] = useState<InventoryItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState<string>('tutti')

  useEffect(() => {
    if (!currentHousehold) return
    let cancelled = false
    setLoading(true)

    supabase
      .from('inventory_items')
      .select('*, product:products(*)')
      .eq('household_id', currentHousehold.id)
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setItems(data as unknown as InventoryItemWithProduct[])
        setLoading(false)
      })

    const channel = supabase
      .channel(`inventory-${currentHousehold.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `household_id=eq.${currentHousehold.id}` },
        () => {
          supabase
            .from('inventory_items')
            .select('*, product:products(*)')
            .eq('household_id', currentHousehold.id)
            .order('expiry_date', { ascending: true, nullsFirst: false })
            .then(({ data }) => {
              if (data) setItems(data as unknown as InventoryItemWithProduct[])
            })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [currentHousehold])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.product.name.toLowerCase().includes(search.toLowerCase())
      const matchesLocation = locationFilter === 'tutti' || item.location === locationFilter
      return matchesSearch && matchesLocation
    })
  }, [items, search, locationFilter])

  const expiringSoon = items.filter((i) => i.expiry_date && daysUntil(i.expiry_date) <= 2)
  const lowStock = items.filter((i) => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold)

  if (!currentHousehold) return null

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">{currentHousehold.name}</h1>
        <Link
          to="/aggiungi"
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          + Aggiungi
        </Link>
      </div>

      {(expiringSoon.length > 0 || lowStock.length > 0) && (
        <div className="mb-4 space-y-2">
          {expiringSoon.length > 0 && (
            <div className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">
              ⏰ {expiringSoon.length} prodott{expiringSoon.length === 1 ? 'o' : 'i'} in scadenza
            </div>
          )}
          {lowStock.length > 0 && (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
              📉 {lowStock.length} prodott{lowStock.length === 1 ? 'o' : 'i'} in esaurimento
            </div>
          )}
        </div>
      )}

      <input
        placeholder="Cerca prodotto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {['tutti', 'dispensa', 'frigo', 'freezer', 'cantina', 'altro'].map((loc) => (
          <button
            key={loc}
            onClick={() => setLocationFilter(loc)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
              locationFilter === loc ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {loc === 'tutti' ? 'Tutti' : LOCATION_LABELS[loc]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Caricamento...</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          {items.length === 0 ? 'Nessun prodotto in inventario. Aggiungi il primo!' : 'Nessun risultato'}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link
                to={`/articolo/${item.id}`}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow"
              >
                {item.product.image_url ? (
                  <img src={item.product.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-xl">🥫</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{item.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} {item.unit} · {LOCATION_LABELS[item.location ?? 'altro']}
                  </p>
                </div>
                <ExpiryBadge expiryDate={item.expiry_date} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
