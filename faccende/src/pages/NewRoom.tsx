import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROOM_TYPES, type RoomType } from '../lib/roomTypes'
import { frequencyLabel } from '../lib/chores'
import { addDays, todayKey } from '../lib/dates'
import { useHome } from '../contexts/HomeContext'
import { PageHeader, RoundButton } from '../components/Layout'
import { RoomArt } from '../components/RoomCard'
import { BackIcon, CheckIcon } from '../components/Icons'

export function NewRoom() {
  const navigate = useNavigate()
  const { rooms, addRoom } = useHome()
  const [type, setType] = useState<RoomType | null>(null)
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function choose(t: RoomType) {
    const sameType = rooms.filter((r) => r.room_type === t.id).length
    setType(t)
    setName(sameType > 0 ? `${t.label} ${sameType + 1}` : t.label)
    setSelected(new Set(t.presets.map((_, i) => i)))
  }

  async function create() {
    if (!type) return
    setSaving(true)
    const today = todayKey()
    const presets = type.presets
      .filter((_, i) => selected.has(i))
      .map((p, i) => ({
        room_id: '',
        name: p.name,
        frequency_days: p.frequency_days,
        // Scaglionate: non tutte in scadenza lo stesso giorno
        start_date: addDays(today, Math.min(i, (p.frequency_days ?? 1) - 1)),
        assigned_to: null,
        effort: p.effort,
      }))
    const { room, error } = await addRoom(name.trim() || type.label, type.id, presets)
    setSaving(false)
    if (error) setError(error)
    if (room) navigate(`/stanze/${room.id}`, { replace: true })
  }

  if (!type) {
    return (
      <div>
        <PageHeader
          title="Scegli un tipo di stanza"
          left={
            <RoundButton label="Indietro" onClick={() => navigate(-1)}>
              <BackIcon />
            </RoundButton>
          }
        />
        <div className="grid grid-cols-2 gap-3">
          {ROOM_TYPES.map((t) => (
            <button key={t.id} onClick={() => choose(t)} className="pressable animate-rise overflow-hidden rounded-[1.6rem] bg-card text-left">
              <RoomArt type={t.id} />
              <p className="px-3.5 py-3 font-extrabold">{t.label}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Nuova stanza"
        left={
          <RoundButton label="Indietro" onClick={() => setType(null)}>
            <BackIcon />
          </RoundButton>
        }
      />
      <RoomArt type={type.id} size="lg" />
      <label className="mt-5 block">
        <span className="mb-1.5 block text-sm font-bold text-sub">Nome</span>
        <input className="field text-lg font-bold" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      {type.presets.length > 0 && (
        <div className="mt-5">
          <p className="mb-1 font-extrabold">Faccende suggerite</p>
          <p className="mb-3 text-sm text-sub">Tieni quelle che ti servono, potrai modificarle quando vuoi.</p>
          <div className="space-y-2">
            {type.presets.map((p, i) => {
              const on = selected.has(i)
              return (
                <button
                  key={p.name}
                  onClick={() => {
                    const next = new Set(selected)
                    if (on) next.delete(i)
                    else next.add(i)
                    setSelected(next)
                  }}
                  className={`pressable flex w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left ${
                    on ? 'border-accent' : 'border-transparent'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                      on ? 'border-accent bg-accent text-white' : 'border-line'
                    }`}
                  >
                    {on && <CheckIcon width={16} height={16} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 font-bold">{p.name}</span>
                  <span className="text-sm text-sub">{frequencyLabel(p.frequency_days)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-bold text-bad">{error}</p>}
      <button onClick={create} disabled={saving} className="btn-primary mt-6 w-full">
        {saving ? 'Creazione…' : `Crea ${name.trim() || type.label}`}
      </button>
    </div>
  )
}
