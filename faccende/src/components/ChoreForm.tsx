import { useState, type FormEvent } from 'react'
import type { Chore } from '../lib/types'
import { EFFORT_LABEL, EFFORT_POINTS, FREQUENCY_OPTIONS, frequencyLabel } from '../lib/chores'
import { todayKey, formatShort } from '../lib/dates'
import { completionDay } from '../lib/chores'
import { useAuth } from '../contexts/AuthContext'
import { useHome } from '../contexts/HomeContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { Sheet } from './Sheet'
import { Avatar } from './Avatar'

export function ChoreForm({
  chore,
  defaultRoomId,
  onClose,
}: {
  chore?: Chore
  defaultRoomId?: string
  onClose: () => void
}) {
  const { rooms, addChore, updateChore, deleteChore, history, undoCompletion } = useHome()
  const { members } = useHousehold()
  const { user } = useAuth()
  const [name, setName] = useState(chore?.name ?? '')
  const [roomId, setRoomId] = useState(chore?.room_id ?? defaultRoomId ?? rooms[0]?.id ?? '')
  const [frequency, setFrequency] = useState<number | null>(chore ? chore.frequency_days : 7)
  const [startDate, setStartDate] = useState(chore?.start_date ?? todayKey())
  const [assignedTo, setAssignedTo] = useState<string | null>(chore?.assigned_to ?? null)
  const [effort, setEffort] = useState<1 | 2 | 3>(chore?.effort ?? 2)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const options = FREQUENCY_OPTIONS.some((o) => o.value === frequency)
    ? FREQUENCY_OPTIONS
    : [...FREQUENCY_OPTIONS, { value: frequency, label: frequencyLabel(frequency) }]
  const recent = chore ? (history.get(chore.id) ?? []).slice(0, 5) : []

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!roomId) {
      setError('Crea prima una stanza')
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim(),
      room_id: roomId,
      frequency_days: frequency,
      start_date: startDate,
      assigned_to: assignedTo,
      effort,
    }
    const { error } = chore ? await updateChore(chore.id, payload) : await addChore(payload)
    setSaving(false)
    if (error) setError(error)
    else onClose()
  }

  async function handleDelete() {
    if (!chore) return
    setSaving(true)
    const { error } = await deleteChore(chore.id)
    setSaving(false)
    if (error) setError(error)
    else onClose()
  }

  return (
    <Sheet title={chore ? 'Modifica faccenda' : 'Nuova faccenda'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          required
          autoFocus={!chore}
          className="field text-lg font-bold"
          placeholder="Es. Pulire il forno"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-sub">Stanza</span>
          <select className="field" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-sub">Ripetizione</span>
            <select
              className="field"
              value={frequency ?? ''}
              onChange={(e) => setFrequency(e.target.value === '' ? null : Number(e.target.value))}
            >
              {options.map((o) => (
                <option key={String(o.value)} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-sub">{frequency === null ? 'Entro il' : 'Prossima volta'}</span>
            <input type="date" className="field" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-sub">Impegno</span>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEffort(e)}
                className={`rounded-2xl border-2 py-2 text-sm font-bold ${
                  effort === e ? 'border-accent bg-accent/15 text-ink' : 'border-transparent bg-card2 text-sub'
                }`}
              >
                {EFFORT_LABEL[e]}
                <span className="block text-xs text-warn">+{EFFORT_POINTS[e]} punti</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-bold text-sub">Chi se ne occupa</span>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
            <button
              type="button"
              onClick={() => setAssignedTo(null)}
              className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold ${
                assignedTo === null ? 'border-accent bg-accent/15' : 'border-transparent bg-card2 text-sub'
              }`}
            >
              Chiunque
            </button>
            {members.map((m) => (
              <button
                type="button"
                key={m.user_id}
                onClick={() => setAssignedTo(m.user_id)}
                className={`flex shrink-0 items-center gap-2 rounded-full border-2 py-1.5 pr-4 pl-1.5 text-sm font-bold ${
                  assignedTo === m.user_id ? 'border-accent bg-accent/15' : 'border-transparent bg-card2 text-sub'
                }`}
              >
                <Avatar avatar={m.avatar} color={m.color} size={26} />
                {m.display_name}
              </button>
            ))}
          </div>
        </div>

        {recent.length > 0 && (
          <div>
            <span className="mb-1.5 block text-sm font-bold text-sub">Ultime volte</span>
            <ul className="space-y-1.5">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-xl bg-card2 px-3 py-2 text-sm">
                  <span>
                    {formatShort(completionDay(c))} ·{' '}
                    {members.find((m) => m.user_id === c.completed_by)?.display_name ?? '—'}
                  </span>
                  {c.completed_by === user?.id && (
                    <button type="button" onClick={() => undoCompletion(c.id)} className="text-xs font-bold text-bad">
                      Annulla
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && <p className="text-sm font-bold text-bad">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Salvataggio…' : chore ? 'Salva' : 'Aggiungi faccenda'}
        </button>

        {chore &&
          (confirmDelete ? (
            <div className="flex gap-2">
              <button type="button" className="btn-soft flex-1" onClick={() => setConfirmDelete(false)}>
                Annulla
              </button>
              <button type="button" className="flex-1 rounded-2xl bg-bad py-3 font-extrabold text-black" onClick={handleDelete}>
                Elimina davvero
              </button>
            </div>
          ) : (
            <button type="button" className="w-full py-2 text-sm font-bold text-bad" onClick={() => setConfirmDelete(true)}>
              Elimina faccenda
            </button>
          ))}
      </form>
    </Sheet>
  )
}
