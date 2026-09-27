import { Link } from 'react-router-dom'
import type { Room } from '../lib/types'
import { roomType } from '../lib/roomTypes'
import { freshnessColor } from '../lib/chores'

export function RoomArt({ type, size = 'md' }: { type: string; size?: 'md' | 'lg' }) {
  const t = roomType(type)
  const big = size === 'lg'
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${big ? 'h-40 rounded-[2rem]' : 'h-28 rounded-t-[1.6rem]'}`}
      style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
    >
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15" />
      <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-black/10" />
      <span className={`absolute ${big ? 'top-5 left-6 text-3xl' : 'top-3 left-3 text-xl'} opacity-80`}>{t.props[0]}</span>
      <span className={`absolute ${big ? 'right-6 bottom-5 text-3xl' : 'right-3 bottom-2 text-xl'} opacity-80`}>{t.props[1]}</span>
      <span className={`${big ? 'text-7xl' : 'text-5xl'} drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)]`}>{t.emoji}</span>
    </div>
  )
}

export function RoomCard({ room, freshness, due }: { room: Room; freshness: number | null; due: number }) {
  const pct = freshness === null ? null : Math.round(freshness * 100)
  return (
    <Link to={`/stanze/${room.id}`} className="pressable animate-rise relative block rounded-[1.6rem] bg-card">
      <RoomArt type={room.room_type} />
      {due > 0 && (
        <span className="absolute top-2 right-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-bg/80 px-2 text-sm font-black text-ink backdrop-blur">
          {due}
        </span>
      )}
      <div className="px-3.5 pt-2.5 pb-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-extrabold">{room.name}</p>
          <p className="shrink-0 text-sm font-black" style={{ color: freshnessColor(freshness) }}>
            {pct === null ? '—' : `${pct}%`}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-card2">
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct ?? 0}%`, background: freshnessColor(freshness) }}
          />
        </div>
      </div>
    </Link>
  )
}
