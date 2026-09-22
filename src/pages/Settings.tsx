import { useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useCatalog } from '../contexts/CatalogContext'
import { supabase } from '../lib/supabase'
import { CURRENCIES } from '../lib/currency'
import { toCsv, downloadCsv } from '../lib/csvExport'
import type { InventoryItemWithProduct, InventoryMovement, Product } from '../lib/types'

type ExportJob = 'pdf' | 'csv-inventory' | 'csv-movements' | null

export function Settings() {
  const { user, signOut } = useAuth()
  const {
    currentHousehold,
    households,
    setCurrentHouseholdId,
    createInviteCode,
    updateDefaultCurrency,
    resetExpenseStats,
  } = useHousehold()
  const { locations, categories, addLocation, removeLocation, addCategory, removeCategory } = useCatalog()
  const [invite, setInvite] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingCurrency, setSavingCurrency] = useState(false)
  const [exporting, setExporting] = useState<ExportJob>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [newLocation, setNewLocation] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [catalogError, setCatalogError] = useState<string | null>(null)

  async function handleInvite() {
    setError(null)
    const result = await createInviteCode()
    if (result.error) setError(result.error)
    else setInvite(result.code)
  }

  async function handleCurrencyChange(currency: string) {
    setSavingCurrency(true)
    await updateDefaultCurrency(currency)
    setSavingCurrency(false)
  }

  async function handleReset() {
    setResetting(true)
    await resetExpenseStats()
    setResetting(false)
    setConfirmingReset(false)
  }

  async function handleAddLocation(e: FormEvent) {
    e.preventDefault()
    setCatalogError(null)
    const result = await addLocation(newLocation)
    if (result.error) setCatalogError(result.error)
    else setNewLocation('')
  }

  async function handleAddCategory(e: FormEvent) {
    e.preventDefault()
    setCatalogError(null)
    const result = await addCategory(newCategory)
    if (result.error) setCatalogError(result.error)
    else setNewCategory('')
  }

  async function fetchInventory(): Promise<InventoryItemWithProduct[]> {
    if (!currentHousehold) return []
    const { data } = await supabase
      .from('inventory_items')
      .select('*, product:products(*)')
      .eq('household_id', currentHousehold.id)
    return (data ?? []) as unknown as InventoryItemWithProduct[]
  }

  async function handleExportPdf() {
    if (!currentHousehold) return
    setExporting('pdf')
    try {
      const items = await fetchInventory()
      const { generateInventoryPdf } = await import('../lib/pdfExport')
      generateInventoryPdf(currentHousehold, items)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportInventoryCsv() {
    if (!currentHousehold) return
    setExporting('csv-inventory')
    try {
      const items = await fetchInventory()
      const csv = toCsv(
        ['Prodotto', 'Marca', 'Categoria', 'Quantità', 'Unità', 'Posizione', 'Scadenza', 'Prezzo', 'Valuta'],
        items.map((i) => [
          i.product.name,
          i.product.brand,
          i.product.category,
          i.quantity,
          i.unit,
          i.location,
          i.expiry_date,
          i.price,
          i.currency,
        ]),
      )
      downloadCsv(`inventario-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    } finally {
      setExporting(null)
    }
  }

  async function handleExportMovementsCsv() {
    if (!currentHousehold) return
    setExporting('csv-movements')
    try {
      const { data } = await supabase
        .from('inventory_movements')
        .select('*, product:products(*)')
        .eq('household_id', currentHousehold.id)
        .order('created_at', { ascending: false })
      const movements = (data ?? []) as unknown as (InventoryMovement & { product: Product })[]

      const typeLabel: Record<string, string> = { added: 'Aggiunto', consumed: 'Consumato', wasted: 'Sprecato', adjusted: 'Corretto' }

      const csv = toCsv(
        ['Data', 'Prodotto', 'Tipo', 'Quantità', 'Unità', 'Prezzo', 'Valuta'],
        movements.map((m) => [
          new Date(m.created_at).toLocaleString('it-IT'),
          m.product.name,
          typeLabel[m.type] ?? m.type,
          m.quantity,
          m.unit,
          m.price,
          m.currency,
        ]),
      )
      downloadCsv(`storico-spese-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    } finally {
      setExporting(null)
    }
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
        <p className="mb-2 text-xs text-gray-500">Valuta preferita</p>
        <select
          value={currentHousehold?.default_currency ?? 'EUR'}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={savingCurrency}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} {c.label} ({c.code})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Usata come predefinita quando aggiungi un prodotto — puoi comunque scegliere una valuta diversa per ogni
          singolo articolo.
        </p>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-500">Posizioni</p>
        <p className="mb-2 text-xs text-gray-400">
          Dove tieni le cose in casa: non solo cibo, va bene anche per prodotti vari (es. Bagno, Garage...).
        </p>
        <ul className="mb-2 flex flex-wrap gap-2">
          {locations.map((loc) => (
            <li
              key={loc.id}
              className="flex items-center gap-1 rounded-full bg-gray-100 py-1 pr-1 pl-3 text-xs text-gray-700"
            >
              {loc.name}
              <button
                onClick={() => removeLocation(loc.id)}
                disabled={locations.length <= 1}
                title={locations.length <= 1 ? 'Deve restarne almeno una' : 'Rimuovi'}
                className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-500 disabled:opacity-30"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddLocation} className="flex gap-2">
          <input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="Nuova posizione (es. Garage)"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Aggiungi
          </button>
        </form>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-500">Categorie</p>
        <p className="mb-2 text-xs text-gray-400">
          Che tipo di prodotto è: alimentare, pulizia, igiene personale... utile per tenere ordine tra cibo e non.
        </p>
        <ul className="mb-2 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-1 rounded-full bg-gray-100 py-1 pr-1 pl-3 text-xs text-gray-700"
            >
              {cat.name}
              <button
                onClick={() => removeCategory(cat.id)}
                disabled={categories.length <= 1}
                title={categories.length <= 1 ? 'Deve restarne almeno una' : 'Rimuovi'}
                className="flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-red-500 disabled:opacity-30"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddCategory} className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nuova categoria (es. Cartoleria)"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="shrink-0 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700">
            Aggiungi
          </button>
        </form>
        {catalogError && <p className="mt-2 text-sm text-red-600">{catalogError}</p>}
      </div>

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

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-500">Esporta dati</p>
        <div className="space-y-2">
          <button
            onClick={handleExportPdf}
            disabled={exporting !== null}
            className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {exporting === 'pdf' ? 'Generazione PDF...' : '📄 PDF scorte attuali'}
          </button>
          <button
            onClick={handleExportInventoryCsv}
            disabled={exporting !== null}
            className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {exporting === 'csv-inventory' ? 'Esportazione...' : '📊 CSV inventario'}
          </button>
          <button
            onClick={handleExportMovementsCsv}
            disabled={exporting !== null}
            className="w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {exporting === 'csv-movements' ? 'Esportazione...' : '📊 CSV storico spese'}
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs text-gray-500">Statistiche spesa</p>
        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            className="w-full rounded-lg bg-orange-50 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            Azzera conteggi spesa
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              I dati dell'inventario e lo storico non vengono toccati: solo i totali mostrati in "Statistiche"
              ripartono da zero da adesso.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                Annulla
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {resetting ? 'Azzeramento...' : 'Conferma'}
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={signOut} className="w-full rounded-lg bg-red-50 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
        Esci
      </button>
    </div>
  )
}
