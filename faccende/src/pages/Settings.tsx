import { useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHome } from '../contexts/HomeContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { api } from '../lib/supabase'
import { level } from '../lib/chores'
import { userStats, weeklyLeaderboard } from '../lib/stats'
import { PageHeader } from '../components/Layout'
import { Avatar } from '../components/Avatar'
import { Sheet } from '../components/Sheet'
import { PencilIcon, ShareIcon, TrophyIcon } from '../components/Icons'

const APP_VERSION = 'v1.0'

const AVATARS = ['🙂', '😎', '🦊', '🐱', '🐶', '🐼', '🦄', '🐸', '🐧', '🦁', '🐝', '🌻', '🚀', '⭐', '🍕', '🎸']
const COLORS = ['#3b9ee6', '#22c55e', '#f97316', '#ec4899', '#a855f7', '#eab308', '#14b8a6', '#ef4444']

export function Settings() {
  const { user, signOut } = useAuth()
  const {
    profile,
    members,
    households,
    currentHousehold,
    isOwner,
    setCurrentHouseholdId,
    createInvite,
    joinHousehold,
    createHousehold,
    renameHousehold,
    leaveHousehold,
  } = useHousehold()
  const { completions, chores, distributeChores } = useHome()
  const [editingProfile, setEditingProfile] = useState(false)
  const [invite, setInvite] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [newHouse, setNewHouse] = useState('')
  const [houseName, setHouseName] = useState<string | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [busy, setBusy] = useState(false)

  const me = useMemo(() => userStats(completions, user?.id ?? ''), [completions, user])
  const lvl = level(me.totalPoints)
  const board = useMemo(() => weeklyLeaderboard(completions), [completions])
  const ranked = [...members].sort((a, b) => (board.points.get(b.user_id) ?? 0) - (board.points.get(a.user_id) ?? 0))
  const assignedCount = (id: string) => chores.filter((c) => c.assigned_to === id).length
  const cloud = api.mode === 'cloud'

  function flash(text: string, error = false) {
    setMsg({ text, error })
    window.setTimeout(() => setMsg(null), 3500)
  }

  async function handleInvite() {
    const { code, error } = await createInvite()
    if (error) flash(error, true)
    else setInvite(code)
  }

  async function shareInvite() {
    if (!invite) return
    const text = `Unisciti alla casa "${currentHousehold?.name}" su Faccende di Casa con il codice: ${invite}`
    try {
      if (navigator.share) await navigator.share({ title: 'Faccende di Casa', text })
      else {
        await navigator.clipboard.writeText(invite)
        flash('Codice copiato')
      }
    } catch {
      // condivisione annullata dall'utente
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await joinHousehold(joinCode.trim().toUpperCase())
    setBusy(false)
    if (error) flash(error, true)
    else {
      setJoinCode('')
      flash('Benvenuto nella nuova casa! 🎉')
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { error } = await createHousehold(newHouse.trim())
    setBusy(false)
    if (error) flash(error, true)
    else setNewHouse('')
  }

  async function handleDistribute(onlyUnassigned: boolean) {
    setBusy(true)
    const { error } = await distributeChores(onlyUnassigned)
    setBusy(false)
    flash(error ?? 'Faccende divise in modo equo ⚖️', Boolean(error))
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profilo" />

      {/* profilo */}
      <section className="rounded-[2rem] bg-card p-5">
        <div className="flex items-center gap-4">
          <Avatar avatar={profile?.avatar ?? '🙂'} color={profile?.color ?? '#3b9ee6'} size={68} ring />
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-black">{profile?.display_name}</p>
            {user?.email && <p className="truncate text-sm text-sub">{user.email}</p>}
          </div>
          <button onClick={() => setEditingProfile(true)} className="pressable rounded-full bg-card2 p-3" aria-label="Modifica profilo">
            <PencilIcon width={20} height={20} />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <Stat value={`Lv ${lvl.level}`} label="livello" />
          <Stat value={me.totalPoints} label="punti totali" />
          <Stat value={`🔥 ${me.streak}`} label="serie" />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs font-bold text-sub">
            <span>Verso il livello {lvl.level + 1}</span>
            <span>
              {lvl.current}/{lvl.next}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-card2">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent2" style={{ width: `${(lvl.current / lvl.next) * 100}%` }} />
          </div>
        </div>
      </section>

      {/* casa condivisa */}
      <section className="rounded-[2rem] bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          {houseName === null ? (
            <>
              <h2 className="flex-1 truncate text-xl font-black">🏠 {currentHousehold?.name}</h2>
              {isOwner && (
                <button onClick={() => setHouseName(currentHousehold?.name ?? '')} className="rounded-full p-2 text-sub" aria-label="Rinomina casa">
                  <PencilIcon width={18} height={18} />
                </button>
              )}
            </>
          ) : (
            <form
              className="flex flex-1 gap-2"
              onSubmit={async (e) => {
                e.preventDefault()
                if (houseName.trim()) await renameHousehold(houseName.trim())
                setHouseName(null)
              }}
            >
              <input className="field" autoFocus value={houseName} onChange={(e) => setHouseName(e.target.value)} />
              <button className="btn-primary shrink-0">Salva</button>
            </form>
          )}
        </div>

        <p className="mb-2 flex items-center gap-1.5 text-sm font-extrabold tracking-wider text-sub uppercase">
          <TrophyIcon width={16} height={16} className="text-warn" /> Classifica della settimana
        </p>
        <ul className="space-y-2">
          {ranked.map((m, i) => (
            <li key={m.user_id} className="flex items-center gap-3 rounded-2xl bg-card2 p-2.5 pr-4">
              <span className="w-6 text-center text-lg">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
              <Avatar avatar={m.avatar} color={m.color} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">
                  {m.display_name}
                  {m.user_id === user?.id && <span className="text-sub"> (tu)</span>}
                </span>
                <span className="block text-xs text-sub">
                  {board.counts.get(m.user_id) ?? 0} fatte · {assignedCount(m.user_id)} assegnate
                  {m.role === 'owner' ? ' · proprietario' : ''}
                </span>
              </span>
              <span className="font-black text-warn">{board.points.get(m.user_id) ?? 0} pt</span>
            </li>
          ))}
        </ul>

        {cloud ? (
          <div className="mt-5 space-y-3">
            <p className="font-extrabold">Invita qualcuno</p>
            <p className="text-sm text-sub">
              Genera un codice e mandalo a chi vive con te: potrà vedere la casa, segnare le faccende fatte e prendersene
              alcune. Il codice vale 7 giorni.
            </p>
            {invite ? (
              <div className="flex gap-2">
                <p className="flex-1 rounded-2xl bg-bg py-3 text-center font-mono text-xl font-bold tracking-[0.2em]">{invite}</p>
                <button onClick={shareInvite} className="btn-primary flex items-center gap-1.5">
                  <ShareIcon width={18} height={18} /> Invia
                </button>
              </div>
            ) : (
              <button onClick={handleInvite} className="btn-primary w-full">
                Genera codice invito
              </button>
            )}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-warn/10 p-3 text-sm font-bold text-warn">
            Stai usando l'app in modalità locale: per condividere la casa collega Supabase (vedi README).
          </p>
        )}

        {members.length > 1 && (
          <div className="mt-5 space-y-2">
            <p className="font-extrabold">Dividi le faccende</p>
            <p className="text-sm text-sub">Le assegno in modo che ognuno abbia più o meno lo stesso carico settimanale.</p>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={() => handleDistribute(true)} className="btn-soft text-sm">
                Solo non assegnate
              </button>
              <button disabled={busy} onClick={() => handleDistribute(false)} className="btn-soft text-sm">
                Ridividi tutto
              </button>
            </div>
          </div>
        )}
      </section>

      {msg && (
        <p className={`animate-rise rounded-2xl px-4 py-3 text-sm font-bold ${msg.error ? 'bg-bad/15 text-bad' : 'bg-good/15 text-good'}`}>
          {msg.text}
        </p>
      )}

      {/* altre case */}
      <section className="space-y-4 rounded-[2rem] bg-card p-5">
        {households.length > 1 && (
          <label className="block">
            <span className="mb-1.5 block font-extrabold">Casa attiva</span>
            <select className="field" value={currentHousehold?.id ?? ''} onChange={(e) => setCurrentHouseholdId(e.target.value)}>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {cloud && (
          <form onSubmit={handleJoin}>
            <span className="mb-1.5 block font-extrabold">Hai ricevuto un codice?</span>
            <div className="flex gap-2">
              <input
                className="field font-mono tracking-widest uppercase"
                placeholder="CODICE"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <button disabled={busy} className="btn-primary shrink-0">
                Unisciti
              </button>
            </div>
          </form>
        )}
        <form onSubmit={handleCreate}>
          <span className="mb-1.5 block font-extrabold">Crea un'altra casa</span>
          <div className="flex gap-2">
            <input className="field" placeholder="Es. Casa al mare" required value={newHouse} onChange={(e) => setNewHouse(e.target.value)} />
            <button disabled={busy} className="btn-soft shrink-0">
              Crea
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-2">
        {confirmLeave ? (
          <div className="rounded-[2rem] bg-card p-4">
            <p className="mb-3 text-center text-sm text-sub">
              {cloud
                ? `Uscirai da "${currentHousehold?.name}". Potrai rientrare solo con un nuovo codice invito.`
                : `Tutti i dati di "${currentHousehold?.name}" verranno cancellati da questo dispositivo.`}
            </p>
            <div className="flex gap-2">
              <button className="btn-soft flex-1" onClick={() => setConfirmLeave(false)}>
                Annulla
              </button>
              <button
                className="flex-1 rounded-2xl bg-bad py-3 font-extrabold text-black"
                onClick={async () => {
                  await leaveHousehold()
                  setConfirmLeave(false)
                }}
              >
                Conferma
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmLeave(true)} className="w-full rounded-2xl bg-card py-3 font-bold text-bad">
            {cloud ? 'Esci da questa casa' : 'Elimina questa casa'}
          </button>
        )}
        {cloud && (
          <button onClick={signOut} className="w-full rounded-2xl bg-card py-3 font-bold text-sub">
            Esci dall'account
          </button>
        )}
      </section>

      <p className="pt-2 text-center text-[11px] font-semibold text-sub/80">{APP_VERSION} · Creato da Denis Tramontano</p>

      {editingProfile && profile && <ProfileEditor onClose={() => setEditingProfile(false)} />}
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-card2 py-3">
      <p className="text-xl font-black">{value}</p>
      <p className="text-[11px] font-bold tracking-wide text-sub uppercase">{label}</p>
    </div>
  )
}

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { profile, saveProfile } = useHousehold()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [avatar, setAvatar] = useState(profile?.avatar ?? '🙂')
  const [color, setColor] = useState(profile?.color ?? '#3b9ee6')
  const [error, setError] = useState<string | null>(null)

  async function save(e: FormEvent) {
    e.preventDefault()
    const { error } = await saveProfile({ display_name: name.trim(), avatar, color })
    if (error) setError(error)
    else onClose()
  }

  return (
    <Sheet title="Il tuo profilo" onClose={onClose}>
      <form onSubmit={save} className="space-y-5">
        <div className="flex justify-center">
          <Avatar avatar={avatar} color={color} size={88} ring />
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold text-sub">Nome visibile in casa</span>
          <input className="field text-lg font-bold" required maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-bold text-sub">Avatar</span>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => setAvatar(a)}
                className={`flex aspect-square items-center justify-center rounded-xl text-2xl ${avatar === a ? 'bg-accent/25 ring-2 ring-accent' : 'bg-card2'}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-bold text-sub">Colore</span>
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Colore ${c}`}
                className="h-10 w-10 rounded-full"
                style={{ background: c, boxShadow: color === c ? `0 0 0 3px var(--color-card), 0 0 0 5px ${c}` : undefined }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm font-bold text-bad">{error}</p>}
        <button className="btn-primary w-full">Salva</button>
      </form>
    </Sheet>
  )
}
