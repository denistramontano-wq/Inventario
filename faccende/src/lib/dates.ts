// Tutte le date "di calendario" sono stringhe yyyy-mm-dd in ora locale.

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(key: string, days: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + days)
  return toKey(d)
}

export function diffDays(a: string, b: string): number {
  // a - b in giorni (usa mezzogiorno per evitare problemi con l'ora legale)
  const da = fromKey(a)
  const db = fromKey(b)
  da.setHours(12)
  db.setHours(12)
  return Math.round((da.getTime() - db.getTime()) / 86_400_000)
}

/** Lunedì della settimana che contiene `key` */
export function startOfWeek(key: string): string {
  const d = fromKey(key)
  const dow = (d.getDay() + 6) % 7
  return addDays(key, -dow)
}

export function startOfMonth(key: string): string {
  return key.slice(0, 8) + '01'
}

export function endOfMonth(key: string): string {
  const d = fromKey(key)
  return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
export const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
]

export function formatShort(key: string): string {
  const d = fromKey(key)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export function formatLong(key: string): string {
  const d = fromKey(key)
  const wd = d.toLocaleDateString('it-IT', { weekday: 'long' })
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function relativeDay(key: string, today = todayKey()): string {
  const n = diffDays(key, today)
  if (n === 0) return 'Oggi'
  if (n === 1) return 'Domani'
  if (n === -1) return 'Ieri'
  if (n < 0) return `${-n} giorni fa`
  if (n < 7) return `Tra ${n} giorni`
  return formatShort(key)
}
