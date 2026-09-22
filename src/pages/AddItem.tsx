import { lazy, Suspense, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import { useAuth } from '../contexts/AuthContext'
import { lookupBarcode } from '../lib/openfoodfacts'

const BarcodeScanner = lazy(() =>
  import('../components/BarcodeScanner').then((m) => ({ default: m.BarcodeScanner })),
)
import { LOCATIONS, LOCATION_LABELS, UNITS } from '../lib/types'
import type { Json } from '../lib/database.types'

export function AddItem() {
  const { currentHousehold } = useHousehold()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [scanning, setScanning] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [nutrition, setNutrition] = useState<Json | null>(null)
  const [source, setSource] = useState<'openfoodfacts' | 'manual'>('manual')

  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('pz')
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>('dispensa')
  const [expiryDate, setExpiryDate] = useState('')
  const [price, setPrice] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('1')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBarcodeDetected(code: string) {
    setScanning(false)
    setBarcode(code)
    setLookingUp(true)
    setLookupError(null)

    try {
      const existing = await supabase.from('products').select('*').eq('barcode', code).maybeSingle()
      if (existing.data) {
        setName(existing.data.name)
        setBrand(existing.data.brand ?? '')
        setImageUrl(existing.data.image_url)
        setUnit((existing.data.unit as (typeof UNITS)[number]) ?? 'pz')
        setNutrition(existing.data.nutrition)
        setSource(existing.data.source as 'openfoodfacts' | 'manual')
      } else {
        const off = await lookupBarcode(code)
        if (off) {
          setName(off.name)
          setBrand(off.brand ?? '')
          setImageUrl(off.imageUrl)
          setUnit(off.unit)
          setNutrition(off.nutrition as Json)
          setSource('openfoodfacts')
        } else {
          setLookupError('Prodotto non trovato. Inserisci i dati manualmente.')
          setSource('manual')
        }
      }
    } catch {
      setLookupError('Errore durante la ricerca del prodotto. Inserisci i dati manualmente.')
    } finally {
      setLookingUp(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!currentHousehold || !name.trim()) return
    setSaving(true)
    setError(null)

    try {
      let productId: string

      if (barcode) {
        // upsert su barcode: se due dispositivi scansionano lo stesso nuovo
        // barcode nello stesso istante, evita un errore di chiave duplicata
        // (constraint UNIQUE su products.barcode) e converge sulla stessa riga.
        const { data: product, error: productError } = await supabase
          .from('products')
          .upsert(
            {
              barcode,
              name: name.trim(),
              brand: brand.trim() || null,
              image_url: imageUrl,
              unit,
              nutrition: nutrition ?? null,
              source,
            },
            { onConflict: 'barcode' },
          )
          .select('id')
          .single()
        if (productError) throw productError
        productId = product.id
      } else {
        const { data: product, error: productError } = await supabase
          .from('products')
          .insert({
            barcode: null,
            name: name.trim(),
            brand: brand.trim() || null,
            image_url: imageUrl,
            unit,
            nutrition: nutrition ?? null,
            source,
          })
          .select('id')
          .single()
        if (productError) throw productError
        productId = product.id
      }

      const { error: itemError } = await supabase.from('inventory_items').insert({
        household_id: currentHousehold.id,
        product_id: productId,
        quantity: Number(quantity) || 1,
        unit,
        location,
        expiry_date: expiryDate || null,
        price: price ? Number(price) : null,
        low_stock_threshold: lowStockThreshold ? Number(lowStockThreshold) : null,
        added_by: user?.id ?? null,
      })
      if (itemError) throw itemError

      await supabase.from('inventory_movements').insert({
        household_id: currentHousehold.id,
        product_id: productId,
        type: 'added',
        quantity: Number(quantity) || 1,
        unit,
        price: price ? Number(price) : null,
        created_by: user?.id ?? null,
      })

      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Aggiungi prodotto</h1>

      <button
        onClick={() => setScanning(true)}
        className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-400 bg-green-50 py-4 text-sm font-medium text-green-700 hover:bg-green-100"
      >
        📷 Scannerizza codice a barre
      </button>

      <Link
        to="/scontrino"
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
      >
        📄 Oppure leggi uno scontrino (più prodotti insieme)
      </Link>

      {lookingUp && <p className="mb-3 text-sm text-gray-500">Ricerca prodotto...</p>}
      {lookupError && <p className="mb-3 text-sm text-orange-600">{lookupError}</p>}

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanning(false)} />
        </Suspense>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {imageUrl && <img src={imageUrl} alt="" className="h-24 w-24 rounded-lg object-cover" />}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nome prodotto</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Marca</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-gray-600">Quantità</label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-gray-600">Unità</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as (typeof UNITS)[number])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Posizione</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as (typeof LOCATIONS)[number])}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          >
            {LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {LOCATION_LABELS[loc]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-gray-600">Scadenza</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-medium text-gray-600">Prezzo (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Avvisami quando la quantità scende a
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva in inventario'}
        </button>
      </form>
    </div>
  )
}
