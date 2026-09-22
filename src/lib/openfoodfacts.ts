export interface OffProduct {
  barcode: string
  name: string
  brand: string | null
  category: string | null
  imageUrl: string | null
  unit: 'pz' | 'g' | 'kg' | 'ml' | 'l'
  nutrition: Record<string, unknown> | null
}

const OFF_API = 'https://world.openfoodfacts.org/api/v2/product'

function guessUnit(quantity: string | undefined): OffProduct['unit'] {
  if (!quantity) return 'pz'
  const q = quantity.toLowerCase()
  if (q.includes('kg')) return 'kg'
  if (q.includes('ml')) return 'ml'
  if (q.includes('l') && !q.includes('kg')) return 'l'
  if (q.includes('g')) return 'g'
  return 'pz'
}

export async function lookupBarcode(barcode: string): Promise<OffProduct | null> {
  const res = await fetch(
    `${OFF_API}/${encodeURIComponent(barcode)}.json?fields=product_name,brands,categories,image_url,quantity,nutriments`,
  )
  if (!res.ok) return null

  const data = await res.json()
  if (data.status !== 1 || !data.product) return null

  const p = data.product
  const name: string | undefined = p.product_name
  if (!name) return null

  return {
    barcode,
    name,
    brand: p.brands ?? null,
    category: p.categories ? String(p.categories).split(',')[0].trim() : null,
    imageUrl: p.image_url ?? null,
    unit: guessUnit(p.quantity),
    nutrition: p.nutriments ?? null,
  }
}
