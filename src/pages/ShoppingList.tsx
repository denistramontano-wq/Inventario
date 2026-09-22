import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import type { InventoryItemWithProduct, ShoppingListItemWithProduct } from '../lib/types'

export function ShoppingList() {
  const { currentHousehold } = useHousehold()
  const [items, setItems] = useState<ShoppingListItemWithProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [lowStockCount, setLowStockCount] = useState(0)

  async function loadList() {
    if (!currentHousehold) return
    const { data } = await supabase
      .from('shopping_list_items')
      .select('*, product:products(*)')
      .eq('household_id', currentHousehold.id)
      .order('is_checked', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setItems(data as unknown as ShoppingListItemWithProduct[])
    setLoading(false)
  }

  async function checkLowStock() {
    if (!currentHousehold) return
    const { data } = await supabase
      .from('inventory_items')
      .select('*, product:products(*)')
      .eq('household_id', currentHousehold.id)
    const low = ((data ?? []) as unknown as InventoryItemWithProduct[]).filter(
      (i) => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold,
    )
    setLowStockCount(low.length)
  }

  useEffect(() => {
    loadList()
    checkLowStock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHousehold])

  async function handleAddManual(e: FormEvent) {
    e.preventDefault()
    if (!currentHousehold || !newItemName.trim()) return
    await supabase.from('shopping_list_items').insert({
      household_id: currentHousehold.id,
      custom_name: newItemName.trim(),
      quantity: 1,
      unit: 'pz',
    })
    setNewItemName('')
    loadList()
  }

  async function handleAddLowStock() {
    if (!currentHousehold) return
    const { data: inventory } = await supabase
      .from('inventory_items')
      .select('*, product:products(*)')
      .eq('household_id', currentHousehold.id)
    const low = ((inventory ?? []) as unknown as InventoryItemWithProduct[]).filter(
      (i) => i.low_stock_threshold != null && i.quantity <= i.low_stock_threshold,
    )

    const { data: existingList } = await supabase
      .from('shopping_list_items')
      .select('product_id')
      .eq('household_id', currentHousehold.id)
      .eq('is_checked', false)
    const existingIds = new Set((existingList ?? []).map((i) => i.product_id))

    const toInsert = low
      .filter((i) => !existingIds.has(i.product_id))
      .map((i) => ({
        household_id: currentHousehold.id,
        product_id: i.product_id,
        quantity: 1,
        unit: i.unit,
        auto_added: true,
      }))

    if (toInsert.length > 0) {
      await supabase.from('shopping_list_items').insert(toInsert)
    }
    loadList()
  }

  async function toggleChecked(item: ShoppingListItemWithProduct) {
    await supabase.from('shopping_list_items').update({ is_checked: !item.is_checked }).eq('id', item.id)
    loadList()
  }

  async function deleteItem(id: string) {
    await supabase.from('shopping_list_items').delete().eq('id', id)
    loadList()
  }

  async function clearChecked() {
    if (!currentHousehold) return
    await supabase
      .from('shopping_list_items')
      .delete()
      .eq('household_id', currentHousehold.id)
      .eq('is_checked', true)
    loadList()
  }

  if (!currentHousehold) return null

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Lista della spesa</h1>

      {lowStockCount > 0 && (
        <button
          onClick={handleAddLowStock}
          className="mb-4 w-full rounded-lg bg-blue-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          📉 Aggiungi {lowStockCount} prodott{lowStockCount === 1 ? 'o' : 'i'} in esaurimento
        </button>
      )}

      <form onSubmit={handleAddManual} className="mb-4 flex gap-2">
        <input
          placeholder="Aggiungi un prodotto..."
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Aggiungi
        </button>
      </form>

      {loading ? (
        <p className="py-10 text-center text-sm text-gray-400">Caricamento...</p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">La lista della spesa è vuota</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
            >
              <input
                type="checkbox"
                checked={item.is_checked}
                onChange={() => toggleChecked(item)}
                className="h-5 w-5 rounded border-gray-300 text-green-600"
              />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${item.is_checked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.product?.name ?? item.custom_name}
                </p>
                {item.auto_added && <p className="text-xs text-blue-500">Aggiunto automaticamente</p>}
              </div>
              <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {items.some((i) => i.is_checked) && (
        <button onClick={clearChecked} className="mt-4 w-full text-center text-sm text-gray-400 hover:underline">
          Rimuovi articoli completati
        </button>
      )}
    </div>
  )
}
