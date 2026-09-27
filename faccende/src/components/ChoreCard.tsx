import { useState } from 'react'
import type { ChoreStatus } from '../lib/chores'
import { dueLabel, freshnessColor, frequencyLabel, EFFORT_POINTS } from '../lib/chores'
import { roomType } from '../lib/roomTypes'
import { useHome } from '../contexts/HomeContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { Avatar } from './Avatar'
import { CheckIcon, RepeatIcon } from './Icons'

export function ChoreCard({
  status,
  onEdit,
  showRoom = true,
}: {
  status: ChoreStatus
  onEdit?: () => void
  showRoom?: boolean
}) {
  const { roomById, completeChore } = useHome()
  const { memberById } = useHousehold()
  const [justDone, setJustDone] = useState(false)
  const { chore } = status
  const room = roomById(chore.room_id)
  const t = roomType(room?.room_type ?? 'altro')
  const assignee = memberById(chore.assigned_to)
  const due = dueLabel(status)

  async function handleDone() {
    if (justDone) return
    setJustDone(true)
    await completeChore(chore)
    window.setTimeout(() => setJustDone(false), 1500)
  }

  return (
    <div className="animate-rise flex items-center gap-3 rounded-[1.4rem] bg-card p-3 pr-3.5">
      <button onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Modifica ${chore.name}`}>
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
          style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
        >
          {t.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.05rem] font-extrabold">{chore.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm">
            <span className={`font-bold ${due.tone}`}>{due.text}</span>
            <span className="flex items-center gap-1 text-muted">
              <RepeatIcon width={13} height={13} />
              {frequencyLabel(chore.frequency_days)}
            </span>
          </span>
          <span className="mt-1.5 flex items-center gap-2 text-xs text-sub">
            {showRoom && room && <span className="truncate">{room.name}</span>}
            {assignee && (
              <span className="flex items-center gap-1">
                <Avatar avatar={assignee.avatar} color={assignee.color} size={16} />
                {assignee.display_name}
              </span>
            )}
            <span className="ml-auto shrink-0 rounded-full bg-card2 px-2 py-0.5 font-bold text-warn">
              +{EFFORT_POINTS[chore.effort]}
            </span>
          </span>
        </span>
      </button>
      {!status.done && (
        <button
          onClick={handleDone}
          aria-label={`Segna "${chore.name}" come fatta`}
          className={`pressable flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            justDone ? 'animate-pop border-good bg-good text-black' : 'border-line text-muted hover:border-good hover:text-good'
          }`}
        >
          <CheckIcon width={24} height={24} strokeWidth={3} />
        </button>
      )}
    </div>
  )
}

export function FreshnessBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-card2">
      <div className="h-full rounded-full" style={{ width: `${Math.round(value * 100)}%`, background: freshnessColor(value) }} />
    </div>
  )
}
