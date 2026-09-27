import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHome } from '../contexts/HomeContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { completionDay, type ChoreStatus } from '../lib/chores'
import { addDays, formatLong, fromKey, todayKey, WEEKDAYS_SHORT } from '../lib/dates'
import { roomType } from '../lib/roomTypes'
import type { Chore, Completion } from '../lib/types'
import { PageHeader, RoundButton } from '../components/Layout'
import { PersonFilter } from '../components/PersonFilter'
import { ChoreCard } from '../components/ChoreCard'
import { ChoreForm } from '../components/ChoreForm'
import { CheckIcon, PlusIcon, UndoIcon } from '../components/Icons'

type Tab = 'todo' | 'done'

export function Activities() {
  const { user } = useAuth()
  const { statuses, completions, rooms } = useHome()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('todo')
  const [person, setPerson] = useState('all')
  const [editing, setEditing] = useState<Chore | 'new' | null>(null)

  return (
    <div>
      <PageHeader
        title="Attività"
        right={
          <RoundButton
            accent
            label="Nuova faccenda"
            onClick={() => (rooms.length === 0 ? navigate('/stanze/nuova') : setEditing('new'))}
          >
            <PlusIcon strokeWidth={2.6} />
          </RoundButton>
        }
      />

      <div className="mb-4 grid grid-cols-2 rounded-full bg-card p-1.5">
        {(
          [
            ['todo', 'Da fare'],
            ['done', 'Fatte'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-full py-2.5 font-extrabold transition-colors ${tab === id ? 'bg-accent text-white' : 'text-sub'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <PersonFilter value={person} onChange={setPerson} />

      {tab === 'todo' ? (
        <TodoList statuses={[...statuses.values()]} person={person} onEdit={setEditing} />
      ) : (
        <DoneList completions={completions} person={person} userId={user?.id ?? ''} />
      )}

      {editing && <ChoreForm chore={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function TodoList({ statuses, person, onEdit }: { statuses: ChoreStatus[]; person: string; onEdit: (c: Chore) => void }) {
  const groups = useMemo(() => {
    const list = statuses
      .filter((s) => !s.done && s.daysLeft !== null)
      .filter((s) => person === 'all' || !s.chore.assigned_to || s.chore.assigned_to === person)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
    return [
      { title: 'In ritardo', tone: 'text-bad', items: list.filter((s) => (s.daysLeft ?? 0) < 0) },
      { title: 'Oggi', tone: 'text-warn', items: list.filter((s) => s.daysLeft === 0) },
      { title: 'Prossimi 7 giorni', tone: 'text-sub', items: list.filter((s) => (s.daysLeft ?? 0) > 0 && (s.daysLeft ?? 0) <= 7) },
      { title: 'Più avanti', tone: 'text-muted', items: list.filter((s) => (s.daysLeft ?? 0) > 7) },
    ].filter((g) => g.items.length > 0)
  }, [statuses, person])

  if (groups.length === 0) {
    return (
      <div className="rounded-[2rem] bg-card p-8 text-center">
        <p className="text-5xl">🏆</p>
        <p className="mt-3 text-lg font-extrabold">Niente da fare!</p>
        <p className="mt-1 text-sub">Aggiungi una faccenda con il pulsante +</p>
      </div>
    )
  }
  const urgent = groups.filter((g) => g.title === 'In ritardo' || g.title === 'Oggi').reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="space-y-6">
      {urgent > 0 && (
        <p className="rounded-2xl bg-accent/10 px-4 py-3 text-sm font-bold text-accent">
          💪 {urgent === 1 ? 'Una sola faccenda' : `${urgent} faccende`} per chiudere la giornata. Si parte?
        </p>
      )}
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className={`mb-2 px-1 text-sm font-extrabold tracking-wider uppercase ${g.tone}`}>
            {g.title} · {g.items.length}
          </h2>
          <div className="space-y-2.5">
            {g.items.map((s) => (
              <ChoreCard key={s.chore.id} status={s} onEdit={() => onEdit(s.chore)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function DoneList({ completions, person, userId }: { completions: Completion[]; person: string; userId: string }) {
  const { chores, rooms, undoCompletion } = useHome()
  const { memberById } = useHousehold()
  const today = todayKey()
  const choreById = useMemo(() => new Map(chores.map((c) => [c.id, c])), [chores])
  const filtered = completions.filter((c) => person === 'all' || c.completed_by === person)
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))

  // Per stanza: quante completate per ciascuno degli ultimi 7 giorni
  const roomWeek = rooms.map((r) => {
    const counts = week.map(
      (d) => filtered.filter((c) => completionDay(c) === d && choreById.get(c.chore_id)?.room_id === r.id).length,
    )
    return { room: r, counts, total: counts.reduce((a, b) => a + b, 0) }
  })

  const byDay = new Map<string, Completion[]>()
  for (const c of filtered) {
    const d = completionDay(c)
    if (d < addDays(today, -30)) continue
    const list = byDay.get(d)
    if (list) list.push(c)
    else byDay.set(d, [c])
  }
  const dayKeys = [...byDay.keys()].sort().reverse()

  return (
    <div className="space-y-6">
      {rooms.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-sm font-extrabold tracking-wider text-sub uppercase">Stanze negli ultimi 7 giorni</h2>
          <div className="grid grid-cols-2 gap-3">
            {roomWeek.map(({ room, counts, total }) => {
              const t = roomType(room.room_type)
              return (
                <div key={room.id} className="rounded-[1.6rem] bg-card p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{t.emoji}</span>
                    <span className="truncate font-extrabold">{room.name}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                    {week.map((d, i) => (
                      <span key={d} className="text-[10px] font-bold text-muted">
                        {WEEKDAYS_SHORT[(fromKey(d).getDay() + 6) % 7]}
                        <span
                          className={`mt-0.5 flex aspect-square items-center justify-center rounded-md ${
                            counts[i] > 0 ? 'bg-good text-black' : d === today ? 'border-2 border-line' : 'bg-card2'
                          }`}
                        >
                          {counts[i] > 0 && <CheckIcon width={11} height={11} strokeWidth={4} />}
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm font-bold text-sub">
                    {total} {total === 1 ? 'completata' : 'completate'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {dayKeys.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sub">Ancora nulla negli ultimi 30 giorni. La prima è la più importante!</p>
      ) : (
        dayKeys.map((d) => (
          <section key={d}>
            <h2 className="mb-2 px-1 text-sm font-extrabold tracking-wider text-sub uppercase">
              {d === today ? 'Oggi' : d === addDays(today, -1) ? 'Ieri' : formatLong(d)}
            </h2>
            <div className="space-y-2">
              {byDay.get(d)!.map((c) => {
                const chore = choreById.get(c.chore_id)
                const room = rooms.find((r) => r.id === chore?.room_id)
                const who = memberById(c.completed_by)
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-good text-black">
                      <CheckIcon width={20} height={20} strokeWidth={3} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-extrabold">{chore?.name ?? 'Faccenda eliminata'}</span>
                      <span className="block truncate text-sm text-sub">
                        {room?.name}
                        {who ? ` · ${who.display_name}` : ''}
                      </span>
                    </span>
                    <span className="text-sm font-black text-warn">+{c.points}</span>
                    {c.completed_by === userId && (
                      <button
                        onClick={() => undoCompletion(c.id)}
                        className="pressable rounded-full p-2 text-muted"
                        aria-label="Annulla completamento"
                        title="Annulla"
                      >
                        <UndoIcon width={18} height={18} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
