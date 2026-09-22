export interface ParsedReceiptItem {
  name: string
  price: number
}

// Righe che non sono mai un prodotto: totali, pagamento, dati fiscali, ecc.
const BLOCKLIST = [
  'totale',
  'subtotale',
  'sub totale',
  'contante',
  'contanti',
  'resto',
  'sconto',
  'iva',
  'scontrino',
  'documento commerciale',
  'cassa',
  'operatore',
  'partita iva',
  'p.iva',
  'p. iva',
  'cod. fisc',
  'codice fiscale',
  'importo',
  'pagamento',
  'carta',
  'bancomat',
  'punti fedelt',
  'fidelity',
  'grazie',
  'arrivederci',
  'benvenut',
  'n. articoli',
  'n articoli',
  'articoli n',
  'numero scontrino',
  'reso',
  'macroarea',
  'via ',
  'scala mercato',
  'chiuso il',
  'aperto il',
]

const PRICE_AT_END = /(\d{1,4}[.,]\d{2})\s*(?:€|eur)?\s*$/i
const LEADING_QUANTITY = /^\d{1,3}\s*[xX*]\s*/

function isBlocked(line: string) {
  const lower = line.toLowerCase()
  return BLOCKLIST.some((word) => lower.includes(word))
}

function hasLetters(text: string) {
  return /[a-zA-ZàèéìòùÀÈÉÌÒÙ]{2,}/.test(text)
}

/**
 * Estrae righe candidate a essere "prodotto + prezzo" da testo OCR grezzo di
 * uno scontrino italiano. Euristico per natura (formati scontrino molto
 * vari, OCR spesso imperfetto su carta termica) — pensato per essere una
 * bozza che l'utente corregge, non un parser esatto.
 */
export function parseReceiptText(rawText: string): ParsedReceiptItem[] {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const items: ParsedReceiptItem[] = []

  for (const line of lines) {
    if (isBlocked(line)) continue

    const match = line.match(PRICE_AT_END)
    if (!match) continue

    const price = Number(match[1].replace(',', '.'))
    if (!Number.isFinite(price) || price <= 0 || price > 999.99) continue

    let name = line.slice(0, match.index).trim()
    name = name.replace(LEADING_QUANTITY, '').trim()
    // Rimuove eventuali codici a barre/numerici residui isolati
    name = name.replace(/\s{2,}/g, ' ').trim()

    if (!hasLetters(name) || name.length < 2) continue

    items.push({ name: titleCase(name), price })
  }

  return items
}

function titleCase(text: string) {
  return text
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}
