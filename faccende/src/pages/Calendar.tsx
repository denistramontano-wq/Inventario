import { useMemo, useState } from 'react'
import { useHome } from '../contexts/HomeContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { completionDay, projectOccurrences, type ChoreStatus } from '../lib/chores'
import { addDays, endOfMonth, formatLong, fromKey, MONTHS, startOfMonth, startOfWeek, todayKey, toKey, WEEKDAYS_SHORT } from '../lib/dates'
import { roomType } from '../lib/roomTypes'
import type { Chore, Completion } from '../lib/types'
import { PageHeader } from '../components/Layout'
import { PersonFilter } from '../components/PersonFilter'
import { ChoreCard } from '../components/ChoreCard'
import { ChoreForm } from '../components/ChoreForm'
import { Avatar } from '../components/Avatar'
import { CheckIcon, ChevronLeft, ChevronRight, ClockIcon } from '../components/Icons'

export function Calendar() {
  const { statuses, completions, chores, roomById } = useHome()
  const { memberById } = useHousehold()
  const today = todayKey()
  const [month, setMonth] = useState(startOfMonth(today))
  const [selected, setSelected] = useState(today)
  const [person, setPerson] = useState('all')
  const [editing, setEditing] = useState<Chore | null>(null)

  const choreById = useMemo(() => new Map(chores.map((c) => [c.id, c])), [chores])
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(month)
  const gridEnd = addDays(startOfWeek(monthEnd), 6)

  const { doneByDay, dueByDay } = useMemo(() => {
    const doneByDay = new Map<string, Completion[]>()
    for (const c of completions) {
      if (person !== 'all' && c.completed_by !== person) continue
      const d = completionDay(c)
      if (d < gridStart || d > gridEnd) continue
      const list = doneByDay.get(d)
      if (list) list.push(c)
      else doneByDay.set(d, [c])
    }
    const dueByDay = new Map<string, ChoreStatus[]>()
    for (const s of statuses.values()) {
      if (person !== 'all' && s.chore.assigned_to && s.chore.assigned_to !== person) continue
      for (const d of projectOccurrences(s, gridStart > today ? gridStart : today, gridEnd, today)) {
        const list = dueByDay.get(d)
        if (list) list.push(s)
        else dueByDay.set(d, [s])
      }
    }
    return { doneByDay, dueByDay }
  }, [completions, statuses, person, gridStart, gridEnd, today])

  const days: string[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  function shiftMonth(delta: number) {
    const d = fromKey(month)
    const next = toKey(new Date(d.getFullYear(), d.getMonth() + delta, 1))
    setMonth(next)
    setSelected(next <= today && today <= endOfMonth(next) ? today : next)
  }

  const selDone = doneByDay.get(selected) ?? []
  const selDue = dueByDay.get(selected) ?? []
  const m = fromKey(month)

  return (
    <div>
      <PageHeader title="Calendario" />
      <PersonFilter value={person} onChange={setPerson} />

      <div className="rounded-[2rem] bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="pressable rounded-full p-2 text-sub" aria-label="Mese precedente">
            <ChevronLeft />
          </button>
          <button
            onClick={() => {
              setMonth(startOfMonth(today))
              setSelected(today)
            }}
            className="text-lg font-black capitalize"
          >
            {MONTHS[m.getMonth()]} {m.getFullYear()}
          </button>
          <button onClick={() => shiftMonth(1)} className="pressable rounded-full p-2 text-sub" aria-label="Mese successivo">
            <ChevronRight />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS_SHORT.map((w, i) => (
            <span key={i} className={`pb-1 text-xs font-extrabold ${i >= 5 ? 'text-accent' : 'text-muted'}`}>
              {w}
            </span>
          ))}
          {days.map((d) => {
            const inMonth = d >= month && d <= monthEnd
            const done = doneByDay.get(d)?.length ?? 0
            const due = dueByDay.get(d) ?? []
            const overdue = d === today && due.some((s) => (s.daysLeft ?? 0) < 0)
            const isSel = d === selected
            const isToday = d === today
            return (
              <button
                key={d}
                onClick={() => setSelected(d)}
                className={`mx-auto flex h-12 w-11 flex-col items-center justify-center rounded-2xl text-[15px] font-extrabold transition-colors ${
                  isSel ? 'bg-accent text-white' : isToday ? 'bg-card2 text-accent' : inMonth ? 'text-ink' : 'text-muted/50'
                }`}
              >
                {fromKey(d).getDate()}
                <span className="mt-0.5 flex h-1.5 gap-0.5">
                  {done > 0 && <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white' : 'bg-good'}`} />}
                  {due.length > 0 && (
                    <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-white/70' : overdue ? 'bg-bad' : 'bg-accent'}`} />
                  )}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-xs font-bold text-sub">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-good" /> Fatte</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> In programma</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-bad" /> In ritardo</span>
        </div>
      </div>

      <h2 className="mt-6 mb-3 px-1 text-xl font-black">{selected === today ? 'Oggi' : formatLong(selected)}</h2>

      {selDue.length === 0 && selDone.length === 0 && (
        <p className="rounded-2xl bg-card p-6 text-center text-sub">
          {selected < today ? 'Nessuna faccenda registrata in questo giorno.' : 'Giornata libera! 🎈'}
        </p>
      )}

      {selDue.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 flex items-center gap-1.5 px-1 text-sm font-extrabold tracking-wider text-sub uppercase">
            <ClockIcon width={16} height={16} /> In programma
          </p>
          <div className="space-y-2.5">
            {selected === today
              ? selDue.map((s) => <ChoreCard key={s.chore.id} status={s} onEdit={() => setEditing(s.chore)} />)
              : selDue.map((s) => {
                  const t = roomType(roomById(s.chore.room_id)?.room_type ?? 'altro')
                  const who = memberById(s.chore.assigned_to)
                  return (
                    <button
                      key={s.chore.id}
                      onClick={() => setEditing(s.chore)}
                      className="pressable flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-xl" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
                        {t.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-extrabold">{s.chore.name}</span>
                        <span className="block truncate text-sm text-sub">{roomById(s.chore.room_id)?.name}</span>
                      </span>
                      {who && <Avatar avatar={who.avatar} color={who.color} size={28} />}
                    </button>
                  )
                })}
          </div>
        </div>
      )}

      {selDone.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 px-1 text-sm font-extrabold tracking-wider text-sub uppercase">
            <CheckIcon width={16} height={16} /> Fatte
          </p>
          <div className="space-y-2">
            {selDone.map((c) => {
              const chore = choreById.get(c.chore_id)
              const who = memberById(c.completed_by)
              const t = roomType(roomById(chore?.room_id ?? '')?.room_type ?? 'altro')
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card/60 p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-good/15 text-xl">{t.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-sub line-through decoration-good/60">{chore?.name ?? 'Faccenda eliminata'}</span>
                    <span className="block text-xs text-muted">
                      {new Date(c.completed_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      {who ? ` · ${who.display_name}` : ''}
                    </span>
                  </span>
                  <span className="text-sm font-black text-warn">+{c.points}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {editing && <ChoreForm chore={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
