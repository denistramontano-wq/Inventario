import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useHousehold } from '../contexts/HouseholdContext'
import { useAuth } from '../contexts/AuthContext'
import { parseReceiptText } from '../lib/receiptParser'
import { LOCATIONS, LOCATION_LABELS } from '../lib/types'

interface ReviewItem {
  id: string
  name: string
  price: string
  quantity: string
  include: boolean
}

type Status = 'idle' | 'processing' | 'review' | 'saving' | 'error'

export function ReceiptScan() {
  const { currentHousehold } = useHousehold()
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [items, setItems] = useState<ReviewItem[]>([])
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>('dispensa')
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setImagePreview(URL.createObjectURL(file))
    setStatus('processing')
    setProgress(0)

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('ita', undefined, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const {
        data: { text },
      } = await worker.recognize(file)
      await worker.terminate()

      const parsed = parseReceiptText(text)
      if (parsed.length === 0) {
        setError(
          'Non ho riconosciuto nessuna riga prodotto nello scontrino. Puoi aggiungere le righe manualmente qui sotto.',
        )
      }
      setItems(
        parsed.map((p, i) => ({
          id: `${i}-${Date.now()}`,
          name: p.name,
          price: p.price.toFixed(2),
          quantity: '1',
          include: true,
        })),
      )
      setStatus('review')
    } catch (err) {
      console.error(err)
      setError('Errore durante la lettura dello scontrino. Riprova con una foto più nitida.')
      setStatus('error')
    }
  }

  function updateItem(id: string, patch: Partial<ReviewItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function addManualRow() {
    setItems((prev) => [
      ...prev,
      { id: `manual-${Date.now()}`, name: '', price: '', quantity: '1', include: true },
    ])
  }

  async function findOrCreateProduct(name: string): Promise<string> {
    const existing = await supabase.from('products').select('id').ilike('name', name).limit(1).maybeSingle()
    if (existing.data) return existing.data.id

    const { data, error: insertError } = await supabase
      .from('products')
      .insert({ name, source: 'manual', unit: 'pz' })
      .select('id')
      .single()
    if (insertError) throw insertError
    return data.id
  }

  async function handleConfirm() {
    if (!currentHousehold) return
    const toSave = items.filter((it) => it.include && it.name.trim() && Number(it.price) > 0)
    if (toSave.length === 0) {
      setError('Seleziona almeno un articolo con nome e prezzo validi')
      return
    }

    setStatus('saving')
    setError(null)

    try {
      for (const item of toSave) {
        const productId = await findOrCreateProduct(item.name.trim())
        const quantity = Number(item.quantity) || 1
        const price = Number(item.price)

        const { error: itemError } = await supabase.from('inventory_items').insert({
          household_id: currentHousehold.id,
          product_id: productId,
          quantity,
          unit: 'pz',
          location,
          price,
          added_by: user?.id ?? null,
        })
        if (itemError) throw itemError

        await supabase.from('inventory_movements').insert({
          household_id: currentHousehold.id,
          product_id: productId,
          type: 'added',
          quantity,
          unit: 'pz',
          price,
          created_by: user?.id ?? null,
        })
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      setStatus('review')
    }
  }

  const total = items
    .filter((it) => it.include)
    .reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)

  return (
    <div className="mx-auto max-w-lg px-4 pt-6 pb-6">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm text-gray-500">
        ← Indietro
      </button>

      <h1 className="mb-1 text-xl font-semibold text-gray-900">Scontrino</h1>
      <p className="mb-4 text-sm text-gray-500">
        Scatta o carica una foto dello scontrino: leggo i prodotti automaticamente, poi controlli e correggi prima
        di salvare.
      </p>

      {status === 'idle' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-400 bg-green-50 py-8 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            📄 Scatta o carica foto scontrino
          </button>
        </>
      )}

      {imagePreview && status !== 'idle' && (
        <img src={imagePreview} alt="Scontrino" className="mb-4 max-h-48 w-full rounded-lg object-contain bg-gray-100" />
      )}

      {status === 'processing' && (
        <div className="rounded-xl bg-white p-4 text-center shadow-sm">
          <p className="mb-2 text-sm text-gray-600">Lettura in corso...</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="my-3 text-sm text-orange-600">{error}</p>}

      {(status === 'review' || status === 'saving') && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">Dove metti questi prodotti?</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as (typeof LOCATIONS)[number])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {LOCATION_LABELS[loc]}
                </option>
              ))}
            </select>
          </div>

          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm">
                <input
                  type="checkbox"
                  checked={item.include}
                  onChange={(e) => updateItem(item.id, { include: e.target.checked })}
                  className="h-5 w-5 shrink-0 rounded border-gray-300 text-green-600"
                />
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                  placeholder="Nome prodotto"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
                <input
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: e.target.value })}
                  type="number"
                  min="1"
                  step="1"
                  className="w-12 shrink-0 rounded-lg border border-gray-300 px-1 py-1.5 text-center text-sm"
                />
                <input
                  value={item.price}
                  onChange={(e) => updateItem(item.id, { price: e.target.value })}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="€"
                  className="w-16 shrink-0 rounded-lg border border-gray-300 px-1 py-1.5 text-sm"
                />
                <button onClick={() => removeItem(item.id)} className="shrink-0 text-gray-300 hover:text-red-500">
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={addManualRow}
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            + Aggiungi riga manuale
          </button>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
            <span className="text-sm text-gray-500">Totale selezionato</span>
            <span className="text-lg font-semibold text-gray-900">€{total.toFixed(2)}</span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={status === 'saving'}
            className="mt-4 w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {status === 'saving' ? 'Salvataggio...' : 'Aggiungi tutto all\'inventario'}
          </button>
        </>
      )}
    </div>
  )
}
