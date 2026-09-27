import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHome } from '../contexts/HomeContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { averageFreshness, freshnessColor, type ChoreStatus } from '../lib/chores'
import { houseFreshness, periodStats, userStats } from '../lib/stats'
import { mascotLine } from '../lib/motivation'
import { completionDay } from '../lib/chores'
import { todayKey } from '../lib/dates'
import { Avatar } from '../components/Avatar'
import { HouseHero } from '../components/HouseHero'
import { ProgressRing } from '../components/ProgressRing'
import { RoomCard } from '../components/RoomCard'
import { ChoreCard } from '../components/ChoreCard'
import { ChoreForm } from '../components/ChoreForm'
import { FlameIcon, PlusIcon, UsersIcon, ChevronRight } from '../components/Icons'
import type { Chore } from '../lib/types'

export function Home() {
  const { user } = useAuth()
  const { profile, members, currentHousehold } = useHousehold()
  const { rooms, statuses, completions, loading } = useHome()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<Chore | null>(null)

  const all = useMemo(() => [...statuses.values()], [statuses])
  const fresh = houseFreshness(all)
  const stats = useMemo(() => periodStats(all, completions), [all, completions])
  const me = useMemo(() => userStats(completions, user?.id ?? ''), [completions, user])

  const today = todayKey()
  const dueNow = all
    .filter((s) => !s.done && s.daysLeft !== null && s.daysLeft <= 0)
    .filter((s) => !s.chore.assigned_to || s.chore.assigned_to === user?.id)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
  const doneToday = completions.filter((c) => completionDay(c) === today).length
  const line = mascotLine({ freshness: fresh, doneToday, dueToday: dueNow.length, streak: me.streak })

  const byRoom = useMemo(() => {
    const map = new Map<string, ChoreStatus[]>()
    for (const s of all) {
      const list = map.get(s.chore.room_id)
      if (list) list.push(s)
      else map.set(s.chore.room_id, [s])
    }
    return map
  }, [all])

  const pct = fresh === null ? null : Math.round(fresh * 100)

  return (
    <div className="space-y-5">
      {/* saluto */}
      <div className="flex items-center gap-3 rounded-[2rem] bg-card p-4">
        <Link to="/profilo">
          <Avatar avatar={profile?.avatar ?? '🙂'} color={profile?.color ?? '#3b9ee6'} size={56} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black">Ciao, {profile?.display_name ?? ''}</p>
          <p className="truncate text-sm text-sub">{currentHousehold?.name}</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1">
            <FlameIcon width={30} height={30} className={me.streak > 0 ? '' : 'opacity-40 grayscale'} />
            <span className="text-3xl font-black text-flame">{me.streak}</span>
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-sub uppercase">
            {me.streak === 1 ? 'giorno' : 'giorni'} di fila
          </span>
        </div>
      </div>

      {/* casa */}
      <div className="relative overflow-hidden rounded-[2rem] bg-card px-4 pt-4 pb-5">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <Link
            to="/profilo"
            className="pressable relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-card2 text-sub"
            aria-label="Persone in casa"
          >
            <UsersIcon width={26} height={26} />
            <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1 text-xs font-black text-white">
              {members.length}
            </span>
          </Link>
          <div className="relative max-w-[75%] rounded-2xl border-2 border-line bg-bg/60 px-3.5 py-2 text-sm font-bold">
            {line}
            <span className="absolute -bottom-2 right-8 h-3.5 w-3.5 rotate-45 border-r-2 border-b-2 border-line bg-[#11141a]" />
          </div>
        </div>
        <div className="relative -mt-2 flex items-end">
          <div className="flex-1">
            <HouseHero freshness={fresh} />
          </div>
          <span className="animate-sway absolute top-6 right-1 text-5xl" aria-hidden>
            🧹
          </span>
        </div>
        <div className="relative mt-1">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="font-bold text-sub">Freschezza della casa</span>
            <span className="text-xl font-black" style={{ color: freshnessColor(fresh) }}>
              {pct === null ? '—' : `${pct}%`}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-card2">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${pct ?? 0}%`, background: freshnessColor(fresh) }}
            />
          </div>
        </div>
      </div>

      {/* da fare adesso */}
      {dueNow.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-extrabold tracking-wider text-sub uppercase">Da fare adesso</h2>
            <Link to="/attivita" className="flex items-center text-sm font-bold text-accent">
              Tutte <ChevronRight width={16} height={16} />
            </Link>
          </div>
          <div className="space-y-2.5">
            {dueNow.slice(0, 3).map((s) => (
              <ChoreCard key={s.chore.id} status={s} onEdit={() => setEditing(s.chore)} />
            ))}
          </div>
        </section>
      )}

      {/* progressi */}
      <section className="rounded-[2rem] bg-card p-5">
        <h2 className="mb-4 text-sm font-extrabold tracking-wider text-sub uppercase">Faccende completate</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Oggi', p: stats.today },
            { label: 'Settimana', p: stats.week },
            { label: 'Mese', p: stats.month },
          ].map(({ label, p }) => (
            <div key={label} className="flex flex-col items-center">
              <ProgressRing value={p.ratio} color={freshnessColor(p.total === 0 ? null : 0.2 + p.ratio * 0.8)} />
              <p className="mt-2 font-extrabold">{label}</p>
              <p className="text-sm font-bold text-sub">
                {p.done} / {p.total}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* stanze */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-2xl font-black">Stanze</h2>
          <button
            onClick={() => navigate('/stanze/nuova')}
            className="pressable flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30"
            aria-label="Aggiungi stanza"
          >
            <PlusIcon width={24} height={24} strokeWidth={2.6} />
          </button>
        </div>
        {!loading && rooms.length === 0 ? (
          <button
            onClick={() => navigate('/stanze/nuova')}
            className="pressable w-full rounded-[2rem] border-2 border-dashed border-line p-8 text-center"
          >
            <span className="text-5xl">🏡</span>
            <p className="mt-3 text-lg font-extrabold">Aggiungi la tua prima stanza</p>
            <p className="mt-1 text-sm text-sub">Ti suggerisco io le faccende più comuni da tenere d'occhio.</p>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rooms.map((room) => {
              const list = byRoom.get(room.id) ?? []
              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  freshness={averageFreshness(list)}
                  due={list.filter((s) => !s.done && s.daysLeft !== null && s.daysLeft <= 0).length}
                />
              )
            })}
          </div>
        )}
      </section>

      {editing && <ChoreForm chore={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
