import type { Completion } from './types'
import { averageFreshness, completionDay, projectOccurrences, streak, type ChoreStatus } from './chores'
import { endOfMonth, startOfMonth, startOfWeek, addDays, todayKey } from './dates'

export interface PeriodProgress {
  done: number
  total: number
  ratio: number
}

function period(statuses: ChoreStatus[], completions: Completion[], from: string, to: string, today: string): PeriodProgress {
  const done = completions.filter((c) => {
    const d = completionDay(c)
    return d >= from && d <= to
  }).length
  let pending = 0
  for (const s of statuses) pending += projectOccurrences(s, today, to, today).length
  const total = done + pending
  return { done, total, ratio: total === 0 ? (done > 0 ? 1 : 0) : done / total }
}

export function periodStats(statuses: ChoreStatus[], completions: Completion[], today = todayKey()) {
  return {
    today: period(statuses, completions, today, today, today),
    week: period(statuses, completions, startOfWeek(today), addDays(startOfWeek(today), 6), today),
    month: period(statuses, completions, startOfMonth(today), endOfMonth(today), today),
  }
}

export function houseFreshness(statuses: ChoreStatus[]) {
  return averageFreshness(statuses)
}

export function userStats(completions: Completion[], userId: string, today = todayKey()) {
  const mine = completions.filter((c) => c.completed_by === userId)
  const days = new Set(mine.map(completionDay))
  const weekStart = startOfWeek(today)
  return {
    streak: streak(days, today),
    totalPoints: mine.reduce((s, c) => s + c.points, 0),
    weekPoints: mine.filter((c) => completionDay(c) >= weekStart).reduce((s, c) => s + c.points, 0),
    count: mine.length,
  }
}

/** Punti della settimana corrente per membro */
export function weeklyLeaderboard(completions: Completion[], today = todayKey()) {
  const weekStart = startOfWeek(today)
  const points = new Map<string, number>()
  const counts = new Map<string, number>()
  for (const c of completions) {
    if (!c.completed_by || completionDay(c) < weekStart) continue
    points.set(c.completed_by, (points.get(c.completed_by) ?? 0) + c.points)
    counts.set(c.completed_by, (counts.get(c.completed_by) ?? 0) + 1)
  }
  return { points, counts }
}
