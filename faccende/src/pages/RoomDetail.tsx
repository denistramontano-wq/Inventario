import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useHome } from '../contexts/HomeContext'
import { averageFreshness, freshnessColor } from '../lib/chores'
import { ROOM_TYPES } from '../lib/roomTypes'
import type { Chore } from '../lib/types'
import { PageHeader, RoundButton } from '../components/Layout'
import { RoomArt } from '../components/RoomCard'
import { ChoreCard, FreshnessBar } from '../components/ChoreCard'
import { ChoreForm } from '../components/ChoreForm'
import { Sheet } from '../components/Sheet'
import { BackIcon, PencilIcon, PlusIcon } from '../components/Icons'

export function RoomDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { roomById, statuses, loading, updateRoom, deleteRoom } = useHome()
  const [editing, setEditing] = useState<Chore | 'new' | null>(null)
  const [editingRoom, setEditingRoom] = useState(false)
  const room = id ? roomById(id) : undefined

  const list = useMemo(
    () =>
      [...statuses.values()]
        .filter((s) => s.chore.room_id === id)
        .sort((a, b) => Number(a.done) - Number(b.done) || (a.daysLeft ?? 0) - (b.daysLeft ?? 0)),
    [statuses, id],
  )

  if (!room) return loading ? null : <Navigate to="/" replace />
  const fresh = averageFreshness(list)

  return (
    <div>
      <PageHeader
        title={room.name}
        left={
          <RoundButton label="Indietro" onClick={() => navigate(-1)}>
            <BackIcon />
          </RoundButton>
        }
        right={
          <RoundButton label="Modifica stanza" onClick={() => setEditingRoom(true)}>
            <PencilIcon width={20} height={20} />
          </RoundButton>
        }
      />
      <div className="relative">
        <RoomArt type={room.room_type} size="lg" />
        <div className="absolute right-4 bottom-4 rounded-2xl bg-bg/80 px-3 py-1.5 text-center backdrop-blur">
          <p className="text-2xl leading-none font-black" style={{ color: freshnessColor(fresh) }}>
            {fresh === null ? '—' : `${Math.round(fresh * 100)}%`}
          </p>
          <p className="text-[10px] font-extrabold tracking-wider text-sub uppercase">freschezza</p>
        </div>
      </div>

      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">Faccende</h2>
        <button onClick={() => setEditing('new')} className="pressable flex items-center gap-1 rounded-full bg-accent px-4 py-2 text-sm font-extrabold text-white">
          <PlusIcon width={18} height={18} strokeWidth={3} /> Aggiungi
        </button>
      </div>

      {list.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sub">Nessuna faccenda in questa stanza. Aggiungine una!</p>
      ) : (
        <div className="space-y-2.5">
          {list.map((s) => (
            <div key={s.chore.id}>
              <ChoreCard status={s} showRoom={false} onEdit={() => setEditing(s.chore)} />
              {!s.done && (
                <div className="mx-4 -mt-1">
                  <FreshnessBar value={s.freshness} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ChoreForm chore={editing === 'new' ? undefined : editing} defaultRoomId={room.id} onClose={() => setEditing(null)} />
      )}
      {editingRoom && (
        <RoomEditor
          name={room.name}
          type={room.room_type}
          onClose={() => setEditingRoom(false)}
          onSave={async (name, type) => {
            await updateRoom(room.id, { name, room_type: type })
            setEditingRoom(false)
          }}
          onDelete={async () => {
            await deleteRoom(room.id)
            navigate('/', { replace: true })
          }}
        />
      )}
    </div>
  )
}

function RoomEditor({
  name: initialName,
  type: initialType,
  onClose,
  onSave,
  onDelete,
}: {
  name: string
  type: string
  onClose: () => void
  onSave: (name: string, type: string) => Promise<void>
  onDelete: () => Promise<void>
}) {
  const [name, setName] = useState(initialName)
  const [type, setType] = useState(initialType)
  const [confirm, setConfirm] = useState(false)
  return (
    <Sheet title="Modifica stanza" onClose={onClose}>
      <div className="space-y-4">
        <input className="field text-lg font-bold" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-4 gap-2">
          {ROOM_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className={`flex flex-col items-center rounded-2xl border-2 py-2 text-[11px] font-bold ${
                type === t.id ? 'border-accent bg-accent/15' : 'border-transparent bg-card2 text-sub'
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className="w-full truncate px-1">{t.label}</span>
            </button>
          ))}
        </div>
        <button className="btn-primary w-full" disabled={!name.trim()} onClick={() => onSave(name.trim(), type)}>
          Salva
        </button>
        {confirm ? (
          <div className="space-y-2">
            <p className="text-center text-sm text-sub">Verranno eliminate anche tutte le sue faccende e il loro storico.</p>
            <div className="flex gap-2">
              <button className="btn-soft flex-1" onClick={() => setConfirm(false)}>
                Annulla
              </button>
              <button className="flex-1 rounded-2xl bg-bad py-3 font-extrabold text-black" onClick={onDelete}>
                Elimina
              </button>
            </div>
          </div>
        ) : (
          <button className="w-full py-2 text-sm font-bold text-bad" onClick={() => setConfirm(true)}>
            Elimina stanza
          </button>
        )}
      </div>
    </Sheet>
  )
}
