import type { Chore, Completion } from './types'
import { addDays, diffDays, relativeDay, todayKey, toKey } from './dates'

export const EFFORT_POINTS: Record<1 | 2 | 3, number> = { 1: 5, 2: 10, 3: 20 }
export const EFFORT_LABEL: Record<1 | 2 | 3, string> = { 1: 'Veloce', 2: 'Normale', 3: 'Impegnativa' }

export const FREQUENCY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Una volta' },
  { value: 1, label: 'Ogni giorno' },
  { value: 2, label: 'Ogni 2 giorni' },
  { value: 3, label: 'Ogni 3 giorni' },
  { value: 7, label: 'Ogni settimana' },
  { value: 14, label: 'Ogni 2 settimane' },
  { value: 30, label: 'Ogni mese' },
  { value: 90, label: 'Ogni 3 mesi' },
  { value: 180, label: 'Ogni 6 mesi' },
]

export function frequencyLabel(days: number | null): string {
  const opt = FREQUENCY_OPTIONS.find((o) => o.value === days)
  if (opt) return opt.label
  if (days === null) return 'Una volta'
  if (days % 7 === 0) return `Ogni ${days / 7} settimane`
  return `Ogni ${days} giorni`
}

/** Indice: chore_id -> completamenti ordinati dal più recente */
export function indexCompletions(completions: Completion[]): Map<string, Completion[]> {
  const map = new Map<string, Completion[]>()
  for (const c of completions) {
    const list = map.get(c.chore_id)
    if (list) list.push(c)
    else map.set(c.chore_id, [c])
  }
  for (const list of map.values()) list.sort((a, b) => b.completed_at.localeCompare(a.completed_at))
  return map
}

export function completionDay(c: Completion): string {
  return toKey(new Date(c.completed_at))
}

export interface ChoreStatus {
  chore: Chore
  lastDone: string | null
  /** prossima scadenza; null se una tantum già fatta */
  nextDue: string | null
  /** 0..1 */
  freshness: number
  /** giorni alla scadenza (negativo = in ritardo) */
  daysLeft: number | null
  done: boolean
}

/**
 * Freschezza: 100% appena fatta, scende al 40% il giorno della scadenza e
 * arriva a 0% quando è in ritardo di un altro intero periodo.
 */
export function choreStatus(chore: Chore, history: Completion[] | undefined, today = todayKey()): ChoreStatus {
  const lastDone = history?.[0] ? completionDay(history[0]) : null

  if (chore.frequency_days === null) {
    if (lastDone) return { chore, lastDone, nextDue: null, freshness: 1, daysLeft: null, done: true }
    const daysLeft = diffDays(chore.start_date, today)
    const freshness = daysLeft >= 0 ? 1 : Math.max(0, 0.4 + daysLeft * 0.1)
    return { chore, lastDone, nextDue: chore.start_date, freshness, daysLeft, done: false }
  }

  const freq = chore.frequency_days
  let nextDue: string
  let freshness: number
  if (lastDone) {
    const candidate = addDays(lastDone, freq)
    // Se la prima scadenza è stata spostata più avanti, la rispetta
    nextDue = chore.start_date > candidate ? chore.start_date : candidate
    const elapsed = diffDays(today, lastDone)
    freshness = elapsed <= freq ? 1 - 0.6 * (elapsed / freq) : 0.4 - 0.4 * ((elapsed - freq) / freq)
  } else {
    nextDue = chore.start_date
    const daysLeft = diffDays(nextDue, today)
    freshness = daysLeft >= 0 ? 1 - 0.6 * Math.max(0, 1 - daysLeft / freq) : 0.4 - 0.4 * (-daysLeft / freq)
  }
  return {
    chore,
    lastDone,
    nextDue,
    freshness: Math.min(1, Math.max(0, freshness)),
    daysLeft: diffDays(nextDue, today),
    done: false,
  }
}

export function averageFreshness(statuses: ChoreStatus[]): number | null {
  const active = statuses.filter((s) => !(s.chore.frequency_days === null && s.done))
  if (active.length === 0) return null
  return active.reduce((sum, s) => sum + s.freshness, 0) / active.length
}

export function freshnessColor(f: number | null): string {
  if (f === null) return 'var(--color-muted)'
  if (f >= 0.7) return 'var(--color-good)'
  if (f >= 0.4) return 'var(--color-warn)'
  return 'var(--color-bad)'
}

/**
 * Scadenze previste di una faccenda nell'intervallo [from, to].
 * Una faccenda in ritardo viene mostrata oggi; le ripetizioni successive
 * ipotizzano che venga fatta nel giorno previsto.
 */
export function projectOccurrences(status: ChoreStatus, from: string, to: string, today = todayKey()): string[] {
  if (status.nextDue === null) return []
  let due = status.nextDue < today ? today : status.nextDue
  const freq = status.chore.frequency_days
  const out: string[] = []
  let guard = 0
  while (due <= to && guard++ < 400) {
    if (due >= from) out.push(due)
    if (freq === null) break
    due = addDays(due, freq)
  }
  return out
}

/** Giorni consecutivi (fino a oggi o ieri) con almeno un completamento */
export function streak(days: Set<string>, today = todayKey()): number {
  let cursor = days.has(today) ? today : addDays(today, -1)
  let n = 0
  while (days.has(cursor)) {
    n++
    cursor = addDays(cursor, -1)
  }
  return n
}

export function level(points: number): { level: number; current: number; next: number } {
  // Ogni livello richiede 50 punti in più del precedente
  let lvl = 1
  let floor = 0
  let step = 50
  while (points >= floor + step) {
    floor += step
    lvl++
    step += 50
  }
  return { level: lvl, current: points - floor, next: step }
}

export function dueLabel(s: ChoreStatus): { text: string; tone: string } {
  if (s.done) return { text: 'Fatta', tone: 'text-good' }
  if (s.daysLeft === null || s.nextDue === null) return { text: '', tone: 'text-sub' }
  if (s.daysLeft < 0) return { text: `In ritardo di ${-s.daysLeft} ${s.daysLeft === -1 ? 'giorno' : 'giorni'}`, tone: 'text-bad' }
  if (s.daysLeft === 0) return { text: 'Da fare oggi', tone: 'text-warn' }
  return { text: relativeDay(s.nextDue), tone: 'text-sub' }
}
