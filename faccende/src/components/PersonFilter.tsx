import { useHousehold } from '../contexts/HouseholdContext'
import { Avatar } from './Avatar'

/** 'all' = tutti; altrimenti user_id */
export function PersonFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { members } = useHousehold()
  if (members.length < 2) return null
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
      <button
        onClick={() => onChange('all')}
        className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold ${value === 'all' ? 'bg-ink text-bg' : 'bg-card text-sub'}`}
      >
        Tutti
      </button>
      {members.map((m) => (
        <button
          key={m.user_id}
          onClick={() => onChange(m.user_id)}
          className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-extrabold ${
            value === m.user_id ? 'bg-ink text-bg' : 'bg-card text-sub'
          }`}
        >
          <Avatar avatar={m.avatar} color={m.color} size={24} />
          {m.display_name}
        </button>
      ))}
    </div>
  )
}
