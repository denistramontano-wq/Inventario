import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { LOCATIONS, LOCATION_LABELS, UNITS, type InventoryItemWithProduct } from '../lib/types'

export function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [item, setItem] = useState<InventoryItemWithProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('inventory_items')
      .select('*, product:products(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setItem(data as unknown as InventoryItemWithProduct)
        setLoading(false)
      })
  }, [id])

  async function updateField<K extends keyof InventoryItemWithProduct>(field: K, value: InventoryItemWithProduct[K]) {
    if (!item) return
    setItem({ ...item, [field]: value })
  }

  async function saveChanges() {
    if (!item) return
    setSaving(true)
    await supabase
      .from('inventory_items')
      .update({
        quantity: item.quantity,
        unit: item.unit,
        location: item.location,
        expiry_date: item.expiry_date,
        price: item.price,
        low_stock_threshold: item.low_stock_threshold,
      })
      .eq('id', item.id)
    setSaving(false)
  }

  async function logMovement(type: 'consumed' | 'wasted', quantity: number) {
    if (!item) return
    await supabase.from('inventory_movements').insert({
      household_id: item.household_id,
      product_id: item.product_id,
      type,
      quantity,
      unit: item.unit,
      created_by: user?.id ?? null,
    })
  }

  async function handleConsume(amount: number) {
    if (!item) return
    const newQty = Math.max(0, item.quantity - amount)
    await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', item.id)
    await logMovement('consumed', Math.min(amount, item.quantity))
    setItem({ ...item, quantity: newQty })
  }

  async function handleWaste() {
    if (!item) return
    await logMovement('wasted', item.quantity)
    await supabase.from('inventory_items').delete().eq('id', item.id)
    navigate('/')
  }

  async function handleDelete() {
    if (!item) return
    await supabase.from('inventory_items').delete().eq('id', item.id)
    navigate('/')
  }

  if (loading) return <p className="py-10 text-center text-sm text-gray-400">Caricamento...</p>
  if (!item) return <p className="py-10 text-center text-sm text-gray-400">Prodotto non trovato</p>

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500">
        ← Indietro
      </button>

      <div className="mb-4 flex items-center gap-3">
        {item.product.image_url ? (
          <img src={item.product.image_url} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">🥫</div>
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{item.product.name}</h1>
          {item.product.brand && <p className="text-sm text-gray-500">{item.product.brand}</p>}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-center gap-4 rounded-xl bg-white p-4 shadow-sm">
        <button
          onClick={() => handleConsume(1)}
          className="h-10 w-10 rounded-full bg-gray-100 text-lg font-medium text-gray-700 hover:bg-gray-200"
        >
          −
        </button>
        <span className="w-20 text-center text-xl font-semibold text-gray-900">
          {item.quantity} {item.unit}
        </span>
        <button
          onClick={async () => {
            const newQty = item.quantity + 1
            await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', item.id)
            setItem({ ...item, quantity: newQty })
          }}
          className="h-10 w-10 rounded-full bg-gray-100 text-lg font-medium text-gray-700 hover:bg-gray-200"
        >
          +
        </button>
      </div>

      <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Unità</label>
            <select
              value={item.unit}
              onChange={(e) => updateField('unit', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Posizione</label>
            <select
              value={item.location ?? 'altro'}
              onChange={(e) => updateField('location', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Scadenza</label>
            <input
              type="date"
              value={item.expiry_date ?? ''}
              onChange={(e) => updateField('expiry_date', e.target.value || null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Prezzo (€)</label>
            <input
              type="number"
              step="0.01"
              value={item.price ?? ''}
              onChange={(e) => updateField('price', e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Soglia scorta minima</label>
          <input
            type="number"
            step="any"
            value={item.low_stock_threshold ?? ''}
            onChange={(e) => updateField('low_stock_threshold', e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={saveChanges}
          disabled={saving}
          className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleWaste}
          className="flex-1 rounded-lg bg-orange-50 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
        >
          🗑️ Segna come sprecato
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Elimina
        </button>
      </div>
    </div>
  )
}
